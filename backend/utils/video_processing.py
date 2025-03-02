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
from utils.alert import check_overcrowding  # Import the updated alert function

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
    # For 12 regions: keys q1 to q12
    aggregated_quadrants = {f"q{i}": 0 for i in range(1, 13)}
    # For danger flags aggregation over frames
    danger_flags = {f"q{i}": 0 for i in range(1, 13)}
    # Keep track of previous frame’s quadrant counts
    prev_quadrant_counts = {f"q{i}": 0 for i in range(1, 13)}
    
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
    
    # Grid dimensions for 12 equal regions: 3 rows x 4 columns
    num_rows = 3
    num_cols = 4

    # Define thresholds (adjust these based on your scenario)
    high_density_threshold = 5      # if more than 5 people in a region in a frame, flag it
    sudden_change_threshold = 3       # if change from previous frame exceeds 3, flag it
    global_max_capacity = 50          # Example global capacity

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
            # Compute quadrant counts for current frame
            quadrant_counts = {f"q{i}": 0 for i in range(1, num_rows * num_cols + 1)}
            people_in_frame = 0

            for box in results[0].boxes:
                if int(box.cls[0]) == 0:  # assuming class 0 is "person"
                    people_in_frame += 1
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    center_x = (x1 + x2) / 2
                    center_y = (y1 + y2) / 2

                    # Determine the column and row indices (0-indexed)
                    col_index = int(center_x / (width / num_cols))
                    row_index = int(center_y / (height / num_rows))
                    col_index = min(col_index, num_cols - 1)
                    row_index = min(row_index, num_rows - 1)

                    quadrant_index = row_index * num_cols + col_index + 1
                    quadrant_counts[f"q{quadrant_index}"] += 1

            people_count_per_frame.append(people_in_frame)
            
            # Aggregate quadrant counts over frames
            for key in aggregated_quadrants:
                aggregated_quadrants[key] += quadrant_counts[key]
            
            # Compute quadrant deltas for current frame (change from previous frame)
            quadrant_deltas = { key: quadrant_counts[key] - prev_quadrant_counts.get(key, 0) for key in quadrant_counts }
            
            # Call the updated alert function to get global and quadrant alerts
            alert_info = check_overcrowding(
                people_in_frame,
                global_max_capacity,
                quadrant_counts=quadrant_counts,
                quadrant_threshold=high_density_threshold,
                quadrant_deltas=quadrant_deltas,
                scatter_threshold=sudden_change_threshold
            )
            # Extract danger zones from alert info
            danger_zones = [key for key, info in alert_info["quadrant_alerts"].items() if info["alert"]]
            # Update aggregated danger flags
            for key in danger_zones:
                danger_flags[key] += 1
            
            # Update previous quadrant counts for next iteration
            prev_quadrant_counts = quadrant_counts.copy()
            
            # Send frame info via WebSocket (include quadrant and alert data)
            _, buffer = cv2.imencode(".jpg", frame)
            frame_base64 = base64.b64encode(buffer).decode("utf-8")
            await websocket_manager.send_data({
                "frame": frame_base64,
                "people_in_frame": people_in_frame,
                "progress": (frame_count / total_frames) * 100,
                "quadrant_counts": quadrant_counts,
                "danger_zones": danger_zones
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
    os.remove(video_path)

    total_people = sum(people_count_per_frame)
    avg_people_per_frame = total_people / len(people_count_per_frame) if people_count_per_frame else 0
    avg_quadrants = { key: aggregated_quadrants[key] / len(people_count_per_frame) for key in aggregated_quadrants }
    # For final danger alerts, flag a quadrant if danger occurred in >30% of frames
    danger_alerts = { key: (danger_flags[key] / len(people_count_per_frame)) > 0.3 for key in danger_flags }

    process_time = time.time() - start_time
    console.print(f"\n[bold blue]Total people detected:[/bold blue] {total_people}")
    console.print(f"[bold magenta]Average per frame:[/bold magenta] {avg_people_per_frame:.2f}")
    console.print(f"[bold yellow]Processing time:[/bold yellow] {process_time:.2f} seconds\n")

    return {
        "total_people_detected": total_people,
        "average_people_per_frame": round(avg_people_per_frame, 2),
        "frame_wise_count": people_count_per_frame,
        "processing_time_seconds": round(process_time, 2),
        "avg_quadrant_counts": avg_quadrants,
        "quadrant_alerts": danger_alerts
    }
