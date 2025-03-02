import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import WebSocketHandler from "./WebSocketHandler"; // ✅ Import WebSocketHandler

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [heatmapURL, setHeatmapURL] = useState(null);
  const [progress, setProgress] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [latestFrame, setLatestFrame] = useState(null); // ✅ WebSocket live frame

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    setLoading(true);
    setResult(null);
    setPeopleCount(0);
    setProgress(0);
    
    // ✅ Keep the original video URL
    setVideoURL(URL.createObjectURL(selectedFile));

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setResult(response.data);
      setHeatmapURL(response.data.heatmap_video_url || "https://www.w3schools.com/html/mov_bbb.mp4");
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred while processing the video.");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      {/* ✅ WebSocket Handler for Real-time Frames */}
      <WebSocketHandler
        setLatestFrame={setLatestFrame}
        setPeopleCount={setPeopleCount}
        setProgress={setProgress}
        setCurrentFrame={() => {}} // Not needed for now
      />

      <header>
        <h1>Stampede Shield 🛡️</h1>
        <p>Upload a video to analyze crowd movement and density.</p>
      </header>

      <div className="upload-section">
        <input type="file" accept="video/*" className="file-input" onChange={(e) => setSelectedFile(e.target.files[0])} />
        <button onClick={handleFileUpload} disabled={loading} className="upload-btn">
          {loading ? "Processing..." : "Upload & Analyze"}
        </button>
      </div>

      {loading && <p className="loading-text">Analyzing video... Please wait.</p>}

      <div className="progress-section">
        <h3>Processing Progress: {progress}%</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <h2>Total People Detected in Frame: {peopleCount}</h2>

      {/* ✅ Live Frames (TOP - Side by Side) */}
      <div className="video-frame-section">
        <div className="video-container">
          <h3>Live Processed Frame</h3>
          {latestFrame ? (
            <img src={latestFrame} alt="Processed Frame" className="frame-preview" />
          ) : (
            <p>No live frame available yet</p>
          )}
        </div>
      </div>

      {/* ✅ Heatmap & Original Video (BOTTOM - Side by Side) */}
      <div className="video-processing-section">
        {/* Original Video (Bottom Left) */}
        {videoURL && (
          <div className="video-container">
            <h3>Original Uploaded Video</h3>
            <video src={videoURL} controls autoPlay muted className="video-player" />
          </div>
        )}

        {/* AI Heatmap Video (Bottom Right) */}
        {heatmapURL && (
          <div className="video-container">
            <h3>AI Generated Heatmap</h3>
            <video src={heatmapURL} controls autoPlay muted className="video-player" />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
