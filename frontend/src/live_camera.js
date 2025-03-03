import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./live_camera.css"; // Optional: separate CSS for live feed–specific styling

function LiveCamera() {
  const [liveDetection, setLiveDetection] = useState(null);
  const [liveProcessedFrame, setLiveProcessedFrame] = useState(null);
  const [liveFrameCount, setLiveFrameCount] = useState(0);
  const [cumulativeQuadrants, setCumulativeQuadrants] = useState({});
  const [liveAvgQuadrants, setLiveAvgQuadrants] = useState({});
  
  const liveVideoRef = useRef(null);
  const liveIntervalRef = useRef(null);

  // Threshold for running average danger alert
  const avgQuadrantThreshold = 5; // Adjust as needed

  useEffect(() => {
    async function startLiveFeed() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          // Add a delay of 100ms before calling play()
          setTimeout(() => {
            liveVideoRef.current.play();
          }, 100);
        }
        liveIntervalRef.current = setInterval(captureAndDetectFrame, 1000);
      } catch (error) {
        console.error("Error accessing webcam:", error);
        alert("Webcam access is required for live feed mode.");
      }
    }
    
    startLiveFeed();

    // Cleanup on unmount
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
      console.log("Live frame response:", response.data);
      setLiveDetection(response.data);
      if (response.data.frame) {
        setLiveProcessedFrame(`data:image/jpeg;base64,${response.data.frame}`);
      }
      // Update running average for quadrant counts if available
      if (response.data.quadrant_counts) {
        setLiveFrameCount(prev => prev + 1);
        setCumulativeQuadrants(prev => {
          const updated = { ...prev };
          for (const key in response.data.quadrant_counts) {
            updated[key] = (updated[key] || 0) + response.data.quadrant_counts[key];
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Error detecting live frame:", error);
      // Fallback: use the captured frame if detection fails
      setLiveProcessedFrame(dataUrl);
    }
  };

  // Compute running average whenever cumulativeQuadrants or liveFrameCount updates
  useEffect(() => {
    if (liveFrameCount > 0) {
      const avg = {};
      for (const key in cumulativeQuadrants) {
        avg[key] = cumulativeQuadrants[key] / liveFrameCount;
      }
      setLiveAvgQuadrants(avg);
    }
  }, [cumulativeQuadrants, liveFrameCount]);

  const stopLiveFeed = () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    if (liveVideoRef.current && liveVideoRef.current.srcObject) {
      liveVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="live-camera-container">
      <h2>Live Webcam Feed</h2>
      <video ref={liveVideoRef} className="live-video" autoPlay muted></video>
      
      {liveDetection && (
        <div className="live-detection-info">
          <p><strong>People in Frame:</strong> {liveDetection.people_in_frame}</p>
          <p>
            
          </p>
          {liveDetection.danger_zones && liveDetection.danger_zones.length > 0 && (
            <p style={{ color: "red" }}>
              <strong>Alert!</strong> Danger in quadrants: {liveDetection.danger_zones.join(", ")}
            </p>
          )}
        </div>
      )}

      {liveFrameCount > 0 && (
        <div className="quadrant-section">
          <h3>Quadrant Data (Current / Running Average)</h3>
          <div className="quadrant-grid">
            {liveDetection && liveDetection.quadrant_counts && Object.keys(liveDetection.quadrant_counts).map(key => (
              <div 
                key={key} 
                className={`quadrant-cell ${liveAvgQuadrants[key] > avgQuadrantThreshold ? "danger" : ""}`}
              >
                <p>{key}</p>
                <p>{liveDetection.quadrant_counts[key]}</p>
              </div>
            ))}
          </div>
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
