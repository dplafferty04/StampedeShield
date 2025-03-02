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

      {mode === "scrubber" && (
        <div className="scrubber-section">
          <App2 frames={frames} />
        </div>
      )}
    </div>
  );
}

export default App;
