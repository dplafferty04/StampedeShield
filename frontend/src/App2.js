import React, { useState, useEffect } from "react";
import "./App2.css";

function App2({ frames }) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState("original"); // "original" or "heatmap"

  useEffect(() => {
    console.log("Frames received in App2:", frames);
    if (frames.length > 0 && currentFrameIndex >= frames.length) {
      setCurrentFrameIndex(frames.length - 1);
    }
  }, [frames, currentFrameIndex]);

  const handleScrubChange = (event) => {
    const index = Number(event.target.value);
    setCurrentFrameIndex(index);
  };

  // Get current frame data
  const currentFrameData = frames[currentFrameIndex] || {};

  // Determine which image to show based on displayMode.
  // For "original", use data.frame; for "heatmap", use data.heatmap.
  let imageSrc = "";
  if (displayMode === "original") {
    if (currentFrameData.frame) {
      imageSrc = `data:image/jpeg;base64,${currentFrameData.frame}`;
    }
  } else {
    if (currentFrameData.heatmap) {
      imageSrc = `data:image/jpeg;base64,${currentFrameData.heatmap}`;
    }
  }

  // Log displayMode and imageSrc for debugging
  useEffect(() => {
    console.log("Display mode:", displayMode);
    console.log("Current image source length:", imageSrc.length);
  }, [displayMode, imageSrc]);

  return (
    <div className="app2-container">
      <h1>Frame Scrubber</h1>
      
      {/* Toggle between Original and Heatmap */}
      <div className="display-toggle">
        <button
          onClick={() => setDisplayMode("original")}
          className={displayMode === "original" ? "active" : ""}
        >
          Original
        </button>
        <button
          onClick={() => setDisplayMode("heatmap")}
          className={displayMode === "heatmap" ? "active" : ""}
        >
          Heatmap
        </button>
      </div>
      
      {frames.length > 0 ? (
        <>
          <div className="frame-display">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Scrubbed Frame"
                className="scrubbed-frame"
              />
            ) : (
              <p>No image available for this frame.</p>
            )}
          </div>
          <div className="detection-info">
            <p>
              <strong>People in Frame:</strong>{" "}
              {currentFrameData.people_in_frame || 0}
            </p>
            <p>
              <strong>Danger Zones:</strong>{" "}
              {currentFrameData.danger_zones &&
              currentFrameData.danger_zones.length > 0
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
