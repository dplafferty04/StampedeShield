import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import WebSocketHandler from "./WebSocketHandler"; // existing WebSocketHandler logic
import LiveCamera from "./live_camera"; // live webcam component
import App2 from "./App2"; // frame scrubber component
import logo from "./Logo.png"; // logo

function App() {
  const [mode, setMode] = useState("upload"); // "upload", "live", or "scrubber"
  
  // States for upload mode
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  
  // New state to control display after analyze button is pressed
  const [analysisStarted, setAnalysisStarted] = useState(false);
  
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
    
    // Set analysisStarted to true once the button is pressed
    setAnalysisStarted(true);
    
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
        setFrames={setFrames} // prop to update frames array
      />

      <header className="header">
        <h1 className="title">
          <img src={logo} alt="Logo" className="logo" /> Stampede Shield
        </h1>
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

          {/* Only display these sections after the analyze button is pressed */}
          {analysisStarted && (
            <>
              <div className="people-count-section" style={{ marginTop: "20px" }}>
                <h2>Total People Detected in Frame: {peopleCount}</h2>
              </div>

              {/* Processed Frame & Quadrant Grid Container */}
              <div className="video-container">
                <h3>Live Processed Frame</h3>
                {latestFrame ? (
                  <img src={latestFrame} alt="Processed Frame" className="frame-preview" />
                ) : (
                  <p>No live frame available yet</p>
                )}
                {/* The quadrant grid is positioned to fill the same space */}
                {Object.keys(quadrantCounts).length > 0 && (
                  <div className="quadrant-grid">
                    {Object.entries(quadrantCounts).map(([key, value]) => (
                      <div key={key} className={`quadrant-cell ${dangerZones.includes(key) ? 'danger' : ''}`}>
                        <p>{key}: {value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

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
