import React, { useState, useEffect } from "react";
import "./App.css";

function App2({ toggleQuadrants, showQuadrants, loading }) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  }, [loading]);

  return (
    <div className="app2-container">
      {showButton && (
        <button onClick={toggleQuadrants} className="frame-toggle-btn">
          {showQuadrants ? "Hide Frame-By-Frame View" : "Display Frame-By-Frame View"}
        </button>
      )}
    </div>
  );
}

export default App2;
