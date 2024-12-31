# app.py
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from face_Recog import FaceRecognitionSystem
import threading
import cv2
import os

app = Flask(__name__, static_folder='templates/public')
CORS(app)

# Initialize face recognition system
face_system = FaceRecognitionSystem(
    dataset_path="dataset_family/",
    sender_email="gaddamlokesh20@gmail.com",
    recipient_email="rishikabussa31@gmail.com",
    email_password="fewb zzgt kufv bpep"
)

recognition_thread = None
is_recognition_running = False

@app.route('/')
def index():
    return send_from_directory('templates/public', 'index.html')

@app.route('/start_recognition')
def start_recognition():
    global recognition_thread, is_recognition_running
    
    # Check if email password is configured
    if not face_system.email_password:
        return jsonify({
            "status": "error", 
            "message": "Email password not configured in face recognition system."
        })
    
    # If recognition is already running, stop it first
    if is_recognition_running:
        face_system.stop_recognition()
        if recognition_thread:
            recognition_thread.join(timeout=1)
        cv2.destroyAllWindows()
    
    # Start new recognition thread
    is_recognition_running = True
    recognition_thread = threading.Thread(target=face_system.run_recognition)
    recognition_thread.daemon = True
    recognition_thread.start()
    return jsonify({"status": "success", "message": "Face recognition started"})

@app.route('/stop_recognition')
def stop_recognition():
    global is_recognition_running
    if is_recognition_running:
        face_system.stop_recognition()
        is_recognition_running = False
        cv2.destroyAllWindows()
        return jsonify({"status": "success", "message": "Face recognition stopped"})
    return jsonify({"status": "warning", "message": "Face recognition is not running"})

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('templates/public', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True, use_reloader=False)