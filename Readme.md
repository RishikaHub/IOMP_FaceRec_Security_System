# Face Recognition Security System

A sophisticated security system that combines facial recognition with web-based authentication for secure file access and real-time monitoring.

## Features

- **Advanced Face Recognition**
  - Real-time face detection and recognition
  - Anti-spoofing measures with screen detection
  - Face encoding caching for improved performance
  - Support for multiple known faces
  - Unknown face detection with email alerts

- **Security System**
  - JWT-based authentication
  - Secure file access control
  - Email notifications for security events
  - Session management
  - Face verification required for access

- **Web Interface**
  - Modern responsive design
  - User registration and login
  - Real-time face verification
  - File management system
  - Secure file upload/download

## Technology Stack

- **Backend**
  - Python (Flask) for face recognition server
  - Node.js/Express for web server
  - MongoDB for data storage
  - JWT for authentication
  - GridFS for file storage

- **Frontend**
  - HTML5/CSS3
  - JavaScript
  - Responsive design
  - WebRTC for camera access

- **Libraries**
  - OpenCV (cv2)
  - face_recognition
  - dlib
  - numpy
  - bcrypt
  - mongoose

## Prerequisites

- Python 3.x
- Node.js
- MongoDB
- CMake (for dlib installation)
- Webcam
- SMTP server access for email notifications

## Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd IOMP_Home
   ```

2. Install Python dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Install Node.js dependencies:
   ```bash
   cd templates
   npm install
   ```

4. Configure environment variables:
   Create a `.env` file in the templates directory with:
   ```
   JWT_SECRET_KEY=your-secure-key
   MONGODB_URI=your-mongodb-uri
   SESSION_SECRET=your-session-secret
   ```

5. Set up email configuration in `app.py`:
   ```python
   sender_email="your-email@gmail.com"
   email_password="your-app-specific-password"
   ```

## Usage

1. Start the Flask server:
   ```bash
   python app.py
   ```

2. Start the Node.js server:
   ```bash
   cd templates
   node index.js
   ```

3. Access the web interface:
   - Open `http://localhost:8080` for the web interface
   - Create an account or login
   - Complete face verification
   - Access secure files

## Adding Known Faces

1. Add face images to the `dataset_family/` directory
2. Images should be clear frontal faces
3. Name the files with the person's name (e.g., `John.jpg`)
4. The system will automatically encode and cache the faces

## Security Features

- Face recognition with anti-spoofing
- JWT authentication with expiration
- Secure password hashing
- Email notifications for:
  - Unknown face detection
  - Failed verification attempts
  - Successful verifications
  - File access events

## Project Structure

```
IOMP_Home/
├── app.py                 # Flask server & face recognition
├── face_Recog.py         # Face recognition system
├── requirements.txt      # Python dependencies
├── dataset_family/       # Known faces storage
├── templates/           
│   ├── index.js         # Node.js server
│   ├── public/          # Frontend files
│   ├── routes/          # API routes
│   ├── models/          # Database models
│   └── middleware/      # Auth middleware
```

## Error Handling

- See NOTE.txt for common installation issues
- For face_recognition_models errors:
  1. Delete the venv folder
  2. Recreate virtual environment
  3. Install requirements
  4. Install setuptools
- For dlib errors, install CMake and add to PATH

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a pull request

## License

[Your License Here]

## Acknowledgments

- OpenCV and face_recognition libraries
- Node.js and Express communities
- MongoDB and Mongoose teams