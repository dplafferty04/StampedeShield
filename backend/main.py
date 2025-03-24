from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from utils.video_processing import process_video
from utils.live_detection import router as live_detection_router
from ultralytics import YOLO
from websocket_manager import websocket_manager

app = FastAPI()

# Enable CORS middleware to allow all origins, credentials, methods, and headers.
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
    """
    WebSocket endpoint to maintain an active connection.
    
    Sends periodic "keep-alive" messages to the client every 2 seconds.
    """
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Send a keep-alive message to the client.
            await websocket.send_json({"message": "WebSocket connection active"})
            await asyncio.sleep(2)  # Prevent flooding the connection.
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@app.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    """
    Endpoint to process an uploaded video and detect crowd statistics.
    
    Returns a JSON response with:
      - Total people detected
      - Average people per frame
      - Processing time in seconds
      - Frame-wise people count
      - URL to the heatmap video output
    """
    results = await process_video(video)
    return {
        "total_people_detected": results["total_people_detected"],
        "average_people_per_frame": results["average_people_per_frame"],
        "processing_time_seconds": results["processing_time_seconds"],
        "frame_wise_count": results["frame_wise_count"],
        "heatmap_video_url": f"http://127.0.0.1:8000/videos/output_{video.filename}" 
    }

# Include the live detection router for additional live features.
app.include_router(live_detection_router)
