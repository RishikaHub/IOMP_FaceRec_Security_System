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
    console.log("GridFS bucket initialized ✅");
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', loginRequired, upload.single('file'), async (req, res) => {
    try {
        if (!bucket) {
            return res.status(500).json({ message: 'Storage bucket not initialized' });
        }
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

        // Register listener BEFORE ending the stream
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

        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Error uploading file' });
    }
});

router.get('/', loginRequired, async (req, res) => {
    try {
        if (!bucket) return res.status(500).json({ message: 'Storage bucket not initialized' });

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
        console.error("Fetch files error:", err);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

router.get('/download/:filename', loginRequired, async (req, res) => {
    try {
        if (!bucket) return res.status(500).json({ message: 'Storage bucket not initialized' });

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

router.delete('/delete/:fileName', loginRequired, async (req, res) => {
    try {
        if (!bucket) return res.status(500).json({ message: 'Storage bucket not initialized' });

        const file = await bucket.find({
            'metadata.originalName': req.params.fileName,
            'metadata.userId': req.user._id
        }).next();

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        await bucket.delete(file._id);

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
