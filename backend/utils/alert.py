from rich.console import Console
from typing import Optional, Dict, Any

console = Console()

def check_overcrowding(
    people_count: int,
    max_capacity: int,
    quadrant_counts: Optional[Dict[str, int]] = None,
    quadrant_threshold: Optional[int] = None,
    quadrant_deltas: Optional[Dict[str, int]] = None,
    scatter_threshold: Optional[int] = None
) -> Dict[str, Any]:
    """
    Check for overall and quadrant-specific overcrowding.

    This function checks whether the total number of people exceeds a global capacity
    and evaluates each quadrant for overcrowding and rapid changes in counts. It prints
    alerts using Rich's console and returns a dictionary containing global and quadrant
    alert details.

    :param people_count: Total number of people detected.
    :param max_capacity: Maximum allowed capacity.
    :param quadrant_counts: Dictionary with counts of people per quadrant.
    :param quadrant_threshold: Threshold for people count in a quadrant.
    :param quadrant_deltas: Dictionary with changes in people count per quadrant (from previous frame).
    :param scatter_threshold: Threshold for rapid changes in quadrant counts.
    :return: Dictionary containing global alert status/message and quadrant-specific alerts.
    """
    # Global overcrowding check
    if people_count > max_capacity:
        global_alert = True
        global_message = (
            f"Overcrowding detected! {people_count} people detected, exceeding limit of {max_capacity}."
        )
        console.print(f"[bold red]⚠️ ALERT! {global_message}[/bold red]")
    else:
        global_alert = False
        global_message = f"Safe: {people_count} people detected (limit: {max_capacity})."
    
    # Initialize dictionary for quadrant-specific alerts
    quadrant_alerts = {}
    if quadrant_counts is not None and quadrant_threshold is not None:
        for quadrant, count in quadrant_counts.items():
            alert = False
            messages = []
            
            # Check if quadrant count exceeds threshold
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
            
            # Set the message based on alerts, or provide a safe message if none
            message = " ".join(messages) if messages else f"Safe: {count} people in {quadrant} (threshold: {quadrant_threshold})."
            quadrant_alerts[quadrant] = {"alert": alert, "message": message}
    
    return {
        "global_alert": global_alert,
        "global_message": global_message,
        "quadrant_alerts": quadrant_alerts
    }
