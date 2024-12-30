# face_Recog.py
import cv2
import face_recognition
import os
import time
from datetime import datetime

class FaceRecognitionSystem:
    def __init__(self, dataset_path="dataset_family/"):
        self.known_face_encodings = []
        self.known_face_names = []
        self.dataset_path = dataset_path
        self.is_running = False
        self.load_known_faces()
        
    def load_known_faces(self):
        """Load and encode all known faces from the dataset directory"""
        self.known_face_encodings = []
        self.known_face_names = []
        
        for filename in os.listdir(self.dataset_path):
            if filename.endswith((".jpg", ".jpeg", ".png")):
                name = os.path.splitext(filename)[0]
                image_path = os.path.join(self.dataset_path, filename)
                
                try:
                    image = face_recognition.load_image_file(image_path)
                    face_encodings = face_recognition.face_encodings(image)
                    
                    if len(face_encodings) > 0:
                        self.known_face_encodings.append(face_encodings[0])
                        self.known_face_names.append(name)
                    else:
                        print(f"No face found in {filename}")
                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")

    def run_recognition(self):
        """Run the face recognition system"""
        # If already running, destroy existing windows first
        if self.is_running:
            cv2.destroyAllWindows()
            
        self.is_running = True
        video_capture = cv2.VideoCapture(0)
        
        if not video_capture.isOpened():
            print("Error: Could not open video capture device")
            return

        # Set window properties
        cv2.namedWindow('Face Recognition', cv2.WINDOW_NORMAL)
        cv2.setWindowProperty('Face Recognition', cv2.WND_PROP_TOPMOST, 1)
        
        process_this_frame = True
        last_save_time = 0
        
        while self.is_running:
            ret, frame = video_capture.read()
            if not ret:
                break

            # Bring window to front periodically
            cv2.setWindowProperty('Face Recognition', cv2.WND_PROP_TOPMOST, 1)

            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            if process_this_frame:
                face_locations = face_recognition.face_locations(rgb_small_frame)
                face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

                face_names = []
                for face_encoding in face_encodings:
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, 
                        face_encoding,
                        tolerance=0.6
                    )
                    name = "Unknown"

                    if True in matches:
                        first_match_index = matches.index(True)
                        name = self.known_face_names[first_match_index]
                    
                    face_names.append(name)

                current_time = time.time()
                if "Unknown" in face_names and (current_time - last_save_time) >= 30:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    cv2.imwrite(f"unknown_face_{timestamp}.jpg", frame)
                    last_save_time = current_time
                    if os.path.exists("mailme.sh"):
                        os.system('sh mailme.sh')

            process_this_frame = not process_this_frame

            # Draw the results
            for (top, right, bottom, left), name in zip(face_locations, face_names):
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4

                cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
                cv2.putText(frame, name, (left + 6, bottom - 6), 
                           cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)

            # Display the resulting frame
            cv2.imshow('Face Recognition', frame)

            # Quit if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        # Clean up
        video_capture.release()
        cv2.destroyAllWindows()
        self.is_running = False
    
    def stop_recognition(self):
        """Stop the face recognition system"""
        self.is_running = False
        cv2.destroyAllWindows()