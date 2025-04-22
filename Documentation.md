# Face Recognition Security System Documentation

## Core Components

## 1. Core Face Recognition System
The FaceRecognitionSystem class serves as the foundation of our facial recognition security system. It handles face detection, recognition, and anti-spoofing measures. Key features include:
- Dataset management for known faces
- Face encoding caching for improved performance
- Email notification system for security alerts
- Configurable face recognition tolerance
- Screen detection to prevent photo-based spoofing

```python
class FaceRecognitionSystem:
    def __init__(self, dataset_path="dataset_family/", 
                 sender_email=None,
                 recipient_email=None,
                 email_password=None):
        self.known_face_encodings = []
        self.known_face_names = []
        self.dataset_path = dataset_path
        self.is_running = False
        self.cache_file = "face_encodings_cache.pkl"
        self.cache_metadata_file = "face_encodings_metadata.pkl"
        
        # Email configuration
        self.sender_email = sender_email
        self.recipient_email = recipient_email
        self.email_password = email_password
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        
        # Face recognition settings
        self.known_face_tolerance = 0.6  # Keep lenient face matching

        # Very lenient screen detection threshold
        self.screen_pattern_threshold = 200  # Threshold for screen detection
        
        # Initialize face encodings
        self.load_known_faces()
```

<div style="page-break-after: always;"></div>

## 2. Face Verification Logic
The verify_face method implements the core verification algorithm with sophisticated anti-spoofing measures. Features include:
- RGB image conversion for accurate face detection
- Screen detection with confidence threshold
- Multiple face confidence calculations
- Detailed logging for security auditing
- Error handling with descriptive messages

```python
def verify_face(self, image_data):
    """Verify a face against known faces with minimal screen detection"""
    try:
        # Convert image to RGB format
        if isinstance(image_data, np.ndarray):
            rgb_image = cv2.cvtColor(image_data, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image_data

        # Quick check for obvious screens with high confidence
        is_screen, screen_confidence = self.check_for_screen(image_data)
        logger.info(f"Screen confidence: {screen_confidence:.2f}%")
        
        # Use strict floating point comparison for 60% threshold
        if float(screen_confidence) > 60.0 or abs(float(screen_confidence) - 60.0) < 0.0001:
            logger.warning(f"Screen detected with {screen_confidence:.2f}% confidence - Access Denied")
            return None, f"Access denied - Screen display detected ({screen_confidence:.1f}% confidence)"

        # Get face locations
        face_locations = face_recognition.face_locations(rgb_image)
        if not face_locations:
            logger.warning("No face detected in the image")
            return None, "No face detected"

        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        if not face_encodings:
            logger.warning("Could not encode face from the image")
            return None, "Could not encode face"

        # Compare with known faces with lenient matching
        matches = face_recognition.compare_faces(
            self.known_face_encodings,
            face_encodings[0],
            tolerance=self.known_face_tolerance
        )

        # Calculate face confidence for all known faces
        face_distances = face_recognition.face_distance(self.known_face_encodings, face_encodings[0])
        face_confidences = [(1 - dist) * 100 for dist in face_distances]
        
        if True in matches:
            best_match_index = matches.index(True)
            name = self.known_face_names[best_match_index]
            confidence = face_confidences[best_match_index]
            logger.info(f"Face recognition - Name: {name}, Confidence: {confidence:.2f}%")
            logger.info(f"All face confidences: {', '.join([f'{name}: {conf:.2f}%' for name, conf in zip(self.known_face_names, face_confidences)])}")
            return name, None
        else:
            if face_confidences:
                best_confidence = max(face_confidences)
                logger.info(f"Best non-matching face confidence: {best_confidence:.2f}%")
            logger.warning("Face not recognized")
            return None, "Face not recognized"

    except Exception as e:
        logger.error(f"Error during face verification: {str(e)}")
        return None, str(e)
```

<div style="page-break-after: always;"></div>

## 3. Real-time Face Recognition
The run_recognition method provides continuous face monitoring capabilities. Key features:
- Live video capture and processing
- Face location detection and tracking
- Unknown face detection with email alerts
- Visual feedback with confidence scores
- Resource cleanup on termination

