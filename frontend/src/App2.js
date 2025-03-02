import React, { useState, useEffect } from "react";
import "./App2.css";

function App2({ frames }) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Log frames whenever they change for debugging
  useEffect(() => {
    console.log("App2 received frames:", frames);
    // Ensure currentFrameIndex is valid
    if (frames.length > 0 && currentFrameIndex >= frames.length) {
      setCurrentFrameIndex(frames.length - 1);
    }
  }, [frames, currentFrameIndex]);

  const handleScrubChange = (event) => {
    const index = Number(event.target.value);
    setCurrentFrameIndex(index);
  };

  const currentFrameData = frames[currentFrameIndex] || {};

  return (
    <div className="app2-container">
      <h1>Frame Scrubber</h1>
      {frames.length > 0 ? (
        <>
          <div className="frame-display">
            {currentFrameData.frame ? (
              <img
                src={`data:image/jpeg;base64,${currentFrameData.frame}`}
                alt="Scrubbed Frame"
                className="scrubbed-frame"
              />
            ) : (
              <p>No frame available for this frame.</p>
            )}
          </div>
          <div className="detection-info">
            <p>
              <strong>People in Frame:</strong>{" "}
              {currentFrameData.people_in_frame || 0}
            </p>
            <p>
              <strong>Quadrant Counts:</strong>{" "}
              {currentFrameData.quadrant_counts
                ? JSON.stringify(currentFrameData.quadrant_counts)
                : "N/A"}
            </p>
            <p>
              <strong>Danger Zones:</strong>{" "}
              {currentFrameData.danger_zones && currentFrameData.danger_zones.length > 0
                ? currentFrameData.danger_zones.join(", ")
                : "None"}
            </p>
            <p>
              <strong>Progress:</strong>{" "}
              {currentFrameData.progress
                ? Number(currentFrameData.progress).toFixed(2)
                : 0}
              %
            </p>
          </div>
          <div className="scrubber">
            <input
              type="range"
              min="0"
              max={frames.length - 1}
              value={currentFrameIndex}
              onChange={handleScrubChange}
              className="scrub-slider"
            />
            <p>
              Frame {currentFrameIndex + 1} of {frames.length}
            </p>
          </div>
        </>
      ) : (
        <p>No frames received yet...</p>
      )}
    </div>
  );
}

export default App2;
