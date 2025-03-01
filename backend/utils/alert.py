from rich.console import Console

console = Console()

# Function to check if the detected people exceed the set limit
def check_overcrowding(people_count, max_capacity):
    if people_count > max_capacity:
        console.print(f"[bold red]⚠️ ALERT! Overcrowding detected! {people_count} people detected, exceeding limit of {max_capacity}.[/bold red]")
        return {
            "alert": True,
            "message": f"Overcrowding detected! {people_count} people detected, exceeding limit of {max_capacity}.",
            "current_count": people_count,
            "max_capacity": max_capacity
        }
    return {
        "alert": False,
        "message": f"Safe: {people_count} people detected (limit: {max_capacity}).",
        "current_count": people_count,
        "max_capacity": max_capacity
    }
