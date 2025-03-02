import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import WebSocketHandler from "./WebSocketHandler"; // Keep existing WebSocketHandler logic
import LiveCamera from "./live_camera"; // New component for live webcam feed
import App2 from "./App2"; // New component for frame scrubber
import logo from "./Logo.png"; // Import your logo

function App() {
  const [mode, setMode] = useState("upload"); // "upload", "live", or "scrubber"
  
  // States for upload mode
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [quadrantCounts, setQuadrantCounts] = useState({});
  const [dangerZones, setDangerZones] = useState([]); // For danger alerts

  // Live WebSocket frame (used in upload mode for live processing, if any)
  const [latestFrame, setLatestFrame] = useState(null);

  // NEW: Store frames received via WebSocket for scrubbing
  const [frames, setFrames] = useState([]);

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
    
    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setResult(response.data);
      
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
      {/* WebSocket Handler for real-time frames and quadrant data; also stores each frame in frames state */}
      <WebSocketHandler
        setLatestFrame={setLatestFrame}
        setPeopleCount={setPeopleCount}
        setProgress={setProgress}
        setCurrentFrame={() => {}}
        setQuadrantCounts={setQuadrantCounts}
        setDangerZones={setDangerZones}
        setFrames={setFrames} // New prop to update frames array
      />

      <header className="header">
        <h1 className="title">
          <img src={logo} alt="Logo" className="logo" /> Stampede Shield
        </h1>
        <p className="subtitle">Select a mode: Upload Video, Live Webcam, or Frame Scrubber</p>
      </header>

      <div className="mode-selection">
        <button onClick={() => setMode("upload")} className="mode-btn">Upload Video</button>
        <button onClick={() => setMode("live")} className="mode-btn">Live Webcam</button>
        <button onClick={() => setMode("scrubber")} className="mode-btn">Frame Scrubber</button>
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

          <div className="people-count-section" style={{ marginTop: "20px" }}>
            <h2>Total People Detected in Frame: {peopleCount}</h2>
          </div>

          {/* Quadrant Section */}
          <div className="quadrant-section">
            <h3>Live Quadrant Counts (12 Regions):</h3>
            {Object.keys(quadrantCounts).length > 0 ? (
              <div className="quadrant-grid">
                {Object.entries(quadrantCounts).map(([key, value]) => (
                  <div key={key} className={`quadrant-cell ${dangerZones.includes(key) ? 'danger' : ''}`}>
                    <p>{key}: {value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No quadrant data available yet</p>
            )}
          </div>

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


          {result && (
            <div className="result-section">
              <h2>Final Detection Results 📊</h2>
              <div className="result-content">
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

      {mode === "scrubber" && (
        <div className="scrubber-section">
          <App2 frames={frames} />
        </div>
      )}
    </div>
  );
}

export default App;
