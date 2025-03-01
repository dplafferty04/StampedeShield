from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
from rich.console import Console
from rich.progress import Progress
import os
import time

app = FastAPI()
console = Console()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 Model
console.print("[bold cyan]Loading YOLOv8 Model...[/bold cyan]")
model = YOLO("yolov8n.pt")
console.print("[bold green]Model Loaded Successfully![/bold green] ✅\n")

# ...existing code...

@app.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    console.print(f"\n[bold cyan]Receiving video:[/bold cyan] {video.filename}")
    
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
    start_time = time.time()  # Track processing time
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_skip = 5  # Process every 5th frame

    if total_frames == 0:
        os.remove(video_path)
        raise HTTPException(status_code=400, detail="Empty video file. No frames to process.")

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    # Define the codec and create VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    with Progress() as progress:
        task = progress.add_task("[cyan]Processing video frames...", total=total_frames)
        
        while cap.isOpened():
            ret, frame = cap.read()
            
            # **Exit loop when video ends**
            if not ret:
                break  

            # Skip frames for efficiency
            if frame_count % frame_skip != 0:
                frame_count += 1
                continue
            
            frame_count += 1
            progress.update(task, advance=frame_skip)

            # Run YOLOv8 detection on the frame
            results = model(frame)
            people_in_frame = sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)
            people_count_per_frame.append(people_in_frame)

            # Generate heatmap
            heatmap = np.zeros((height, width), dtype=np.float32)
            for box in results[0].boxes:
                if int(box.cls[0]) == 0:  # Person class
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    heatmap[y1:y2, x1:x2] += 1

            heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
            heatmap = np.uint8(heatmap)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

            # Overlay heatmap on the original frame
            overlay = cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)

            # Write the frame with heatmap to the output video
            out.write(overlay)

            # **Optional timeout** (e.g., stop if video takes longer than 60 seconds)
            if time.time() - start_time > 60:
                console.print("[bold red]Timeout reached! Stopping processing.[/bold red] ⚠️")
                break

    cap.release()
    out.release()
    os.remove(video_path)  # Cleanup temp file
    
    total_people = sum(people_count_per_frame)
    avg_people_per_frame = total_people / len(people_count_per_frame) if people_count_per_frame else 0
    process_time = time.time() - start_time  # Calculate processing time
    
    console.print(f"\n[bold blue]Total people detected:[/bold blue] {total_people}")
    console.print(f"[bold magenta]Average per frame:[/bold magenta] {avg_people_per_frame:.2f}")
    console.print(f"[bold yellow]Processing time:[/bold yellow] {process_time:.2f} seconds\n")

    return {
        "total_people_detected": total_people,
        "average_people_per_frame": round(avg_people_per_frame, 2),
        "frame_wise_count": people_count_per_frame,
        "processing_time_seconds": round(process_time, 2),
        "total_frames_processed": frame_count,
        "processed_video_path": output_video_path
    }