```python
def run_recognition(self):
    """Run the face recognition system"""
    if self.is_running:
        cv2.destroyAllWindows()
        
    self.is_running = True
    video_capture = cv2.VideoCapture(0)
    
    if not video_capture.isOpened():
        logger.error("Error: Could not open video capture device")
        return

    cv2.namedWindow('Face Recognition', cv2.WINDOW_NORMAL)
    cv2.setWindowProperty('Face Recognition', cv2.WND_PROP_TOPMOST, 1)
    
    process_this_frame = True
    last_save_time = 0
    
    while self.is_running:
        ret, frame = video_capture.read()
        if not ret:
            logger.error("Error reading frame from video capture")
            break

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        if process_this_frame:
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

            face_names = []
            face_confidences = []
            
            # Only check for screen if we detect a face
            is_screen = False
            if face_encodings:
                is_screen, screen_conf = self.check_for_screen(frame)
                if float(screen_conf) > 60.0 or abs(float(screen_conf) - 60.0) < 0.0001:
                    face_names = ["Screen Detected"] * len(face_encodings)
                    face_confidences = [screen_conf] * len(face_encodings)
                    continue

            for face_encoding in face_encodings:
                matches = face_recognition.compare_faces(
                    self.known_face_encodings, 
                    face_encoding,
                    tolerance=self.known_face_tolerance
                )
                name = "Unknown"
                confidence = 100

                if True in matches:
                    best_match_index = matches.index(True)
                    name = self.known_face_names[best_match_index]
                
                face_names.append(name)
                face_confidences.append(confidence)

            # Save unknown faces for email notification
            current_time = time.time()
            if "Unknown" in face_names and (current_time - last_save_time) >= 30:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                image_path = f"unknown_face_{timestamp}.jpg"
                cv2.imwrite(image_path, frame)
                self.send_unknown_face_email(image_path)
                last_save_time = current_time

        process_this_frame = not process_this_frame

        # Draw the results
        for (top, right, bottom, left), name, confidence in zip(face_locations, face_names, face_confidences):
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            display_text = f"{name} ({confidence:.1f}%)"
            
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, display_text, (left + 6, bottom - 6), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)

        cv2.imshow('Face Recognition', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()
    self.is_running = False
```

<div style="page-break-after: always;"></div>

## Backend Components

## 4. Flask Backend API
The Flask backend serves as the bridge between the frontend and the face recognition system. Features:
- CORS configuration for security
- JWT-based authentication
- Face recognition system initialization
- Secure email configuration

```python
app = Flask(__name__, static_folder='templates/public')
app.secret_key = JWT_SECRET_KEY

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080", "http://localhost:5050"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize face recognition system
face_system = FaceRecognitionSystem(
    dataset_path="dataset_family/",
    sender_email="rishikabussa31@gmail.com",
    recipient_email=None,
    email_password="fewb zzgt kufv bpep"
)
```

<div style="page-break-after: always;"></div>

## 5. Face Verification API Endpoint
The verify_face endpoint handles face verification requests with comprehensive security measures:
- JWT token validation
- Base64 image processing
- Temporary file management
- Error handling with appropriate status codes
- Email notifications for verification attempts

```python
@app.route('/api/verify-face', methods=['POST'])
def verify_face():
    # Get JWT token from header
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        logger.warning("No authorization header provided")
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
    
    try:
        # Verify token using the same secret key as Node.js
        token = auth_header.split(' ')[1]
        user_data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_email = user_data.get('email')
        
        if not user_email:
            logger.warning("No email found in token")
            return jsonify({"status": "error", "message": "Invalid token"}), 401
        
        # Get the base64 image from the request
        try:
            image_data = request.json.get('image').split(',')[1]
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            logger.error(f"Error processing image data: {str(e)}")
            face_system.send_file_access_notification(
                None,
                user_email,
                "Unknown",
                message="Failed verification attempt - Invalid image data"
            )
            return jsonify({"status": "error", "message": "Error processing image. Please try again."}), 400
        
        # Save the captured image temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_image_path = f"face_capture_{timestamp}.jpg"
        
        try:
            with open(temp_image_path, "wb") as f:
                f.write(image_bytes)
            
            image_np = cv2.imread(temp_image_path)
            if image_np is None:
                face_system.send_file_access_notification(
                    temp_image_path,
                    user_email,
                    "Unknown",
                    message="Failed verification attempt - Could not process image"
                )
                return jsonify({"status": "error", "message": "Error processing image. Please try again."}), 400
            
            # Verify face
            name, error = face_system.verify_face(image_np)
            
            if error:
                logger.warning(f"Face verification failed: {error}")
                face_system.send_file_access_notification(
                    temp_image_path,
                    user_email,
                    "Unknown",
                    message=f"Failed verification attempt - {error}"
                )
                
                if "Access denied" in error:
                    return jsonify({"status": "error", "message": error}), 400
                elif error == "No face detected":
                    return jsonify({"status": "error", "message": "No face detected. Please ensure your face is visible in the camera."}), 400
                else:
                    return jsonify({"status": "error", "message": "You don't have access to system. Mail has been sent to your email."}), 400

            # Success notification
            face_system.send_file_access_notification(
                temp_image_path,
                user_email,
                name,
                message="Successful verification"
            )
            
            return jsonify({
                "status": "success",
                "message": "Face verified",
                "name": name
            })
            
        finally:
            if os.path.exists(temp_image_path):
                try:
                    os.remove(temp_image_path)
                except Exception as e:
                    logger.error(f"Error removing temporary file: {str(e)}")
                
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        return jsonify({"status": "error", "message": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        logger.warning("Invalid JWT token")
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        logger.error(f"Unexpected error in verify_face: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred"
        }), 500
```

