from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.video_processing import process_video
from rich.console import Console

router = APIRouter()
console = Console()

@router.post("/detect/")
async def detect_crowd(video: UploadFile = File(...)):
    console.print(f"\n[bold cyan]Receiving video:[/bold cyan] {video.filename}")
    
    results = await process_video(video)
    
    return results
