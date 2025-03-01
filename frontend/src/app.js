import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [heatmapURL, setHeatmapURL] = useState(null);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    setLoading(true);
    setResult(null);
    setVideoURL(URL.createObjectURL(selectedFile)); // Show original video immediately

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);

      setResult(response.data);

      // If the API returns a valid heatmap URL, use it; otherwise, use a placeholder
      setHeatmapURL(response.data.heatmap_video_url || "https://www.w3schools.com/html/mov_bbb.mp4");
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred while processing the video.");
    }

    setLoading(false);
  };

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

      {result && (
        <div className="result-section">
          <h2>Detection Results 📊</h2>
          <div className="result-content">
            <p><strong>Total People Detected:</strong> {result.total_people_detected}</p>
            <p><strong>Average People Per Frame:</strong> {result.average_people_per_frame}</p>
            <p><strong>Processing Time:</strong> {result.processing_time_seconds} sec</p>
          </div>

          <h3>Frame-wise Count:</h3>
          <div className="frame-count">
            {result.frame_wise_count.map((count, index) => (
              <p key={index}>Frame {index + 1}: {count} people</p>
            ))}
          </div>
        </div>
      )}

      {videoURL && heatmapURL && (
        <div className="video-section">
          <div className="video-container">
            <h3>Original Video</h3>
            <video src={videoURL} controls className="video-player" />
          </div>
          <div className="video-container">
            <h3>AI Generated Heatmap</h3>
            <video src={videoURL} controls className="video-player" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
