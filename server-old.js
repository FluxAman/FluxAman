const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YourSecurePassword123'; // Change this password
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const VIDEOS_FILE = path.join(__dirname, 'videos.json');
const HERO_PHOTOS_FILE = path.join(__dirname, 'hero-photos.json');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/projects/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const heroPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/hero/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

const uploadHeroPhoto = multer({
    storage: heroPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('✅ Using JSON file storage');

// Helper functions for JSON file storage - Messages
const readMessagesFromFile = () => {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error('Error reading messages file:', err);
        return [];
    }
};

const writeMessagesToFile = (messages) => {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing messages file:', err);
        return false;
    }
};

// Helper functions for JSON file storage - Projects
const readProjectsFromFile = () => {
    try {
        if (fs.existsSync(PROJECTS_FILE)) {
            const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error('Error reading projects file:', err);
        return [];
    }
};

const writeProjectsToFile = (projects) => {
    try {
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing projects file:', err);
        return false;
    }
};

// Helper functions for JSON file storage - Videos
const readVideosFromFile = () => {
    try {
        if (fs.existsSync(VIDEOS_FILE)) {
            const data = fs.readFileSync(VIDEOS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error('Error reading videos file:', err);
        return [];
    }
};

const writeVideosToFile = (videos) => {
    try {
        fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing videos file:', err);
        return false;
    }
};

// Helper functions for JSON file storage - Hero Photos
const readHeroPhotosFromFile = () => {
    try {
        if (fs.existsSync(HERO_PHOTOS_FILE)) {
            const data = fs.readFileSync(HERO_PHOTOS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (err) {
        console.error('Error reading hero photos file:', err);
        return [];
    }
};

const writeHeroPhotosToFile = (photos) => {
    try {
        fs.writeFileSync(HERO_PHOTOS_FILE, JSON.stringify(photos, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing hero photos file:', err);
        return false;
    }
};

// Helper function to extract YouTube video ID
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}


// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// API Endpoints

// GET all messages (Protected)
app.get('/api/messages', authenticateAdmin, async (req, res) => {
    try {
        let messages;
        if (isMongoConnected) {
            messages = await Message.find().sort({ id: -1 });
        } else {
            messages = readMessagesFromFile();
            messages.sort((a, b) => b.id - a.id);
        }
        res.json(messages);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST new message (Public)
app.post('/api/messages', async (req, res) => {
    try {
        const newMessageData = {
            id: Date.now(),
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
            timestamp: new Date().toLocaleString(),
            read: false
        };

        if (isMongoConnected) {
            const newMessage = new Message(newMessageData);
            await newMessage.save();
        } else {
            const messages = readMessagesFromFile();
            messages.push(newMessageData);
            writeMessagesToFile(messages);
        }

        res.status(201).json({ success: true, message: 'Message saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE a message (Protected)
app.delete('/api/messages/:id', authenticateAdmin, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);

        if (isMongoConnected) {
            await Message.deleteOne({ id: messageId });
        } else {
            let messages = readMessagesFromFile();
            messages = messages.filter(m => m.id !== messageId);
            writeMessagesToFile(messages);
        }

        res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH mark message as read/unread (Protected)
app.patch('/api/messages/:id/read', authenticateAdmin, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);

        if (isMongoConnected) {
            const message = await Message.findOne({ id: messageId });
            if (message) {
                message.read = !message.read;
                await message.save();
                res.json({ success: true, message: 'Status updated' });
            } else {
                res.status(404).json({ success: false, message: 'Message not found' });
            }
        } else {
            const messages = readMessagesFromFile();
            const message = messages.find(m => m.id === messageId);
            if (message) {
                message.read = !message.read;
                writeMessagesToFile(messages);
                res.json({ success: true, message: 'Status updated' });
            } else {
                res.status(404).json({ success: false, message: 'Message not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== PROJECT API ENDPOINTS ====================

// GET all projects (Public)
app.get('/api/projects', async (req, res) => {
    try {
        let projects;
        if (isMongoConnected) {
            projects = await Project.find().sort({ order: 1, id: -1 });
        } else {
            projects = readProjectsFromFile();
            projects.sort((a, b) => (a.order || 0) - (b.order || 0) || b.id - a.id);
        }
        res.json(projects);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST new project with image upload (Protected)
app.post('/api/projects', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, description, projectUrl } = req.body;
        const imagePath = req.file ? `/uploads/projects/${req.file.filename}` : '';

        const newProjectData = {
            id: Date.now(),
            title,
            description,
            image: imagePath,
            projectUrl,
            createdAt: new Date().toISOString(),
            order: 0
        };

        if (isMongoConnected) {
            const newProject = new Project(newProjectData);
            await newProject.save();
        } else {
            const projects = readProjectsFromFile();
            projects.push(newProjectData);
            writeProjectsToFile(projects);
        }

        res.status(201).json({ success: true, message: 'Project created', data: newProjectData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update project (Protected)
app.put('/api/projects/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const { title, description, projectUrl } = req.body;

        const updateData = {
            title,
            description,
            projectUrl
        };

        // If new image uploaded, update image path
        if (req.file) {
            updateData.image = `/uploads/projects/${req.file.filename}`;
        }

        if (isMongoConnected) {
            const project = await Project.findOne({ id: projectId });
            if (project) {
                // Delete old image if new one uploaded
                if (req.file && project.image) {
                    const oldImagePath = path.join(__dirname, project.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                Object.assign(project, updateData);
                await project.save();
                res.json({ success: true, message: 'Project updated', data: project });
            } else {
                res.status(404).json({ success: false, message: 'Project not found' });
            }
        } else {
            const projects = readProjectsFromFile();
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex !== -1) {
                // Delete old image if new one uploaded
                if (req.file && projects[projectIndex].image) {
                    const oldImagePath = path.join(__dirname, projects[projectIndex].image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                projects[projectIndex] = { ...projects[projectIndex], ...updateData };
                writeProjectsToFile(projects);
                res.json({ success: true, message: 'Project updated', data: projects[projectIndex] });
            } else {
                res.status(404).json({ success: false, message: 'Project not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE project (Protected)
app.delete('/api/projects/:id', authenticateAdmin, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);

        if (isMongoConnected) {
            const project = await Project.findOne({ id: projectId });
            if (project && project.image) {
                const imagePath = path.join(__dirname, project.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            await Project.deleteOne({ id: projectId });
        } else {
            let projects = readProjectsFromFile();
            const project = projects.find(p => p.id === projectId);
            if (project && project.image) {
                const imagePath = path.join(__dirname, project.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            projects = projects.filter(p => p.id !== projectId);
            writeProjectsToFile(projects);
        }

        res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ==================== VIDEOS API ENDPOINTS ====================

// GET all videos (Public)
app.get('/api/videos', async (req, res) => {
    try {
        let videos;
        if (isMongoConnected) {
            videos = await Video.find().sort({ order: 1, id: -1 });
        } else {
            videos = readVideosFromFile();
            videos.sort((a, b) => (a.order || 0) - (b.order || 0) || b.id - a.id);
        }
        res.json(videos);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST new video (Protected)
app.post('/api/videos', authenticateAdmin, async (req, res) => {
    try {
        const { title, description, videoUrl } = req.body;

        // Extract YouTube video ID and generate thumbnail
        const videoId = extractYouTubeId(videoUrl);
        const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

        const newVideoData = {
            id: Date.now(),
            title,
            description,
            videoUrl,
            videoId,
            thumbnail,
            createdAt: new Date().toISOString(),
            order: 0
        };

        if (isMongoConnected) {
            const newVideo = new Video(newVideoData);
            await newVideo.save();
        } else {
            const videos = readVideosFromFile();
            videos.push(newVideoData);
            writeVideosToFile(videos);
        }

        res.status(201).json({ success: true, message: 'Video added', data: newVideoData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update video (Protected)
app.put('/api/videos/:id', authenticateAdmin, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const { title, description, videoUrl } = req.body;

        const videoIdYT = extractYouTubeId(videoUrl);
        const thumbnail = videoIdYT ? `https://img.youtube.com/vi/${videoIdYT}/maxresdefault.jpg` : '';

        const updateData = {
            title,
            description,
            videoUrl,
            videoId: videoIdYT,
            thumbnail
        };

        if (isMongoConnected) {
            const video = await Video.findOne({ id: videoId });
            if (video) {
                Object.assign(video, updateData);
                await video.save();
                res.json({ success: true, message: 'Video updated', data: video });
            } else {
                res.status(404).json({ success: false, message: 'Video not found' });
            }
        } else {
            const videos = readVideosFromFile();
            const videoIndex = videos.findIndex(v => v.id === videoId);
            if (videoIndex !== -1) {
                videos[videoIndex] = { ...videos[videoIndex], ...updateData };
                writeVideosToFile(videos);
                res.json({ success: true, message: 'Video updated', data: videos[videoIndex] });
            } else {
                res.status(404).json({ success: false, message: 'Video not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE video (Protected)
app.delete('/api/videos/:id', authenticateAdmin, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        if (isMongoConnected) {
            await Video.deleteOne({ id: videoId });
        } else {
            let videos = readVideosFromFile();
            videos = videos.filter(v => v.id !== videoId);
            writeVideosToFile(videos);
        }

        res.json({ success: true, message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ==================== HERO PHOTOS API ENDPOINTS ====================

// GET all hero photos (Public)
app.get('/api/hero-photos', async (req, res) => {
    try {
        let photos;
        if (isMongoConnected) {
            photos = await HeroPhoto.find().sort({ order: 1, id: -1 });
        } else {
            photos = readHeroPhotosFromFile();
            photos.sort((a, b) => (a.order || 0) - (b.order || 0) || b.id - a.id);
        }
        res.json(photos);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST new hero photo with image upload (Protected)
app.post('/api/hero-photos', authenticateAdmin, uploadHeroPhoto.single('image'), async (req, res) => {
    try {
        const { alt } = req.body;
        const imagePath = req.file ? `/uploads/hero/${req.file.filename}` : '';

        const newPhotoData = {
            id: Date.now(),
            image: imagePath,
            alt: alt || 'Hero Photo',
            createdAt: new Date().toISOString(),
            order: 0
        };

        if (isMongoConnected) {
            const newPhoto = new HeroPhoto(newPhotoData);
            await newPhoto.save();
        } else {
            const photos = readHeroPhotosFromFile();
            photos.push(newPhotoData);
            writeHeroPhotosToFile(photos);
        }

        res.status(201).json({ success: true, message: 'Hero photo added', data: newPhotoData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update hero photo (Protected)
app.put('/api/hero-photos/:id', authenticateAdmin, uploadHeroPhoto.single('image'), async (req, res) => {
    try {
        const photoId = parseInt(req.params.id);
        const { alt } = req.body;

        const updateData = {
            alt: alt || 'Hero Photo'
        };

        // If new image uploaded, update image path
        if (req.file) {
            updateData.image = `/uploads/hero/${req.file.filename}`;
        }

        if (isMongoConnected) {
            const photo = await HeroPhoto.findOne({ id: photoId });
            if (photo) {
                // Delete old image if new one uploaded
                if (req.file && photo.image) {
                    const oldImagePath = path.join(__dirname, photo.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                Object.assign(photo, updateData);
                await photo.save();
                res.json({ success: true, message: 'Hero photo updated', data: photo });
            } else {
                res.status(404).json({ success: false, message: 'Hero photo not found' });
            }
        } else {
            const photos = readHeroPhotosFromFile();
            const photoIndex = photos.findIndex(p => p.id === photoId);
            if (photoIndex !== -1) {
                // Delete old image if new one uploaded
                if (req.file && photos[photoIndex].image) {
                    const oldImagePath = path.join(__dirname, photos[photoIndex].image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                photos[photoIndex] = { ...photos[photoIndex], ...updateData };
                writeHeroPhotosToFile(photos);
                res.json({ success: true, message: 'Hero photo updated', data: photos[photoIndex] });
            } else {
                res.status(404).json({ success: false, message: 'Hero photo not found' });
            }
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE hero photo (Protected)
app.delete('/api/hero-photos/:id', authenticateAdmin, async (req, res) => {
    try {
        const photoId = parseInt(req.params.id);

        if (isMongoConnected) {
            const photo = await HeroPhoto.findOne({ id: photoId });
            if (photo && photo.image) {
                const imagePath = path.join(__dirname, photo.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            await HeroPhoto.deleteOne({ id: photoId });
        } else {
            let photos = readHeroPhotosFromFile();
            const photo = photos.find(p => p.id === photoId);
            if (photo && photo.image) {
                const imagePath = path.join(__dirname, photo.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            photos = photos.filter(p => p.id !== photoId);
            writeHeroPhotosToFile(photos);
        }

        res.json({ success: true, message: 'Hero photo deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// Fallback: Serve index.html for unknown routes (useful for SPA behavior)
// IMPORTANT: This must be the LAST route defined
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
});
