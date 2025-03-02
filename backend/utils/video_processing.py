import os
import time
import cv2
import numpy as np
import base64
from fastapi import HTTPException
from models import model
from rich.console import Console
from rich.progress import Progress
from websocket_manager import websocket_manager

console = Console()

async def process_video(video):
    video_path = f"temp_{video.filename}"
    output_video_path = f"output_{video.filename}"
    
    with open(video_path, "wb") as f:
        f.write(await video.read())

    console.print("[bold green]Video saved successfully![/bold green] ✅")

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        os.remove(video_path)
        raise HTTPException(status_code=400, detail="Invalid video file. Unable to open.")

    frame_count = 0
    people_count_per_frame = []
    # Initialize aggregated counts for 12 quadrants (using keys "q1" ... "q12")
    aggregated_quadrants = {f"q{i}": 0 for i in range(1, 13)}
    start_time = time.time()
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_skip = 5

    if total_frames == 0:
        os.remove(video_path)
        raise HTTPException(status_code=400, detail="Empty video file. No frames to process.")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # Define grid dimensions for 12 equal regions
    num_cols = 3
    num_rows = 4

    with Progress() as progress:
        task = progress.add_task("[cyan]Processing video frames...", total=total_frames)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break  

            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            frame_count += 1
            progress.update(task, advance=frame_skip)

            results = model(frame)
            
            # Compute the number of people and quadrant counts for this frame
            quadrant_counts = {f"q{i}": 0 for i in range(1, num_cols * num_rows + 1)}
            people_in_frame = 0

            for box in results[0].boxes:
                if int(box.cls[0]) == 0:  # assuming class 0 represents "person"
                    people_in_frame += 1
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    center_x = (x1 + x2) / 2
                    center_y = (y1 + y2) / 2

                    # Determine the column and row index
                    col_index = int(center_x / (width / num_cols))
                    row_index = int(center_y / (height / num_rows))
                    # Ensure indices are within bounds
                    if col_index >= num_cols:
                        col_index = num_cols - 1
                    if row_index >= num_rows:
                        row_index = num_rows - 1

                    # Calculate quadrant number (1-indexed)
                    quadrant_index = row_index * num_cols + col_index + 1
                    quadrant_counts[f"q{quadrant_index}"] += 1

            people_count_per_frame.append(people_in_frame)
            
            # Aggregate quadrant counts over frames
            for key in aggregated_quadrants:
                aggregated_quadrants[key] += quadrant_counts[key]

            # Send current frame info via WebSocket (include 12-quadrant data)
            _, buffer = cv2.imencode(".jpg", frame)
            frame_base64 = base64.b64encode(buffer).decode("utf-8")
            
            await websocket_manager.send_data({
                "frame": frame_base64,
                "people_in_frame": people_in_frame,
                "progress": (frame_count / total_frames) * 100,
                "quadrant_counts": quadrant_counts
            })

            # Generate heatmap overlay (unchanged)
            heatmap = np.zeros((height, width), dtype=np.float32)
            for box in results[0].boxes:
                if int(box.cls[0]) == 0:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    heatmap[y1:y2, x1:x2] += 1

            heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
            heatmap = np.uint8(heatmap)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

            overlay = cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)
            out.write(overlay)

            if time.time() - start_time > 60:
                console.print("[bold red]Timeout reached! Stopping processing.[/bold red] ⚠️")
                break

    cap.release()
    out.release()
    os.remove(video_path)

    total_people = sum(people_count_per_frame)
    avg_people_per_frame = total_people / len(people_count_per_frame) if people_count_per_frame else 0
    
    # Compute average counts for each of the 12 quadrants
    avg_quadrants = { key: aggregated_quadrants[key] / len(people_count_per_frame) for key in aggregated_quadrants }
    
    # Define a threshold for overcrowding in a quadrant (adjust as needed)
    quadrant_threshold = 10
    quadrant_alerts = { key: (avg_quadrants[key] > quadrant_threshold) for key in avg_quadrants }

    process_time = time.time() - start_time
    
    console.print(f"\n[bold blue]Total people detected:[/bold blue] {total_people}")
    console.print(f"[bold magenta]Average per frame:[/bold magenta] {avg_people_per_frame:.2f}")
    console.print(f"[bold yellow]Processing time:[/bold yellow] {process_time:.2f} seconds\n")

    # Return additional quadrant data for frontend display if desired
    return {
        "total_people_detected": total_people,
        "average_people_per_frame": round(avg_people_per_frame, 2),
        "frame_wise_count": people_count_per_frame,
        "processing_time_seconds": round(process_time, 2),
        "avg_quadrant_counts": avg_quadrants,
        "quadrant_alerts": quadrant_alerts
    }