<div style="page-break-after: always;"></div>

## Authentication System

## 6. User Authentication System
The authentication routes handle user registration and login with secure token generation:
- Email/password validation
- JWT token generation with expiration
- Error handling for duplicate emails
- Last login tracking
- Secure password comparison

```javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../models');

router.post('/signup', async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password are required"
            });
        }

        if (!process.env.JWT_SECRET_KEY) {
            console.error('JWT_SECRET_KEY not configured');
            return res.status(500).json({
                status: "error",
                message: "Server configuration error"
            });
        }

        // Create user
        const user = await db.User.create({
            email: req.body.email,
            password: req.body.password
        });

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            status: "success",
            token,
            email: user.email,
            message: "User created successfully"
        });
    } catch (err) {
        console.error('Signup error:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                status: "error",
                message: "Email already taken"
            });
        }
        return res.status(500).json({
            status: "error",
            message: "Error creating user"
        });
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const user = await db.User.findOne({ email: req.body.email });
        if (!user) {
            return next({
                status: 400,
                message: "Invalid Email/Password"
            });
        }
        
        const isMatch = await user.comparePassword(req.body.password);
        
        if (isMatch) {
            user.lastLogin = new Date();
            await user.save();

            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email,
                    lastLogin: user.lastLogin 
                },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1d' }
            );
            
            return res.status(200).json({
                status: "success",
                token,
                email: user.email,
                message: "Logged in successfully"
            });
        } else {
            return next({
                status: 400,
                message: "Invalid Email/Password"
            });
        }
    } catch (err) {
        return next(err);
    }
});
```

<div style="page-break-after: always;"></div>

## 7. User Model Schema
The User model defines the database structure for user accounts with security features:
- Unique email constraint
- Password hashing with bcrypt
- File association tracking
- Login history
- Verification status

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    files: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'files.files'
    }],
    lastLogin: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

userSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('password')) {
            return next();
        }
        const hashedPassword = await bcrypt.hash(this.password, 10);
        this.password = hashedPassword;
        return next();
    } catch (err) {
        return next(err);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (err) {
        throw err;
    }
};

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
```

<div style="page-break-after: always;"></div>

## Frontend Components

## 8. Frontend Login Interface
The login interface provides a user-friendly authentication experience:
- Material design components
- Form validation
- Toggle between login/register
- Loading indicators
- Error messaging

```html
<div class="auth-container">
    <div class="header-container">
        <img src="images/AIclub_logo.jfif" alt="Logo" class="header-logo">
        <h1 class="header-title">File Access System</h1>
    </div>

    <form id="loginForm">
        <h3 class="text-center">Welcome Back</h3>
        <div class="form-group">
            <label><i class="material-icons">email</i> Email</label>
            <input type="email" name="email" class="form-control" required>
        </div>
        <div class="form-group">
            <label><i class="material-icons">lock</i> Password</label>
            <input type="password" name="password" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary">
            <span class="loader" id="loginLoader"></span>
            <span class="btn-text">Login</span>
        </button>
        <div class="auth-toggle">
            <p>Don't have an account? <a href="#" id="showRegister">Register</a></p>
        </div>
    </form>

    <form id="registerForm" style="display: none;">
        <h3 class="text-center">Create Account</h3>
        <div class="form-group">
            <label><i class="material-icons">email</i> Email</label>
            <input type="email" name="email" class="form-control" required>
        </div>
        <div class="form-group">
            <label><i class="material-icons">lock</i> Password</label>
            <input type="password" name="password" class="form-control" required>
        </div>
        <div class="form-group">
            <label><i class="material-icons">lock_outline</i> Confirm Password</label>
            <input type="password" name="confirmPassword" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary">
            <span class="loader" id="registerLoader"></span>
            <span class="btn-text">Register</span>
        </button>
        <div class="auth-toggle">
            <p>Already have an account? <a href="#" id="showLogin">Login</a></p>
        </div>
    </form>
