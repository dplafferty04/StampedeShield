import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import WebSocketHandler from "./WebSocketHandler"; // Keep existing WebSocketHandler logic
import LiveCamera from "./live_camera"; // New component for live webcam feed
import logo from "./Logo.png"; // Import your logo

function App() {
  const [mode, setMode] = useState("upload"); // "upload" or "live"
  
  // States for upload mode
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [heatmapURL, setHeatmapURL] = useState(null);
  const [result, setResult] = useState(null);
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [quadrantCounts, setQuadrantCounts] = useState({});
  const [dangerZones, setDangerZones] = useState([]); // New state for danger alerts

  // Live WebSocket frame (used in upload mode for live processing, if any)
  const [latestFrame, setLatestFrame] = useState(null);

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
    
    // Keep the original video URL for later display
    setVideoURL(URL.createObjectURL(selectedFile));

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setResult(response.data);
      setHeatmapURL(response.data.heatmap_video_url || "https://www.w3schools.com/html/mov_bbb.mp4");
      
      // Reset video time to 0 when processing is done
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = 0;
      }
      if (heatmapVideoRef.current) {
        heatmapVideoRef.current.currentTime = 0;
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred while processing the video.");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      {/* WebSocket Handler for Real-time Frames and Quadrant Data */}
      <WebSocketHandler
        setLatestFrame={setLatestFrame}
        setPeopleCount={setPeopleCount}
        setProgress={setProgress}
        setCurrentFrame={() => {}}
        setQuadrantCounts={setQuadrantCounts}
        setDangerZones={setDangerZones}
      />

      <header className="header">
        <h1 className="title">
          <img src={logo} alt="Logo" className="logo" /> 
          Stampede Shield
        </h1>
        <p className="subtitle">Select a mode: Upload Video or Live Webcam</p>
      </header>

      <div className="mode-selection">
        <button onClick={() => setMode("upload")} className="mode-btn">Upload Video</button>
        <button onClick={() => setMode("live")} className="mode-btn">Live Webcam</button>
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

          {/* Only show progress section when processing is ongoing */}
          {loading && (
            <div className="progress-section">
              <h3>Processing Progress: {progress}%</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="people-count-section" style={{ marginTop: "20px" }}>
            <h2>Total People Detected in Frame: {peopleCount}</h2>
          </div>

          {/* Quadrant Section */}
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

          {/* Display Danger Zones if available */}
          {dangerZones.length > 0 && (
            <div className="alert-section">
              <h3>Quadrant Danger Alerts:</h3>
              <p style={{ color: "red" }}>
                {dangerZones.join(", ")} are showing rapid changes!
              </p>
            </div>
          )}

          {/* Live Processed Frame */}
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

          {/* Bottom Section: Original Video & AI Heatmap */}
          <div className="video-processing-section">
            {videoURL && (
              <div className="video-container">
                <h3>Original Uploaded Video</h3>
                <video ref={originalVideoRef} src={videoURL} controls autoPlay muted className="video-player" />
              </div>
            )}
            {heatmapURL && (
              <div className="video-container">
                <h3>AI Generated Heatmap</h3>
                <video ref={heatmapVideoRef} src={heatmapURL} controls autoPlay muted className="video-player" />
              </div>
            )}
          </div>

          {result && (
            <div className="result-section">
              <h2>Final Detection Results 📊</h2>
              <div className="result-content">
                <p><strong>Total People Detected:</strong> {result.total_people_detected}</p>
                <p><strong>Average People Per Frame:</strong> {result.average_people_per_frame}</p>
                <p><strong>Processing Time:</strong> {result.processing_time_seconds} sec</p>
              </div>
              {result.avg_quadrant_counts && (
                <div className="quadrant-result">
                  <h3>Average Quadrant Counts:</h3>
                  {Object.entries(result.avg_quadrant_counts).map(([key, value]) => (
                    <p key={key}>{key}: {value.toFixed(2)}</p>
                  ))}
                  <h3>Quadrant Alerts:</h3>
                  {result.quadrant_alerts && Object.entries(result.quadrant_alerts).map(([key, value]) => (
                    <p key={key}>{key}: {value ? "Overcrowded" : "Safe"}</p>
                  ))}
                </div>
              )}
            </div>
          )}
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
