from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import time
from ultralytics import YOLO
from websocket_manager import websocket_manager

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 Model
model = YOLO("yolov8n.pt")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection open
    except:
        websocket_manager.disconnect(websocket)

@app.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    video_path = f"temp_{video.filename}"
    with open(video_path, "wb") as f:
        f.write(await video.read())

    cap = cv2.VideoCapture(video_path)
    total_people = 0
    frame_count = 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Run YOLOv8 detection
        results = model(frame)
        people_in_frame = sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)
        total_people += people_in_frame
        frame_count += 1

        # Send real-time data via WebSocket
        await websocket_manager.send_data({
            "frame": frame_count,
            "people_in_frame": people_in_frame,
            "total_people_detected": total_people,
            "progress": (frame_count / total_frames) * 100
        })

    cap.release()
    os.remove(video_path)

    return {"message": "Processing complete"}
