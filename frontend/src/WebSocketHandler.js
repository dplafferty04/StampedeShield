import { useEffect } from "react";

function WebSocketHandler({ setLatestFrame, setPeopleCount, setProgress, setQuadrantCounts }) {
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onopen = () => console.log("✅ WebSocket connected!");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔥 Received WebSocket Data:", data);

        // Update the live frame
        if (data.frame) {
          setLatestFrame(`data:image/jpeg;base64,${data.frame}`);
        } else {
          console.warn("⚠️ No frame received");
        }

        // Update people count and progress
        setPeopleCount(data.people_in_frame || 0);
        setProgress(data.progress !== undefined ? data.progress.toFixed(2) : 0);

        // Update quadrant counts if available
        if (data.quadrant_counts) {
          setQuadrantCounts(data.quadrant_counts);
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket data:", error);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket error:", error);
    ws.onclose = () => console.warn("⚠️ WebSocket closed.");

    return () => ws.close();
  }, [setLatestFrame, setPeopleCount, setProgress, setQuadrantCounts]);

  return null;
}

export default WebSocketHandler;
