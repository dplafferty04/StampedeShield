from rich.console import Console

console = Console()

def check_overcrowding(
    people_count, 
    max_capacity, 
    quadrant_counts=None, 
    quadrant_threshold=None,
    quadrant_deltas=None,
    scatter_threshold=None
):
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
            alert = False
            messages = []
            if count > quadrant_threshold:
                alert = True
                msg = f"Alert: {count} people in {quadrant}, exceeding threshold of {quadrant_threshold}."
                console.print(f"[bold red]⚠️ ALERT! {msg}[/bold red]")
                messages.append(msg)
            # Check for rapid change if delta info is provided
            if quadrant_deltas is not None and scatter_threshold is not None:
                delta = quadrant_deltas.get(quadrant, 0)
                if abs(delta) > scatter_threshold:
                    alert = True
                    msg = f"Warning: Rapid change in {quadrant} with a difference of {delta} people."
                    console.print(f"[bold yellow]⚠️ WARNING! {msg}[/bold yellow]")
                    messages.append(msg)
            quadrant_alerts[quadrant] = {
                "alert": alert,
                "message": " ".join(messages) if messages else f"Safe: {count} people in {quadrant} (threshold: {quadrant_threshold})."
            }
    return {
        "global_alert": global_alert,
        "global_message": global_message,
        "quadrant_alerts": quadrant_alerts
    }
