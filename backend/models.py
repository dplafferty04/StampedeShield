from ultralytics import YOLO
from rich.console import Console

console = Console()

console.print("[bold cyan]Loading YOLOv8 Model...[/bold cyan]")
model = YOLO("yolov8n.pt")
console.print("[bold green]Model Loaded Successfully![/bold green] ✅\n")
