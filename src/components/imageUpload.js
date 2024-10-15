import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ImageUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null); // Track resizing direction
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setPrediction(null); 
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      prediction.boxes.forEach((box, index) => {
        const [x1, y1, x2, y2] = box;
        
        // Draw the box
        ctx.strokeStyle = selectedBox === index ? 'blue' : 'red';
        ctx.lineWidth = selectedBox === index ? 3 : 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Draw label
        ctx.font = '18px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(prediction.labels[index], x1, y1 > 20 ? y1 - 5 : y1 + 20);

        // Draw resize handles
        if (selectedBox === index) {
          ctx.fillStyle = 'blue';
          const handleSize = 6;
          ctx.fillRect(x1 - handleSize, y1 - handleSize, handleSize * 2, handleSize * 2); // Top-left
          ctx.fillRect(x2 - handleSize, y2 - handleSize, handleSize * 2, handleSize * 2); // Bottom-right
        }
      });
    };
  };

  const isNearCorner = (x, y, box) => {
    const [x1, y1, x2, y2] = box;
    const handleSize = 6;

    // Check if near the top-left corner
    if (Math.abs(x - x1) <= handleSize && Math.abs(y - y1) <= handleSize) return 'top-left';

    // Check if near the bottom-right corner
    if (Math.abs(x - x2) <= handleSize && Math.abs(y - y2) <= handleSize) return 'bottom-right';

    return null;
  };

  const handleMouseDown = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (selectedBox !== null) {
      const direction = isNearCorner(x, y, prediction.boxes[selectedBox]);
      if (direction) {
        setResizeDirection(direction);
        setIsResizing(true);
        setMousePos({ x, y });
        return;
      }
    }

    // Check if a box is clicked for dragging
    prediction.boxes.forEach((box, index) => {
      const [x1, y1, x2, y2] = box;
      if (x > x1 && x < x2 && y > y1 && y < y2) {
        setSelectedBox(index);
        setMousePos({ x, y });
        setIsDragging(true);
      }
    });
  };
  const handleDeleteBox = () => {
    if (selectedBox === null) return;
  
    setPrediction((prevPrediction) => {
      const updatedBoxes = prevPrediction.boxes.filter((_, index) => index !== selectedBox);
      const updatedLabels = prevPrediction.labels.filter((_, index) => index !== selectedBox);
      
      return {
        ...prevPrediction,
        boxes: updatedBoxes,
        labels: updatedLabels,
      };
    });
  
    setSelectedBox(null);
  };
  

  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - mousePos.x;
    const dy = y - mousePos.y;

    if (isDragging && selectedBox !== null) {
      setPrediction((prevPrediction) => {
        const updatedBoxes = [...prevPrediction.boxes];
        const [x1, y1, x2, y2] = updatedBoxes[selectedBox];
        updatedBoxes[selectedBox] = [x1 + dx, y1 + dy, x2 + dx, y2 + dy];
        return { ...prevPrediction, boxes: updatedBoxes };
      });
    } else if (isResizing && selectedBox !== null && resizeDirection) {
      setPrediction((prevPrediction) => {
        const updatedBoxes = [...prevPrediction.boxes];
        let [x1, y1, x2, y2] = updatedBoxes[selectedBox];
        
        if (resizeDirection === 'top-left') {
          x1 += dx;
          y1 += dy;
        } else if (resizeDirection === 'bottom-right') {
          x2 += dx;
          y2 += dy;
        }
        
        updatedBoxes[selectedBox] = [x1, y1, x2, y2];
        return { ...prevPrediction, boxes: updatedBoxes };
      });
    }

    setMousePos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
  };

  useEffect(() => {
    drawBoundingBoxes();
  }, [prediction, selectedBox]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Upload an Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>

      {selectedFile && (
        <div style={{ marginTop: '20px', position: 'relative' }}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '50%' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      )}
      {selectedBox !== null && (
        <button onClick={handleDeleteBox} style={{ marginTop: '10px' }}>
          Delete Selected Box
        </button>
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
