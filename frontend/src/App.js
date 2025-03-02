import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import WebSocketHandler from "./WebSocketHandler";
import LiveCamera from "./live_camera";
import App2 from "./App2";

function App() {
  const [mode, setMode] = useState("upload"); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [heatmapURL, setHeatmapURL] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [quadrantCounts, setQuadrantCounts] = useState({});
  const [latestFrame, setLatestFrame] = useState(null);
  const [showQuadrants, setShowQuadrants] = useState(false);

  const originalVideoRef = useRef(null);
  const heatmapVideoRef = useRef(null);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }
    setLoading(true);
    setResult(null);
    setPeopleCount(0);
    setProgress(0);
    setLatestFrame(null);

    setVideoURL(URL.createObjectURL(selectedFile));

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setResult(response.data);
      setHeatmapURL(response.data.heatmap_video_url || "https://www.w3schools.com/html/mov_bbb.mp4");
      
      if (originalVideoRef.current) originalVideoRef.current.currentTime = 0;
      if (heatmapVideoRef.current) heatmapVideoRef.current.currentTime = 0;
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred while processing the video.");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <WebSocketHandler
        setLatestFrame={setLatestFrame}
        setPeopleCount={setPeopleCount}
        setProgress={setProgress}
        setCurrentFrame={() => {}}
        setQuadrantCounts={setQuadrantCounts}
      />

      <header>
        <h1>Stampede Shield 🛡️</h1>
        <p>Select a mode: Upload Video or Live Webcam</p>
      </header>

      <div className="mode-selection">
        <button onClick={() => setMode("upload")}>Upload Video</button>
        <button onClick={() => setMode("live")}>Live Webcam</button>
      </div>

      {mode === "upload" && (
        <>
          <div className="upload-section">
            <input
              type="file"
              accept="video/*"
              className="file-input"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <button onClick={handleFileUpload} disabled={loading} className="upload-btn">
              {loading ? "Processing..." : "Upload & Analyze"}
            </button>
          </div>

          {loading && <p className="loading-text">Analyzing video... Please wait.</p>}

          {loading && (
            <div className="progress-section">
              <h3>Processing Progress: {progress}%</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {loading && (
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
          )}

          <App2 
            toggleQuadrants={() => setShowQuadrants(!showQuadrants)} 
            showQuadrants={showQuadrants} 
            loading={loading} 
          />

          {showQuadrants && (
            <div className="quadrant-section">
              <h3>Live Quadrant Counts (12 Regions):</h3>
              {Object.keys(quadrantCounts).length > 0 ? (
                <div className="quadrant-grid">
                  {Object.entries(quadrantCounts).map(([key, value]) => (
                    <div key={key} className="quadrant-cell">
                      <p>{key}: {value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No quadrant data available yet</p>
              )}
            </div>
          )}

          <div className="video-processing-section">
            {videoURL && (
              <div className="video-container">
                <h3>Original Uploaded Video</h3>
                <video
                  ref={originalVideoRef}
                  src={videoURL}
                  controls
                  autoPlay
                  muted
                  className="video-player"
                />
              </div>
            )}
            {heatmapURL && (
              <div className="video-container">
                <h3>AI Generated Heatmap</h3>
                <video
                  ref={heatmapVideoRef}
                  src={heatmapURL}
                  controls
                  autoPlay
                  muted
                  className="video-player"
                />
              </div>
            )}
          </div>
        </>
      )}

      {mode === "live" && (
        <div className="live-feed-section">
          <LiveCamera />
        </div>
      )}
    </div>
  );
}

export default App;
