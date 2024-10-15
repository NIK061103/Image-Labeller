from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import torch
import cv2
import pymongo
from bson.objectid import ObjectId
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Folder to store uploaded images
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client['image_detection_db']
collection = db['image_details']

# Load YOLOv5 model (or another model)
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
# model = YOLO("/Users/nikhilrajput/Downloads/HackathonP1/image-upload-app/flask-backend/yolov5s.pt")
model.eval()

def detect_objects(image_path):
    image = cv2.imread(image_path)
    results = model(image)

    labels = []
    boxes = []

    # Process results
    for result in results.xyxy[0]:  # results.xyxy[0] gives (x1, y1, x2, y2, confidence, class)
        x1, y1, x2, y2, conf, cls = result
        labels.append(model.names[int(cls)])
        boxes.append([int(x1), int(y1), int(x2), int(y2)])

    return labels, boxes

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Perform object detection
    labels, boxes = detect_objects(filepath)

    # Save details to MongoDB
    image_details = {
        "filename": filename,
        "labels": labels,
        "boxes": boxes
    }
    result = collection.insert_one(image_details)

    # Return the predictions with the inserted ID
    return jsonify({
        "labels": labels,
        "boxes": boxes,
        "image_id": str(result.inserted_id)
    })

@app.route('/update-boxes/<image_id>', methods=['POST'])
def update_boxes(image_id):
    data = request.json
    updated_boxes = data.get('boxes')

    # Update the bounding boxes in MongoDB
    collection.update_one(
        {'_id': ObjectId(image_id)},
        {'$set': {'boxes': updated_boxes}}
    )

    return jsonify({"success": True}), 200


if __name__ == '__main__':
    app.run(port=5000, debug=True)