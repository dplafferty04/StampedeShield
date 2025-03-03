from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from utils.video_processing import process_video
from utils.alert import check_overcrowding
from rich.console import Console

router = APIRouter()
console = Console()

@router.post("/detect/")
async def detect_crowd(video: UploadFile = File(...), max_capacity: int = Query(50, description="Maximum people allowed in the area")):
    console.print(f"\n[bold cyan]Receiving video:[/bold cyan] {video.filename}")
    
    results = await process_video(video)
    
    # Get total people detected
    total_people = results["total_people_detected"]

    # Check if overcrowding occurs
    alert_data = check_overcrowding(total_people, max_capacity)

    # Include alert info in response
    results["alert"] = alert_data["alert"]
    results["alert_message"] = alert_data["message"]

    return results
