import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./live_camera.css"; // You can create this file for live feed–specific styling, or add these styles to your App.css

function LiveCamera() {
  const [liveDetection, setLiveDetection] = useState(null);
  const [liveProcessedFrame, setLiveProcessedFrame] = useState(null);
  const liveVideoRef = useRef(null);
  const liveIntervalRef = useRef(null);

  useEffect(() => {
    async function startLiveFeed() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play();
        }
        liveIntervalRef.current = setInterval(captureAndDetectFrame, 1000);
      } catch (error) {
        console.error("Error accessing webcam:", error);
        alert("Webcam access is required for live feed mode.");
      }
    }
    startLiveFeed();
  
    // Capture current ref value for cleanup
    const currentVideo = liveVideoRef.current;
    
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (currentVideo && currentVideo.srcObject) {
        currentVideo.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  

  const captureAndDetectFrame = async () => {
    if (!liveVideoRef.current) return;
    const video = liveVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");
    try {
      const response = await axios.post("http://127.0.0.1:8000/detect_frame/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLiveDetection(response.data);
      if (response.data.frame) {
        setLiveProcessedFrame(`data:image/jpeg;base64,${response.data.frame}`);
      }
    } catch (error) {
      console.error("Error detecting live frame:", error);
    }
  };

  const stopLiveFeed = () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    if (liveVideoRef.current && liveVideoRef.current.srcObject) {
      liveVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="live-camera-container">
      {liveDetection && liveDetection.quadrant_counts && (
        <div className="quadrant-section">
          <h3>Live Quadrant Counts (12 Regions):</h3>
          <div className="quadrant-grid">
            {Object.entries(liveDetection.quadrant_counts).map(([key, value]) => (
              <div key={key} className="quadrant-cell">
                <p>{key}: {value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <h2>Live Webcam Feed</h2>
      <video ref={liveVideoRef} className="live-video" autoPlay muted></video>
      {liveDetection && (
  <div className="live-detection-info">
    <p><strong>People in Frame:</strong> {liveDetection.people_in_frame}</p>
    <p>
      <strong>Quadrant Counts:</strong> {JSON.stringify(liveDetection.quadrant_counts)}
    </p>
    {liveDetection.danger_zones && liveDetection.danger_zones.length > 0 && (
      <p style={{ color: "red" }}>
        <strong>Alert!</strong> Danger in quadrants: {liveDetection.danger_zones.join(", ")}
      </p>
    )}
  </div>
)}

      {liveProcessedFrame && (
        <div className="live-processed-frame">
          <h3>Processed Live Frame</h3>
          <img src={liveProcessedFrame} alt="Live Processed Frame" className="frame-preview" />
        </div>
      )}
      <button onClick={stopLiveFeed} className="stop-live-btn">Stop Live Feed</button>
    </div>
  );
}

export default LiveCamera;
