import React, { useState } from "react";
import axios from "axios";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a video file.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setResult(response.data);
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("An error occurred while processing the video.");
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Stampede Shield 🛡️</h1>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setSelectedFile(e.target.files[0])}
      />
      <button onClick={handleFileUpload} disabled={loading} style={{ marginLeft: "10px" }}>
        {loading ? "Processing..." : "Upload Video"}
      </button>

      {loading && <p>Analyzing video... Please wait.</p>}

      {result && (
        <div style={{ marginTop: "20px", textAlign: "left", maxWidth: "600px", margin: "auto" }}>
          <h2>Detection Results 📊</h2>
          <p><strong>Total People Detected:</strong> {result.total_people_detected}</p>
          <p><strong>Average People Per Frame:</strong> {result.average_people_per_frame}</p>
          <p><strong>Processing Time:</strong> {result.processing_time_seconds} sec</p>

          <h3>Frame-wise Count:</h3>
          <div style={{ maxHeight: "200px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
            {result.frame_wise_count.map((count, index) => (
              <p key={index}>Frame {index + 1}: {count} people</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
