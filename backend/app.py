from fastapi import FastAPI, UploadFile, File
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

@app.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    console.print(f"\n[bold cyan]Receiving video:[/bold cyan] {video.filename}")
    
    video_path = f"temp_{video.filename}"
    with open(video_path, "wb") as f:
        f.write(await video.read())

    console.print("[bold green]Video saved successfully![/bold green] ✅")
    
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    people_count_per_frame = []
    
    start_time = time.time()  # Track processing time

    with Progress() as progress:
        task = progress.add_task("[cyan]Processing video frames...", total=100)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % 10 == 0:
                progress.update(task, advance=10)

            # Run YOLOv8 detection
            results = model(frame)
            people_in_frame = sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)
            people_count_per_frame.append(people_in_frame)

    cap.release()
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
        "processing_time_seconds": round(process_time, 2)
    }
