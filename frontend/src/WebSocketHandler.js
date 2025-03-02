import { useEffect } from "react";

function WebSocketHandler({ setLatestFrame, setPeopleCount, setProgress, setCurrentFrame }) {
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket Data:", data);

        setLatestFrame(data.frame ? `data:image/jpeg;base64,${data.frame}` : null);
        setPeopleCount(data.people_in_frame || 0);
        setProgress(data.progress !== undefined ? data.progress.toFixed(2) : 0);
        if (data.frame_number !== undefined) {
          setCurrentFrame(data.frame_number);
        }
      } catch (error) {
        console.error("Error parsing WebSocket data:", error);
      }
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.warn("WebSocket closed.");

    return () => ws.close();
  }, []);

  return null;
}

export default WebSocketHandler;
