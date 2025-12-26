const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YourSecurePassword123';
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const VIDEOS_FILE = path.join(__dirname, 'videos.json');
const HERO_PHOTOS_FILE = path.join(__dirname, 'hero-photos.json');

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for JSON file storage
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

// Configure multer for memory storage (files handled in memory before upload to Supabase)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        cb(extname && mimetype ? null : new Error('Only image files allowed!'), extname && mimetype);
    }
});

const uploadResume = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype === 'application/pdf';
        cb(extname && mimetype ? null : new Error('Only PDF files allowed!'), extname && mimetype);
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

console.log('⚡ Using Supabase for Storage & Database');

// Helper: Upload file to Supabase Storage
async function uploadFileToSupabase(file, bucket, folder) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${folder}/${uniqueSuffix}${path.extname(file.originalname)}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        console.error('Supabase Upload Error:', error);
        throw error;
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

    return publicUrlData.publicUrl;
}

// Helper: Extract YouTube ID
const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    password === ADMIN_PASSWORD ? next() : res.status(401).json({ success: false, message: 'Unauthorized' });
};

// ==================== MESSAGES API ====================
app.get('/api/messages', authenticateAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/messages', async (req, res) => {
    const { name, email, message } = req.body;
    const { error } = await supabase
        .from('messages')
        .insert([{ id: Date.now(), name, email, message, read: false }]);

    if (error) return res.status(500).json({ success: false, message: 'Failed to save message' });
    res.status(201).json({ success: true, message: 'Message saved' });
});

app.delete('/api/messages/:id', authenticateAdmin, async (req, res) => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Message deleted' });
});

app.patch('/api/messages/:id/read', authenticateAdmin, async (req, res) => {
    // First fetch to get current status
    const { data: current } = await supabase.from('messages').select('read').eq('id', req.params.id).single();

    const { error } = await supabase
        .from('messages')
        .update({ read: !current.read })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Status updated' });
});

// ==================== PROJECTS API ====================
app.get('/api/projects', async (req, res) => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('createdAt', { ascending: false });

    if (error || !data || data.length === 0) {
        console.log('Supabase failed or empty for projects, falling back to local JSON');
        const projects = readProjectsFromFile();
        projects.sort((a, b) => b.id - a.id);
        return res.json(projects);
    }
    res.json(data);
});

app.post('/api/projects', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadFileToSupabase(req.file, 'portfolio', 'projects');
        }

        const newProject = {
            id: Date.now(),
            title: req.body.title,
            description: req.body.description,
            image: imageUrl,
            projectUrl: req.body.projectUrl,
            order: 0
        };

        const { data, error } = await supabase.from('projects').insert([newProject]).select();

        if (error) throw error;
        res.status(201).json({ success: true, message: 'Project created', data: data[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create project' });
    }
});

app.put('/api/projects/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        let updateData = {
            title: req.body.title,
            description: req.body.description,
            projectUrl: req.body.projectUrl
        };

        if (req.file) {
            updateData.image = await uploadFileToSupabase(req.file, 'portfolio', 'projects');
        }

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json({ success: true, message: 'Project updated', data: data[0] });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update project' });
    }
});

app.delete('/api/projects/:id', authenticateAdmin, async (req, res) => {
    // Note: In a real app we would delete the image from storage too
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Project deleted' });
});

// ==================== VIDEOS API ====================
app.get('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').select('*').order('createdAt', { ascending: false });

    if (error || !data || data.length === 0) {
        console.log('Supabase failed or empty for videos, falling back to local JSON');
        const videos = readVideosFromFile();
        videos.sort((a, b) => b.id - a.id);
        return res.json(videos);
    }
    res.json(data);
});

app.post('/api/videos', authenticateAdmin, async (req, res) => {
    const videoId = extractYouTubeId(req.body.videoUrl);
    const newVideo = {
        id: Date.now(),
        title: req.body.title || '',
        description: req.body.description || '',
        videoUrl: req.body.videoUrl,
        videoId: videoId,
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '',
        order: 0
    };

    const { data, error } = await supabase.from('videos').insert([newVideo]).select();
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.status(201).json({ success: true, message: 'Video added', data: data[0] });
});

app.put('/api/videos/:id', authenticateAdmin, async (req, res) => {
    const videoId = extractYouTubeId(req.body.videoUrl);
    const updateData = {
        title: req.body.title || '',
        description: req.body.description || '',
        videoUrl: req.body.videoUrl,
        videoId: videoId,
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''
    };

    const { data, error } = await supabase.from('videos').update(updateData).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Video updated', data: data[0] });
});

app.delete('/api/videos/:id', authenticateAdmin, async (req, res) => {
    const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Video deleted' });
});

// ==================== HERO PHOTOS API ====================
app.get('/api/hero-photos', async (req, res) => {
    const { data, error } = await supabase.from('hero_photos').select('*').order('createdAt', { ascending: false });

    if (error || !data || data.length === 0) {
        console.log('Supabase failed or empty for hero photos, falling back to local JSON');
        const photos = readHeroPhotosFromFile();
        photos.sort((a, b) => b.id - a.id);
        return res.json(photos);
    }
    res.json(data);
});

app.post('/api/hero-photos', authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadFileToSupabase(req.file, 'portfolio', 'hero');
        }

        const newPhoto = {
            id: Date.now(),
            image: imageUrl,
            alt: req.body.alt || 'Hero Photo',
            positionX: req.body.positionX || 50,
            positionY: req.body.positionY || 50,
            order: 0
        };

        const { data, error } = await supabase.from('hero_photos').insert([newPhoto]).select();
        if (error) throw error;
        res.status(201).json({ success: true, message: 'Hero photo added', data: data[0] });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add photo' });
    }
});

app.delete('/api/hero-photos/:id', authenticateAdmin, async (req, res) => {
    const { error } = await supabase.from('hero_photos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Hero photo deleted' });
});

// ==================== RESUME API ====================
app.get('/api/resume', async (req, res) => {
    const { data, error } = await supabase.from('resume').select('*').single();
    if (error || !data) return res.json({ success: false, message: 'No resume found' });
    res.json({ success: true, data });
});

app.post('/api/resume', authenticateAdmin, uploadResume.single('resume'), async (req, res) => {
    try {
        // First delete existing resume entry if any
        await supabase.from('resume').delete().gt('id', 0);

        let resumeUrl = '';
        if (req.file) {
            resumeUrl = await uploadFileToSupabase(req.file, 'portfolio', 'resume');
        }

        const resumeData = {
            id: Date.now(),
            path: resumeUrl,
            filename: req.file ? req.file.originalname : 'resume.pdf',
        };

        const { data, error } = await supabase.from('resume').insert([resumeData]).select();
        if (error) throw error;
        res.status(201).json({ success: true, message: 'Resume uploaded', data: data[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to upload resume' });
    }
});

app.delete('/api/resume', authenticateAdmin, async (req, res) => {
    const { error } = await supabase.from('resume').delete().gt('id', 0);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Resume deleted' });
});

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
