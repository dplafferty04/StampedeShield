import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [heatmapURL, setHeatmapURL] = useState(null);
  const [latestFrame, setLatestFrame] = useState(null);
  const [progress, setProgress] = useState(0);
  const [peopleCount, setPeopleCount] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);

  const originalVideoRef = useRef(null);
  const heatmapVideoRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLatestFrame(`data:image/jpeg;base64,${data.frame}`);
      setPeopleCount(data.people_in_frame);
      setProgress(data.progress.toFixed(2));
      if (data.frame_number !== undefined) {
        setCurrentFrame(data.frame_number);
      }
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.warn("WebSocket closed.");

    return () => ws.close();
  }, []);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    setLoading(true);
    setResult(null);
    setLatestFrame(null);
    setPeopleCount(0);
    setProgress(0);
    setCurrentFrame(0);
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

  // Synchronize videos
  const syncVideos = (sourceVideo, targetVideo) => {
    if (!sourceVideo || !targetVideo) return;

    targetVideo.currentTime = sourceVideo.currentTime;
    if (sourceVideo.paused !== targetVideo.paused) {
      sourceVideo.paused ? targetVideo.pause() : targetVideo.play();
    }
  };

  useEffect(() => {
    const originalVideo = originalVideoRef.current;
    const heatmapVideo = heatmapVideoRef.current;

    if (originalVideo && heatmapVideo) {
      const handleSync = () => syncVideos(originalVideo, heatmapVideo);
      const handleTimeUpdate = () => {
        if (Math.abs(originalVideo.currentTime - heatmapVideo.currentTime) > 0.1) {
          heatmapVideo.currentTime = originalVideo.currentTime;
        }
      };

      originalVideo.addEventListener("play", handleSync);
      originalVideo.addEventListener("pause", handleSync);
      originalVideo.addEventListener("seeked", handleSync);
      originalVideo.addEventListener("timeupdate", handleTimeUpdate);

      heatmapVideo.addEventListener("play", handleSync);
      heatmapVideo.addEventListener("pause", handleSync);
      heatmapVideo.addEventListener("seeked", handleSync);
      heatmapVideo.addEventListener("timeupdate", handleTimeUpdate);

      return () => {
        originalVideo.removeEventListener("play", handleSync);
        originalVideo.removeEventListener("pause", handleSync);
        originalVideo.removeEventListener("seeked", handleSync);
        originalVideo.removeEventListener("timeupdate", handleTimeUpdate);

        heatmapVideo.removeEventListener("play", handleSync);
        heatmapVideo.removeEventListener("pause", handleSync);
        heatmapVideo.removeEventListener("seeked", handleSync);
        heatmapVideo.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }
  }, [videoURL, heatmapURL]);

  return (
    <div className="container">
      <header>
        <h1>Stampede Shield 🛡️</h1>
        <p>Upload a video to analyze crowd movement and density.</p>
      </header>

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

      <div className="progress-section">
        <h3>Processing Progress: {progress}%</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <h2>Total People Detected in Frame: {peopleCount}</h2>
      <h3>Current Frame: {currentFrame}</h3>

      <div className="live-frame">
        {latestFrame ? (
          <img src={latestFrame} alt="Processed Frame" className="frame-preview" />
        ) : (
          <p>No frame available yet</p>
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
        </div>
      )}

      {videoURL && heatmapURL && (
        <div className="video-section">
          <div className="video-container">
            <h3>Original Video</h3>
            <video ref={originalVideoRef} src={videoURL} controls className="video-player" />
          </div>
          <div className="video-container">
            <h3>AI Generated Heatmap</h3>
            <video ref={heatmapVideoRef} src={videoURL} controls className="video-player" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
