import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import xss from 'xss';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// security & body
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// rate limit
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
app.use('/api/', apiLimiter);

// static
app.use(express.static('public', { extensions: ['html'] }));

// db
if (!fs.existsSync('db')) fs.mkdirSync('db');
const db = await open({ filename: 'db/core.db', driver: sqlite3.Database });
const schema = fs.readFileSync(path.join('server', 'schema.sql'), 'utf8');
await db.exec(schema);

// uploads
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const maxMB = Number(process.env.UPLOAD_MAX_MB || 8);
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: maxMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                .includes(file.mimetype);
    cb(ok ? null : new Error('INVALID_FILE_TYPE'), ok);
  }
});

// utils
const sanitize = (s) => (typeof s === 'string' ? xss(s.trim()) : '');
const isBot = (hp) => hp && hp.length > 0; // honeypot

// --- API: Contact inquiries ---
app.post('/api/inquiries', async (req, res) => {
  try {
    if (isBot(req.body.company)) return res.status(204).end();

    const name = sanitize(req.body.name);
    const email = sanitize(req.body.email);
    const phone = sanitize(req.body.phone);
    const purpose = sanitize(req.body.purpose);
    const message = sanitize(req.body.message);

    if (!name || !email || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.run(
      `INSERT INTO inquiries(name,email,phone,purpose,message)
       VALUES (?,?,?,?,?)`,
      [name, email, phone, purpose, message]
    );

    return res.json({ message: 'Inquiry received. Thank you!' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- API: Job applications (CV upload) ---
app.post('/api/applications', upload.single('cv'), async (req, res) => {
  try {
    const position = sanitize(req.body.position);
    const fullname = sanitize(req.body.fullname);
    const email = sanitize(req.body.email);

    if (!position || !fullname || !email || !req.file) {
      return res.status(400).json({ error: 'Missing fields or file' });
    }

    await db.run(
      `INSERT INTO applications(position,fullname,email,cv_path)
       VALUES (?,?,?,?)`,
      [position, fullname, email, req.file.path]
    );

    return res.json({ message: 'Application submitted successfully.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// fallback to index.html (optional SPA-ish)
app.get('*', (req, res) => res.sendFile(path.resolve('public/index.html')));

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