</div>
```

<div style="page-break-after: always;"></div>

## 9. Frontend Authentication Logic
Client-side authentication handling with secure token management:
- Form data processing
- Token storage in localStorage
- Redirect after successful login
- Error handling with user feedback
- Loading state management

```javascript
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(loginLoader);
    const formData = new FormData(e.target);
    try {
        const response = await fetch('http://localhost:8080/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            window.location.href = '/verify-face.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        alert('An error occurred during login');
        console.error('Login error:', error);
    } finally {
        hideLoader(loginLoader);
    }
});
```

<div style="page-break-after: always;"></div>

## Security Middleware

## 10. Authentication Middleware
The loginRequired middleware ensures secure route access:
- Token extraction and validation
- User existence verification
- Request augmentation with user data
- Proper error responses

```javascript
const jwt = require('jsonwebtoken');
const db = require('../models');

exports.loginRequired = async function(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await db.User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
```

<div style="page-break-after: always;"></div>

## Server Configuration

## 11. Express Server Setup
The main server configuration with security and performance optimizations:
- Body parsing middleware
- CORS configuration
- Session management
- Static file serving
- Error handling

```javascript
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const eventRoutes = require("./routes/events");
const fileRoutes = require("./routes/files");
const session = require("express-session");
const authRoutes = require("./routes/auth");
require('dotenv').config();

const port = process.env.PORT || 8080;

// Initialize MongoDB connection via models/index.js
require('./models');

app.use('/', express.static('public'));
app.set('view engine', 'html');

// Configure middleware
app.use(bodyParser.json());
app.use(cors({
    origin: ['http://localhost:5050', 'http://localhost:8080'],
    credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// API Routes
app.use("/api/events", eventRoutes);
app.use("/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Error handling
app.use((req, res, next) => {
    let err = new Error("NOT FOUND");
    err.status = 404;
    next(err);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
```

<div style="page-break-after: always;"></div>

## File Management System

## 12. File Model Schema
The File model manages document metadata and access control:
- Filename validation
- Size tracking
- Owner association
- GridFS integration
- Public/private access control

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    path: String,
    size: Number,
    uploadDate: {
        type: Date,
        default: Date.now
    },
    mimetype: String,
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gridfs_id: Schema.Types.ObjectId,
    isPublic: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('File', fileSchema);
```

<div style="page-break-after: always;"></div>

## 13. File Upload Configuration
The file upload system uses GridFS for efficient large file handling:
- Multer middleware configuration
- GridFS storage setup
- File metadata tracking
- User association
- Error handling

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { loginRequired } = require('../middleware/auth');
const db = require('../models');

// Configure GridFS storage
const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return {
            filename: file.originalname,
            bucketName: 'uploads'
        };
    }
});

const upload = multer({ storage });

// File upload endpoint
router.post('/upload', loginRequired, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileDoc = await db.File.create({
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            gridfs_id: req.file.id,
            owner: req.user._id
        });

        // Add file reference to user
        await db.User.findByIdAndUpdate(
            req.user._id,
            { $push: { files: fileDoc._id } }
        );

        res.json({
            status: 'success',
            message: 'File uploaded successfully',
            file: fileDoc
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'File upload failed'
        });
    }
});
```

<div style="page-break-after: always;"></div>

## 14. File Download Implementation
Secure file download implementation with access control:
- File existence verification
- Ownership validation
- GridFS streaming
- Content-Type handling
- Download headers

```javascript
router.get('/download/:fileId', loginRequired, async (req, res) => {
    try {
        const file = await db.File.findById(req.params.fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check if user has access to file
        if (file.owner.toString() !== req.user._id.toString() && !file.isPublic) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });

        const downloadStream = bucket.openDownloadStream(file.gridfs_id);
        res.set('Content-Type', file.mimetype);
        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
        
        downloadStream.pipe(res);
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'File download failed'
        });
    }
});
```

<div style="page-break-after: always;"></div>

## 15. List User Files
File listing functionality with efficient data loading:
- User file population
- MongoDB aggregation
- Error handling
- Success response formatting

```javascript
router.get('/list', loginRequired, async (req, res) => {
    try {
        const user = await db.User.findById(req.user._id)
            .populate('files');
        
        res.json({
            status: 'success',
            files: user.files
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Could not retrieve files'
        });
    }
});
```

<div style="page-break-after: always;"></div>

## 16. Delete File
Secure file deletion with proper cleanup:
- Ownership verification
- GridFS cleanup
- User reference removal
- Database document deletion
- Transaction handling

```javascript
router.delete('/:fileId', loginRequired, async (req, res) => {
    try {
        const file = await db.File.findById(req.params.fileId);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Verify ownership
        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Remove from GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
        await bucket.delete(file.gridfs_id);

        // Remove from user's files array
        await db.User.findByIdAndUpdate(
            req.user._id,
            { $pull: { files: file._id } }
        );

        // Delete file document
        await file.remove();

        res.json({
            status: 'success',
            message: 'File deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Could not delete file'
        });
    }
});
```