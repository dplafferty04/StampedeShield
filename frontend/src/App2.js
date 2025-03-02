import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function App2() {
  const [frameData, setFrameData] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch frame-by-frame data when the component mounts
    const fetchFrameData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://127.0.0.1:8000/frames/");
        const data = await response.json();
        setFrameData(data.frames || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching frame data:", error);
        setIsLoading(false);
      }
    };

    fetchFrameData();
  }, []);

  // Go back to main app
  const handleBackClick = () => {
    navigate('/');
  };

  // Navigate through frames
  const handlePrevFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handleNextFrame = () => {
    if (currentFrameIndex < frameData.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  // Get current frame data
  const currentFrame = frameData[currentFrameIndex] || {};

  return (
    <div className="container frame-results-container">
      <header>
        <h1>Stampede Shield 🛡️ - Frame Analysis</h1>
        <button onClick={handleBackClick} className="back-btn">
          Back to Main Page
        </button>
      </header>

      {isLoading ? (
        <div className="loading-section">
          <p>Loading frame data...</p>
          <div className="spinner"></div>
        </div>
      ) : frameData.length === 0 ? (
        <div className="no-data-section">
          <p>No frame data available. Please process a video first.</p>
          <button onClick={handleBackClick} className="back-btn">
            Return to Upload Page
          </button>
        </div>
      ) : (
        <div className="frame-analysis-content">
          <div className="frame-navigation">
            <h3>
              Frame {currentFrameIndex + 1} of {frameData.length}
            </h3>
            <div className="navigation-controls">
              <button
                onClick={handlePrevFrame}
                disabled={currentFrameIndex === 0}
                className="nav-btn"
              >
                Previous Frame
              </button>
              <input
                type="range"
                min="0"
                max={frameData.length - 1}
                value={currentFrameIndex}
                onChange={(e) => setCurrentFrameIndex(parseInt(e.target.value))}
                className="frame-slider"
              />
              <button
                onClick={handleNextFrame}
                disabled={currentFrameIndex === frameData.length - 1}
                className="nav-btn"
              >
                Next Frame
              </button>
            </div>
          </div>

          <div className="frame-data-section">
            <div className="frame-preview-container">
              <h3>Frame Preview</h3>
              {currentFrame.image_url ? (
                <img
                  src={currentFrame.image_url}
                  alt={`Frame ${currentFrameIndex + 1}`}
                  className="frame-preview-image"
                />
              ) : (
                <div className="no-preview">No preview available</div>
              )}
            </div>

            <div className="quadrant-visualization">
              <h3>Quadrant Data - Frame {currentFrameIndex + 1}</h3>
              {currentFrame.quadrant_counts ? (
                <div className="quadrant-grid-visualization">
                  {Object.entries(currentFrame.quadrant_counts).map(([key, value]) => {
                    // Calculate density level for color coding
                    const densityLevel = Math.min(value / 10, 1); // Normalize between 0-1
                    const backgroundColor = `rgba(255, ${255 - densityLevel * 255}, ${
                      255 - densityLevel * 255
                    }, ${0.3 + densityLevel * 0.7})`;

                    return (
                      <div
                        key={key}
                        className="quadrant-cell-visualization"
                        style={{ backgroundColor }}
                      >
                        <p className="quadrant-name">{key}</p>
                        <p className="quadrant-count">{value}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No quadrant data available for this frame</p>
              )}
            </div>
          </div>

          <div className="frame-statistics">
            <h3>Frame Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-label">Total People:</p>
                <p className="stat-value">{currentFrame.total_people || 0}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Timestamp:</p>
                <p className="stat-value">
                  {currentFrame.timestamp
                    ? `${Math.floor(currentFrame.timestamp / 60)}:${(
                        currentFrame.timestamp % 60
                      ).toFixed(2)}`
                    : "N/A"}
                </p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Max Quadrant:</p>
                <p className="stat-value">
                  {currentFrame.quadrant_counts
                    ? Object.entries(currentFrame.quadrant_counts).reduce(
                        (max, [key, value]) =>
                          max.value >= value ? max : { key, value },
                        { key: "None", value: 0 }
                      ).key
                    : "N/A"}
                </p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Risk Level:</p>
                <p className="stat-value">
                  {currentFrame.risk_level || "Low"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App2;