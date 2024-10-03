import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ImageUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const canvasRef = useRef(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setPrediction(null); // Clear previous predictions
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    console.log(formData);
    try {
      const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPrediction(response.data);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const drawBoundingBoxes = () => {
    if (!prediction || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);

    img.onload = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set the canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes and labels
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.font = '18px Arial';
      ctx.fillStyle = 'red';
      
      prediction.boxes.forEach((box, index) => {
        const [x1, y1, x2, y2] = box;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Draw label and coordinates above or below the box
        const label = `${prediction.labels[index]} (${x1}, ${y1}, ${x2}, ${y2})`;
        const textWidth = ctx.measureText(label).width;
        const textHeight = parseInt(ctx.font, 10);

        const textX = x1;
        const textY = y1 - 10 > textHeight ? y1 - 10 : y1 + textHeight + 10;
        
        ctx.fillText(label, textX, textY);
      });
    };
  };

  useEffect(() => {
    drawBoundingBoxes();
  }, [prediction]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Upload an Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>

      {selectedFile && (
        <div style={{ marginTop: '20px', position: 'relative' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '50%' }} />
        </div>
      )}

      {prediction && (
        <div style={{ marginTop: '20px' }}>
          <h3>Predictions:</h3>
          <ul>
            {prediction.labels.map((label, index) => (
              <li key={index}>
                <strong>{label}</strong>: ({prediction.boxes[index].join(', ')})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;