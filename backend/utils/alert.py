from rich.console import Console

console = Console()

def check_overcrowding(people_count, max_capacity, quadrant_counts=None, quadrant_threshold=None):
    # Global overcrowding check
    if people_count > max_capacity:
        console.print(f"[bold red]⚠️ ALERT! Overcrowding detected! {people_count} people detected, exceeding limit of {max_capacity}.[/bold red]")
        global_alert = True
        global_message = f"Overcrowding detected! {people_count} people detected, exceeding limit of {max_capacity}."
    else:
        global_alert = False
        global_message = f"Safe: {people_count} people detected (limit: {max_capacity})."
    
    # Quadrant-specific alerting
    quadrant_alerts = {}
    if quadrant_counts is not None and quadrant_threshold is not None:
        for quadrant, count in quadrant_counts.items():
            if count > quadrant_threshold:
                console.print(f"[bold red]⚠️ ALERT! {quadrant} has high density: {count} people (threshold: {quadrant_threshold}).[/bold red]")
                quadrant_alerts[quadrant] = {
                    "alert": True,
                    "message": f"Alert: {count} people detected in {quadrant}, exceeding threshold of {quadrant_threshold}."
                }
            else:
                quadrant_alerts[quadrant] = {
                    "alert": False,
                    "message": f"Safe: {count} people detected in {quadrant} (threshold: {quadrant_threshold})."
                }
    return {
        "global_alert": global_alert,
        "global_message": global_message,
        "quadrant_alerts": quadrant_alerts
    }
