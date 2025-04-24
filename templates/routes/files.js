const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer = require('multer');
const { loginRequired } = require('../middleware/auth');

let bucket;
mongoose.connection.on('connected', () => {
    bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', loginRequired, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const filename = `${Date.now()}-${req.file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
                userId: req.user._id,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
        uploadStream.end(req.file.buffer);
        uploadStream.on('finish', async () => {
            await mongoose.model('User').findByIdAndUpdate(
                req.user._id,
                { $push: { files: uploadStream.id } }
            );
            res.json({
                message: 'File uploaded successfully',
                fileId: uploadStream.id,
                filename: filename
            });
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Error uploading file' });
    }
});

router.get('/', loginRequired, async (req, res) => {
    try {
        const files = await bucket.find({ 'metadata.userId': req.user._id }).toArray();
        res.json(files.map(file => ({
            id: file._id,
            filename: file.filename,
            originalName: file.metadata.originalName,
            size: file.metadata.size,
            uploadDate: file.uploadDate,
            mimetype: file.metadata.mimetype
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching files' });
    }
});

router.get('/download/:filename', loginRequired, async (req, res) => {
    try {
        const file = await bucket.find({
            'metadata.originalName': req.params.filename,
            'metadata.userId': req.user._id
        }).next();
        if (!file) return res.status(404).json({ message: 'File not found' });
        res.set('Content-Type', file.metadata.mimetype);
        res.set('Content-Disposition', `attachment; filename="${file.metadata.originalName}"`);
        bucket.openDownloadStream(file._id).pipe(res);
    } catch (err) {
        res.status(500).json({ message: 'Error downloading file' });
    }
});

// Assuming this is in your routes/files.js or similar
router.delete('/delete/:fileName', loginRequired, async (req, res) => {
    try {
        const fileName = req.params.fileName;
        
        // Find the file using originalName from the metadata
        const file = await bucket.find({
            'metadata.originalName': fileName
        }).next();

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Verify file ownership
        if (file.metadata.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Delete using the file's _id
        await bucket.delete(file._id);
        
        // Update user record if needed
        await mongoose.model('User').findByIdAndUpdate(
            req.user._id,
            { $pull: { files: file._id } }
        );
        
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: 'Error deleting file' });
    }
});

module.exports = router;