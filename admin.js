const MESSAGES_API = '/api/messages';
const PROJECTS_API = '/api/projects';
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const passwordInput = document.getElementById('admin-password');

// Tab Switching
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-section`).classList.add('active');

    // Load data for the active tab
    if (tab === 'messages') {
        loadMessages();
    } else if (tab === 'projects') {
        loadProjects();
    } else if (tab === 'videos') {
        loadVideosAdmin();
    } else if (tab === 'hero-photos') {
        loadHeroPhotosAdmin();
    } else if (tab === 'resume') {
        loadResume();
    }
}

// Check Authentication
function checkAuth() {
    const password = sessionStorage.getItem('adminPassword');
    if (password) {
        loginModal.style.display = 'none';
        loadMessages(); // Load messages by default
    } else {
        loginModal.style.display = 'flex';
    }
}

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    if (password) {
        sessionStorage.setItem('adminPassword', password);
        loadMessages();
    }
});

// Fetch with Auth
async function fetchWithAuth(url, options = {}) {
    const password = sessionStorage.getItem('adminPassword');
    const headers = {
        ...options.headers,
        'x-admin-password': password
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        sessionStorage.removeItem('adminPassword');
        loginModal.style.display = 'flex';
        loginError.style.display = 'block';
        loginError.textContent = 'Incorrect password or session expired';
        passwordInput.value = '';
        throw new Error('Unauthorized');
    }

    return response;
}

// ==================== MESSAGES FUNCTIONS ====================

async function loadMessages() {
    const container = document.getElementById('messages-container');
    const statsContainer = document.getElementById('stats');

    try {
        const response = await fetchWithAuth(MESSAGES_API);
        let messages = await response.json();

        loginModal.style.display = 'none';
        loginError.style.display = 'none';

        // Update stats
        const totalMessages = messages.length;
        const unreadMessages = messages.filter(m => !m.read).length;
        const todayMessages = messages.filter(m => {
            const msgDate = new Date(m.timestamp).toDateString();
            const today = new Date().toDateString();
            return msgDate === today;
        }).length;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h2>${totalMessages}</h2>
                <p>Total Messages</p>
            </div>
            <div class="stat-card">
                <h2>${unreadMessages}</h2>
                <p>Unread</p>
            </div>
            <div class="stat-card">
                <h2>${todayMessages}</h2>
                <p>Today</p>
            </div>
        `;

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h2>No messages yet</h2>
                    <p>Contact form submissions will appear here</p>
                </div>
            `;
            return;
        }

        messages.sort((a, b) => b.id - a.id);

        container.innerHTML = messages.map(msg => `
            <div class="message-card ${msg.read ? '' : 'unread'}">
                <div class="message-header">
                    <div class="message-info">
                        <h3>${msg.name}</h3>
                        <p><i class="fas fa-envelope"></i> ${msg.email}</p>
                        <p><i class="fas fa-clock"></i> ${msg.timestamp}</p>
                    </div>
                    <div class="message-actions">
                        <button class="icon-btn" onclick="toggleRead(${msg.id})" title="${msg.read ? 'Mark as unread' : 'Mark as read'}">
                            <i class="fas fa-${msg.read ? 'envelope-open' : 'envelope'}"></i>
                        </button>
                        <button class="icon-btn" onclick="replyTo('${msg.email}')" title="Reply">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteMessage(${msg.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="message-body">${msg.message}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
        if (error.message !== 'Unauthorized') {
            container.innerHTML = '<p style="text-align:center; color:red;">Failed to load messages</p>';
        }
    }
}

async function toggleRead(id) {
    try {
        const response = await fetchWithAuth(`${MESSAGES_API}/${id}/read`, { method: 'PATCH' });
        if (response.ok) loadMessages();
    } catch (error) {
        console.error('Error toggling status:', error);
    }
}

