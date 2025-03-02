from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
import base64
from ultralytics import YOLO
from rich.console import Console

console = Console()
router = APIRouter()

# Load YOLOv8 Model (you can also import your shared model if you prefer)
model = YOLO("yolov8n.pt")

@router.post("/detect_frame/")
async def detect_frame(image: UploadFile = File(...)):
    # Read the uploaded frame
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    
    # Run YOLO detection
    results = model(frame)
    people_in_frame = sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)
    
    # Get frame dimensions
    height, width, _ = frame.shape
    
    # Grid dimensions for 12 regions: 3 rows x 4 columns
    num_rows = 3
    num_cols = 4
    quadrant_counts = {f"q{i}": 0 for i in range(1, num_rows * num_cols + 1)}
    
    # Compute quadrant counts
    for box in results[0].boxes:
        if int(box.cls[0]) == 0:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            col_index = int(center_x / (width / num_cols))
            row_index = int(center_y / (height / num_rows))
            # Clamp indices
            col_index = min(col_index, num_cols - 1)
            row_index = min(row_index, num_rows - 1)
            quadrant_index = row_index * num_cols + col_index + 1
            quadrant_counts[f"q{quadrant_index}"] += 1

    # Danger detection: flag quadrants that exceed a high-density threshold
    high_density_threshold = 5  # Adjust as needed
    danger_zones = [key for key, count in quadrant_counts.items() if count > high_density_threshold]

    # Generate a heatmap overlay for visualization
    heatmap = np.zeros((height, width), dtype=np.float32)
    for box in results[0].boxes:
        if int(box.cls[0]) == 0:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            heatmap[y1:y2, x1:x2] += 1
    heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = np.uint8(heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)
    
    # Encode the overlay image as base64
    _, buffer = cv2.imencode(".jpg", overlay)
    frame_base64 = base64.b64encode(buffer).decode("utf-8")
    
    return {
        "frame": frame_base64,
        "people_in_frame": people_in_frame,
        "quadrant_counts": quadrant_counts,
        "danger_zones": danger_zones
    }
