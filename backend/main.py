from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.detection import router as detection_router

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routes
app.include_router(detection_router)

@app.get("/")
def home():
    return {"message": "Crowd Management AI is running!"}
