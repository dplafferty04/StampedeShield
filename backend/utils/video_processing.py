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
from utils.alert import check_overcrowding

console = Console()

async def process_video(video):
    """
    Processes an uploaded video to perform object detection, compute region (quadrant) statistics,
    generate a heatmap overlay, and stream frame data over a WebSocket.

    Steps:
      1. Save the uploaded video to a temporary file.
      2. Open the video file and validate it.
      3. Process frames at intervals (skipping frames for efficiency).
         - Detect persons in the frame.
         - Compute counts per quadrant based on a 3x4 grid.
         - Aggregate statistics and check overcrowding conditions.
         - Create a heatmap overlay and encode frame data.
         - Send data via WebSocket.
      4. Save the processed (overlay) video.
      5. Compute summary statistics and clean up.

    :param video: An uploaded video file object from FastAPI.
    :return: A dictionary with statistics and metadata about the processed video.
    :raises HTTPException: If the video file is invalid or empty.
    """
    # Save the uploaded video file
    video_path = f"temp_{video.filename}"
    output_video_path = f"output_{video.filename}"
    with open(video_path, "wb") as f:
        f.write(await video.read())
    console.print("[bold green]Video saved successfully![/bold green] ✅")

    # Open the video file
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        os.remove(video_path)
        raise HTTPException(status_code=400, detail="Invalid video file. Unable to open.")

    # Initialize counters and aggregation dictionaries
    frame_count = 0
    people_count_per_frame = []
    num_regions = 12
    aggregated_quadrants = {f"q{i}": 0 for i in range(1, num_regions + 1)}
    danger_flags = {f"q{i}": 0 for i in range(1, num_regions + 1)}
    prev_quadrant_counts = {f"q{i}": 0 for i in range(1, num_regions + 1)}

    start_time = time.time()
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_skip = 5
    if total_frames == 0:
        os.remove(video_path)
        raise HTTPException(status_code=400, detail="Empty video file. No frames to process.")

    # Video properties for output creation
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # Grid configuration: 3 rows x 4 columns = 12 regions
    num_rows = 3
    num_cols = 4

    # Thresholds for alerts and detection
    high_density_threshold = 5      # More than 5 persons in a quadrant triggers density alert
    sudden_change_threshold = 3     # Change from previous frame exceeds this triggers alert
    global_max_capacity = 50        # Global capacity threshold

    def compute_quadrant_counts(boxes):
        """
        Computes the count of persons in each quadrant based on detected boxes.
        Returns both the quadrant count dictionary and the total people count.
        """
        quadrant_counts = {f"q{i}": 0 for i in range(1, num_rows * num_cols + 1)}
        count_people = 0
        for box in boxes:
            if int(box.cls[0]) == 0:  # Assuming class 0 represents "person"
                count_people += 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                col_index = int(center_x / (width / num_cols))
                row_index = int(center_y / (height / num_rows))
                col_index = min(col_index, num_cols - 1)
                row_index = min(row_index, num_rows - 1)
                quadrant_index = row_index * num_cols + col_index + 1
                quadrant_counts[f"q{quadrant_index}"] += 1
        return quadrant_counts, count_people

    def generate_heatmap_overlay(frame, boxes):
        """
        Generates a heatmap overlay from the detected boxes and returns the combined image.
        """
        heatmap = np.zeros((height, width), dtype=np.float32)
        for box in boxes:
            if int(box.cls[0]) == 0:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                heatmap[y1:y2, x1:x2] += 1
        heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
        heatmap = np.uint8(heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        return cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)

    # Process frames with a progress bar
    with Progress() as progress:
        task = progress.add_task("[cyan]Processing video frames...", total=total_frames)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Skip frames for efficiency
            if frame_count % frame_skip != 0:
                frame_count += 1
                continue
            frame_count += 1
            progress.update(task, advance=frame_skip)

            # Perform object detection on the current frame
            results = model(frame)
            boxes = results[0].boxes

            # Compute quadrant counts and people count for this frame
            quadrant_counts, people_in_frame = compute_quadrant_counts(boxes)
            people_count_per_frame.append(people_in_frame)

            # Update aggregated counts
            for key in aggregated_quadrants:
                aggregated_quadrants[key] += quadrant_counts[key]

            # Compute changes in quadrant counts from the previous frame
            quadrant_deltas = {
                key: quadrant_counts[key] - prev_quadrant_counts.get(key, 0)
                for key in quadrant_counts
            }

            # Check overcrowding and get alert info
            alert_info = check_overcrowding(
                people_in_frame,
                global_max_capacity,
                quadrant_counts=quadrant_counts,
                quadrant_threshold=high_density_threshold,
                quadrant_deltas=quadrant_deltas,
                scatter_threshold=sudden_change_threshold
            )
            # Identify and update danger zones
            danger_zones = [
                key for key, info in alert_info["quadrant_alerts"].items() if info["alert"]
            ]
            for key in danger_zones:
                danger_flags[key] += 1

            # Update previous quadrant counts for the next iteration
            prev_quadrant_counts = quadrant_counts.copy()

            # Encode the original frame as a base64 JPEG image
            _, buffer = cv2.imencode(".jpg", frame)
            frame_base64 = base64.b64encode(buffer).decode("utf-8")

            # Generate heatmap overlay, write it to the output video, and encode it
            overlay = generate_heatmap_overlay(frame, boxes)
            out.write(overlay)
            _, overlay_buffer = cv2.imencode(".jpg", overlay)
            heatmap_base64 = base64.b64encode(overlay_buffer).decode("utf-8")

            # Send frame and analysis data via WebSocket
            await websocket_manager.send_data({
                "frame": frame_base64,
                "heatmap": heatmap_base64,
                "people_in_frame": people_in_frame,
                "progress": (frame_count / total_frames) * 100,
                "quadrant_counts": quadrant_counts,
                "danger_zones": danger_zones
            })

            # Timeout after 60 seconds
            if time.time() - start_time > 60:
                console.print("[bold red]Timeout reached! Stopping processing.[/bold red] ⚠️")
                break

    # Clean up resources
    cap.release()
    out.release()
    os.remove(video_path)

    # Compute summary statistics
    total_people = sum(people_count_per_frame)
    num_frames = len(people_count_per_frame)
    avg_people_per_frame = total_people / num_frames if num_frames > 0 else 0
    avg_quadrants = {
        key: aggregated_quadrants[key] / num_frames for key in aggregated_quadrants
    }
    # Flag quadrant if danger occurred in >30% of frames
    danger_alerts = {
        key: (danger_flags[key] / num_frames) > 0.3 for key in danger_flags
    }
    process_time = time.time() - start_time

    # Output final statistics
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
