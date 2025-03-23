from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
import base64
from ultralytics import YOLO
from rich.console import Console

console = Console()
router = APIRouter()

# Load YOLOv8 model once on module load
model = YOLO("yolov8n.pt")


def compute_quadrant_counts(results, width, height, num_rows=3, num_cols=4):
    """
    Computes the number of detected people per quadrant based on YOLO detection results.
    
    :param results: YOLO detection results.
    :param width: Frame width.
    :param height: Frame height.
    :param num_rows: Number of grid rows.
    :param num_cols: Number of grid columns.
    :return: A dictionary mapping quadrant identifiers (e.g., "q1", "q2", ...) to counts.
    """
    quadrant_counts = {f"q{i}": 0 for i in range(1, num_rows * num_cols + 1)}
    for box in results[0].boxes:
        if int(box.cls[0]) == 0:  # Only count detections for persons (class 0)
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            # Determine the column and row indices
            col_index = min(int(center_x / (width / num_cols)), num_cols - 1)
            row_index = min(int(center_y / (height / num_rows)), num_rows - 1)
            quadrant_index = row_index * num_cols + col_index + 1
            quadrant_counts[f"q{quadrant_index}"] += 1
    return quadrant_counts


def generate_heatmap_overlay(frame, results, height, width):
    """
    Generates a heatmap overlay from detected person bounding boxes.
    
    :param frame: Original frame image.
    :param results: YOLO detection results.
    :param height: Frame height.
    :param width: Frame width.
    :return: Image with the heatmap overlay blended.
    """
    heatmap = np.zeros((height, width), dtype=np.float32)
    for box in results[0].boxes:
        if int(box.cls[0]) == 0:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            heatmap[y1:y2, x1:x2] += 1
    heatmap = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = np.uint8(heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    return cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)


@router.post("/detect_frame/")
async def detect_frame(image: UploadFile = File(...)):
    """
    Detects persons in an uploaded image frame using YOLOv8, computes quadrant counts,
    and returns a base64-encoded overlay image along with detection statistics.
    
    :param image: Uploaded image file.
    :return: A JSON object containing the overlay image, people count, quadrant counts,
             and a list of danger zones (quadrants exceeding a high-density threshold).
    :raises HTTPException: If the image file is invalid.
    """
    # Read and decode the uploaded image file
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # Run YOLO detection on the frame
    results = model(frame)
    # Count the number of persons detected (class 0 corresponds to persons)
    people_in_frame = sum(1 for box in results[0].boxes if int(box.cls[0]) == 0)
    
    # Retrieve frame dimensions
    height, width, _ = frame.shape

    # Compute quadrant counts using a 3x4 grid (12 regions)
    quadrant_counts = compute_quadrant_counts(results, width, height)

    # Define high-density threshold and identify danger zones
    high_density_threshold = 5  # Adjust threshold as needed
    danger_zones = [key for key, count in quadrant_counts.items() if count > high_density_threshold]

    # Generate a heatmap overlay on the frame
    overlay = generate_heatmap_overlay(frame, results, height, width)
    
    # Encode the overlay image to a base64 string
    _, buffer = cv2.imencode(".jpg", overlay)
    frame_base64 = base64.b64encode(buffer).decode("utf-8")

    return {
        "frame": frame_base64,
        "people_in_frame": people_in_frame,
        "quadrant_counts": quadrant_counts,
        "danger_zones": danger_zones
    }
