import React, { useState } from "react";
import axios from "axios";

function App() {
  const [peopleCount, setPeopleCount] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/detect/", formData);
      setPeopleCount(response.data.people_count);
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  return (
    <div>
      <h1>StampedeShield</h1>
      <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <button onClick={handleFileUpload}>Upload Video</button>
      {peopleCount !== null && <h2>People Count: {peopleCount}</h2>}
    </div>
  );
}

export default App;
