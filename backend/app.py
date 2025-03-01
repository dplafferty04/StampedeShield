from fastapi import FastAPI, UploadFile, File
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI()

# Load YOLOv8 Model
model = YOLO("yolov8n.pt")

@app.get("/")
def home():
    return {"message": "Crowd Management AI is running!"}

@app.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    video_path = f"temp_{video.filename}"
    with open(video_path, "wb") as f:
        f.write(await video.read())

    cap = cv2.VideoCapture(video_path)
    total_people = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Run YOLOv8 detection
        results = model(frame)
        total_people += sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)

    cap.release()
    return {"people_count": total_people}
