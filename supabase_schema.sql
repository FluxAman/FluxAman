-- Enable Row Level Security (RLS) is generally good practice, 
-- but for this simple portfolio with a single admin, we will keep it simple or use public policies.

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT PRIMARY KEY, -- We use Date.now() from JS, so BigInt is needed
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT, -- URL from storage
  "projectUrl" TEXT, -- Quoted because of camelCase
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "order" INT DEFAULT 0
);

-- 3. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id BIGINT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "videoUrl" TEXT NOT NULL,
  "videoId" TEXT,
  thumbnail TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "order" INT DEFAULT 0
);

-- 4. HERO PHOTOS TABLE
CREATE TABLE IF NOT EXISTS hero_photos (
  id BIGINT PRIMARY KEY,
  image TEXT NOT NULL,
  alt TEXT DEFAULT 'Hero Photo',
  "positionX" INT DEFAULT 50,
  "positionY" INT DEFAULT 50,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "order" INT DEFAULT 0
);

-- 5. RESUME TABLE (Singleton or Log)
CREATE TABLE IF NOT EXISTS resume (
  id BIGINT PRIMARY KEY,
  path TEXT NOT NULL,
  filename TEXT,
  "uploadedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY POLICIES (Optional but recommended)
-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume ENABLE ROW LEVEL SECURITY;

-- Allow Public READ access to public content
CREATE POLICY "Public Projects are viewable" ON projects FOR SELECT USING (true);
CREATE POLICY "Public Videos are viewable" ON videos FOR SELECT USING (true);
CREATE POLICY "Public Hero Photos are viewable" ON hero_photos FOR SELECT USING (true);
CREATE POLICY "Public Resume is viewable" ON resume FOR SELECT USING (true);

-- Allow Public INSERT for Contact Form (Messages)
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Allow Full Access for Authenticated Users (If using Supabase Auth later)
-- For now, since we use a custom server-side Admin Password, 
-- we will use the SERVICE_ROLE_KEY in our Node.js server to bypass RLS.
-- So we strictly don't *need* policies for the Node server, but RLS protects direct client access.

-- STORAGE BUCKET SETUP (Run this if you can, or use the UI)
-- insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true);

-- STORAGE POLICIES
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'portfolio' );
-- create policy "Authenticated Insert" on storage.objects for insert with check ( bucket_id = 'portfolio' );