async function deleteMessage(id) {
    if (confirm('Are you sure you want to delete this message?')) {
        try {
            const response = await fetchWithAuth(`${MESSAGES_API}/${id}`, { method: 'DELETE' });
            if (response.ok) loadMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
}

function replyTo(email) {
    window.location.href = `mailto:${email}`;
}

function exportToCSV() {
    fetchWithAuth(MESSAGES_API)
        .then(res => res.json())
        .then(messages => {
            if (messages.length === 0) {
                alert('No messages to export');
                return;
            }

            const csv = [
                ['Timestamp', 'Name', 'Email', 'Message', 'Read'],
                ...messages.map(m => [
                    m.timestamp,
                    m.name,
                    m.email,
                    `"${m.message.replace(/"/g, '""')}"`,
                    m.read ? 'Yes' : 'No'
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contact-messages-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
}

// ==================== PROJECTS FUNCTIONS ====================

const projectForm = document.getElementById('project-form');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
let editingProjectId = null;

// Image preview
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Load Projects
async function loadProjects() {
    const container = document.getElementById('projects-container');

    try {
        const response = await fetch(PROJECTS_API);
        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-folder-open"></i>
                    <h2>No Projects Yet</h2>
                    <p>Add your first project using the form above</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-admin-card">
                <div class="project-admin-image" style="background-image: url('${project.image}');"></div>
                <div class="project-admin-content">
                    <h3>${project.title}</h3>
                    <p>${project.description || 'No description'}</p>
                    <a href="${project.projectUrl}" target="_blank" class="project-admin-url">
                        <i class="fas fa-external-link-alt"></i> ${project.projectUrl}
                    </a>
                    <div class="project-admin-actions">
                        <button class="icon-btn" onclick="editProject(${project.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="icon-btn delete" onclick="deleteProject(${project.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Failed to load projects</p>';
    }
}

// Add/Update Project
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('projectUrl', document.getElementById('projectUrl').value);

    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        let response;
        if (editingProjectId) {
            // Update existing project
            response = await fetchWithAuth(`${PROJECTS_API}/${editingProjectId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new project
            response = await fetchWithAuth(PROJECTS_API, {
                method: 'POST',
                body: formData
            });
        }

        if (response.ok) {
            alert(`✅ Project ${editingProjectId ? 'updated' : 'added'} successfully!`);
            cancelEdit();
            loadProjects();
        } else {
            const data = await response.json();
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error saving project:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to save project');
        }
    }
});

// Edit Project
async function editProject(id) {
    try {
        const response = await fetch(PROJECTS_API);
        const projects = await response.json();
        const project = projects.find(p => p.id === id);

        if (project) {
            editingProjectId = id;
            document.getElementById('project-id').value = id;
            document.getElementById('title').value = project.title;
            document.getElementById('description').value = project.description || '';
            document.getElementById('projectUrl').value = project.projectUrl;

            // Show current image
            if (project.image) {
                previewImg.src = project.image;
                imagePreview.style.display = 'block';
            }

            // Update UI
            document.getElementById('form-title').textContent = 'Edit Project';
            document.getElementById('submit-btn-text').textContent = 'Update Project';
            document.getElementById('cancel-btn').style.display = 'block';
            document.getElementById('image-required').textContent = '(optional)';
            imageInput.removeAttribute('required');

            // Scroll to form
            document.querySelector('.project-form').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading project:', error);
    }
}

// Cancel Edit
function cancelEdit() {
    editingProjectId = null;
    projectForm.reset();
    imagePreview.style.display = 'none';
    document.getElementById('form-title').textContent = 'Add New Project';
    document.getElementById('submit-btn-text').textContent = 'Save Project';
    document.getElementById('cancel-btn').style.display = 'none';
    document.getElementById('image-required').textContent = '*';
    imageInput.setAttribute('required', 'required');
}

// Delete Project
async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${PROJECTS_API}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Project deleted successfully!');
            loadProjects();
        } else {
            alert('❌ Failed to delete project');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to delete project');
        }
    }
}

// ==================== VIDEOS FUNCTIONS ====================

const VIDEOS_API = '/api/videos';
const videoForm = document.getElementById('video-form');
let editingVideoId = null;

// Load Videos for Admin
async function loadVideosAdmin() {
    const container = document.getElementById('videos-admin-container');

    try {
        const response = await fetch(VIDEOS_API);
        const videos = await response.json();

        if (videos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-video"></i>
                    <h2>No Videos Yet</h2>
                    <p>Add your first YouTube video using the form above</p>
                </div>
            `;
            return;
        }

        container.innerHTML = videos.map(video => `
            <div class="project-admin-card">
                <div class="project-admin-image" style="background-image: url('${video.thumbnail}');">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.9); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fab fa-youtube" style="color: #FF0000; font-size: 24px;"></i>
                    </div>
                </div>
                <div class="project-admin-content">
                    <h3>${video.title}</h3>
                    <p>${video.description || 'No description'}</p>
                    <a href="${video.videoUrl}" target="_blank" class="project-admin-url">
                        <i class="fab fa-youtube"></i> Watch on YouTube
                    </a>
                    <div class="project-admin-actions">
                        <button class="icon-btn" onclick="editVideo(${video.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="icon-btn delete" onclick="deleteVideo(${video.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading videos:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Failed to load videos</p>';
    }
}

// Add/Update Video
videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const videoData = {
        videoUrl: document.getElementById('video-url').value
    };

    try {
        let response;
        if (editingVideoId) {
            // Update existing video
            response = await fetchWithAuth(`${VIDEOS_API}/${editingVideoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(videoData)
            });
        } else {
            // Create new video
            response = await fetchWithAuth(VIDEOS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(videoData)
            });
        }

        if (response.ok) {
            alert(`✅ Video ${editingVideoId ? 'updated' : 'added'} successfully!`);
            cancelVideoEdit();
            loadVideosAdmin();
        } else {
            const data = await response.json();
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error saving video:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to save video');
        }
    }
});

// Edit Video
async function editVideo(id) {
    try {
        const response = await fetch(VIDEOS_API);
        const videos = await response.json();
        const video = videos.find(v => v.id === id);

        if (video) {
            editingVideoId = id;
            document.getElementById('video-id').value = id;
            document.getElementById('video-url').value = video.videoUrl;

            // Update UI
            document.getElementById('video-form-title').textContent = 'Edit Video';
            document.getElementById('video-submit-btn-text').textContent = 'Update Video';
            document.getElementById('video-cancel-btn').style.display = 'block';

            // Scroll to form
            videoForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading video:', error);
    }
}

// Cancel Video Edit
function cancelVideoEdit() {
    editingVideoId = null;
    videoForm.reset();
    document.getElementById('video-form-title').textContent = 'Add New Video';
    document.getElementById('video-submit-btn-text').textContent = 'Save Video';
    document.getElementById('video-cancel-btn').style.display = 'none';
}

// Delete Video
async function deleteVideo(id) {
    if (!confirm('Are you sure you want to delete this video?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${VIDEOS_API}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Video deleted successfully!');
            loadVideosAdmin();
        } else {
            alert('❌ Failed to delete video');
        }
    } catch (error) {
        console.error('Error deleting video:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to delete video');
        }
    }
}

// ==================== HERO PHOTOS FUNCTIONS ====================

const HERO_PHOTOS_API = '/api/hero-photos';
const heroPhotoForm = document.getElementById('hero-photo-form');
const heroImageInput = document.getElementById('hero-image');
const heroImagePreview = document.getElementById('heroImagePreview');
const heroPreviewImg = document.getElementById('heroPreviewImg');
const heroPositionX = document.getElementById('hero-position-x');
const heroPositionY = document.getElementById('hero-position-y');
const positionXValue = document.getElementById('position-x-value');
const positionYValue = document.getElementById('position-y-value');
const heroPositionPreview = document.getElementById('hero-position-preview');
const heroPositionPreviewImg = document.getElementById('hero-position-preview-img');
let editingHeroPhotoId = null;

// Position slider event listeners
heroPositionX.addEventListener('input', (e) => {
    const value = e.target.value;
    positionXValue.textContent = value;
    updatePositionPreview();
});

heroPositionY.addEventListener('input', (e) => {
    const value = e.target.value;
    positionYValue.textContent = value;
    updatePositionPreview();
});

// Update position preview
function updatePositionPreview() {
    const x = heroPositionX.value;
    const y = heroPositionY.value;
    heroPositionPreviewImg.style.objectPosition = `${x}% ${y}%`;
}

// Image preview for hero photos
heroImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            heroPreviewImg.src = e.target.result;
            heroImagePreview.style.display = 'block';

            // Also update position preview
            heroPositionPreviewImg.src = e.target.result;
            heroPositionPreview.style.display = 'block';
            updatePositionPreview();
        };
        reader.readAsDataURL(file);
    }
});

// Load Hero Photos for Admin
async function loadHeroPhotosAdmin() {
    const container = document.getElementById('hero-photos-admin-container');

    try {
        const response = await fetch(HERO_PHOTOS_API);
        const photos = await response.json();

        if (photos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-images"></i>
                    <h2>No Hero Photos Yet</h2>
                    <p>Add your first hero photo using the form above</p>
                </div>
            `;
            return;
        }

        container.innerHTML = photos.map(photo => `
            <div class="project-admin-card">
                <div class="project-admin-image" style="background-image: url('${photo.image}'); object-fit: cover; object-position: ${photo.positionX || 50}% ${photo.positionY || 50}%;"></div>
                <div class="project-admin-content">
                    <h3>Hero Photo</h3>
                    <p>${photo.alt || 'No description'}</p>
                    <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
                        <i class="fas fa-arrows-alt"></i> Position: ${photo.positionX || 50}% × ${photo.positionY || 50}%
                    </p>
                    <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
                        <i class="fas fa-clock"></i> ${new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                    <div class="project-admin-actions">
                        <button class="icon-btn" onclick="editHeroPhoto(${photo.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="icon-btn delete" onclick="deleteHeroPhoto(${photo.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading hero photos:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Failed to load hero photos</p>';
    }
}

// Edit Hero Photo
async function editHeroPhoto(id) {
    try {
        const response = await fetch(HERO_PHOTOS_API);
        const photos = await response.json();
        const photo = photos.find(p => p.id === id);

        if (photo) {
            editingHeroPhotoId = id;
            document.getElementById('hero-photo-id').value = id;
            document.getElementById('hero-alt').value = photo.alt || '';

            // Set position sliders
            const posX = photo.positionX || 50;
            const posY = photo.positionY || 50;
            heroPositionX.value = posX;
            heroPositionY.value = posY;
            positionXValue.textContent = posX;
            positionYValue.textContent = posY;

            // Show current image in both previews
            if (photo.image) {
                heroPreviewImg.src = photo.image;
                heroImagePreview.style.display = 'block';

                heroPositionPreviewImg.src = photo.image;
                heroPositionPreview.style.display = 'block';
                updatePositionPreview();
            }

            // Update UI
            document.getElementById('hero-photo-form-title').textContent = 'Edit Hero Photo';
            document.getElementById('hero-submit-btn-text').textContent = 'Update Photo';
            document.getElementById('hero-cancel-btn').style.display = 'block';
            document.getElementById('hero-image-required').textContent = '(optional)';
            heroImageInput.removeAttribute('required');

            // Scroll to form
            document.querySelector('.project-form').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading hero photo:', error);
    }
}

// Add/Update Hero Photo
heroPhotoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('alt', document.getElementById('hero-alt').value || 'Hero Photo');
    formData.append('positionX', heroPositionX.value);
    formData.append('positionY', heroPositionY.value);

    if (heroImageInput.files[0]) {
        formData.append('image', heroImageInput.files[0]);
    } else if (!editingHeroPhotoId) {
        alert('Please select an image');
        return;
    }

    try {
        let response;
        if (editingHeroPhotoId) {
            // Update existing hero photo
            response = await fetchWithAuth(`${HERO_PHOTOS_API}/${editingHeroPhotoId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new hero photo
            response = await fetchWithAuth(HERO_PHOTOS_API, {
                method: 'POST',
                body: formData
            });
        }

        if (response.ok) {
            alert(`✅ Hero photo ${editingHeroPhotoId ? 'updated' : 'added'} successfully!`);
            cancelHeroPhotoEdit();
            loadHeroPhotosAdmin();
        } else {
            const data = await response.json();
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error saving hero photo:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to save hero photo');
        }
    }
});

// Cancel Hero Photo Edit
function cancelHeroPhotoEdit() {
    editingHeroPhotoId = null;
    heroPhotoForm.reset();
    heroImagePreview.style.display = 'none';
    heroPositionPreview.style.display = 'none';
    heroPositionX.value = 50;
    heroPositionY.value = 50;
    positionXValue.textContent = '50';
    positionYValue.textContent = '50';
    document.getElementById('hero-photo-form-title').textContent = 'Add New Hero Photo';
    document.getElementById('hero-submit-btn-text').textContent = 'Save Photo';
    document.getElementById('hero-cancel-btn').style.display = 'none';
    document.getElementById('hero-image-required').textContent = '*';
    heroImageInput.setAttribute('required', 'required');
}

// Delete Hero Photo
async function deleteHeroPhoto(id) {
    if (!confirm('Are you sure you want to delete this hero photo?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${HERO_PHOTOS_API}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Hero photo deleted successfully!');
            loadHeroPhotosAdmin();
        } else {
            alert('❌ Failed to delete hero photo');
        }
    } catch (error) {
        console.error('Error deleting hero photo:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to delete hero photo');
        }
    }
}

// Initialize
checkAuth();

// ==================== RESUME FUNCTIONS ====================

const RESUME_API = '/api/resume';
const resumeForm = document.getElementById('resume-form');
const resumeFileInput = document.getElementById('resume-file');
const resumeFilePreview = document.getElementById('resumeFilePreview');
const resumeFileName = document.getElementById('resumeFileName');

// File preview for resume
resumeFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        resumeFileName.textContent = file.name;
        resumeFilePreview.style.display = 'block';
    }
});

// Load Resume
async function loadResume() {
    const container = document.getElementById('current-resume-container');

    try {
        const response = await fetch(RESUME_API);
        const data = await response.json();

        if (data.success && data.data && data.data.path) {
            const resume = data.data;
            container.innerHTML = `
                <div class="project-form" style="padding: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                        <i class="fas fa-file-pdf" style="font-size: 48px; color: var(--accent);"></i>
                        <div style="flex: 1;">
                            <h3 style="color: var(--text-main); margin: 0 0 8px 0;">${resume.filename}</h3>
                            <p style="color: var(--text-muted); margin: 0; font-size: 14px;">
                                <i class="fas fa-clock"></i> Uploaded: ${new Date(resume.uploadedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <a href="${resume.path}" download class="btn" style="flex: 1; text-align: center; text-decoration: none;">
                            <i class="fas fa-download"></i> Download
                        </a>
                        <button class="btn ghost" onclick="deleteResume()" style="flex: 1;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-pdf"></i>
                    <h2>No Resume Uploaded</h2>
                    <p>Upload your resume using the form above</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading resume:', error);
        container.innerHTML = '<p style="text-align:center; color:red;">Failed to load resume</p>';
    }
}

// Upload Resume
resumeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (resumeFileInput.files[0]) {
        formData.append('resume', resumeFileInput.files[0]);
    } else {
        alert('Please select a PDF file');
        return;
    }

    try {
        const response = await fetchWithAuth(RESUME_API, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('✅ Resume uploaded successfully!');
            resumeForm.reset();
            resumeFilePreview.style.display = 'none';
            loadResume();
        } else {
            const data = await response.json();
            alert('❌ Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error uploading resume:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to upload resume');
        }
    }
});

// Delete Resume
async function deleteResume() {
    if (!confirm('Are you sure you want to delete your resume?')) {
        return;
    }

    try {
        const response = await fetchWithAuth(RESUME_API, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Resume deleted successfully!');
            loadResume();
        } else {
            alert('❌ Failed to delete resume');
        }
    } catch (error) {
        console.error('Error deleting resume:', error);
        if (error.message !== 'Unauthorized') {
            alert('❌ Failed to delete resume');
        }
    }
}
