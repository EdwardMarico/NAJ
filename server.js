require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // อ่าน Token จาก Environment Variables บน Render

// -------------------------------------------------------------
// 0. HEALTH CHECK ROUTE (ป้องกัน Error 404 เมื่อเรียก Root URL)
// -------------------------------------------------------------
app.get('/', (req, res) => {
    res.send('NAJ Backend Server is running successfully!');
});

// -------------------------------------------------------------
// 1. API สำหรับระบบ NOTE LIBRARY (ไฟล์ note-data.json)
// -------------------------------------------------------------
app.post('/api/save-notes', async (req, res) => {
    try {
        const { updatedNotes, commitMessage } = req.body;
        const filePath = "web-data/json/note-data.json";
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;

        // ดึง sha ล่าสุดของไฟล์
        const getRes = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            }
        });

        if (!getRes.ok) throw new Error("ไม่สามารถอ่าน sha จาก GitHub ได้");
        const fileData = await getRes.json();

        // แปลงข้อมูลเป็น Base64 (รองรับภาษาไทย)
        const jsonString = JSON.stringify(updatedNotes, null, 2);
        const updatedContentBase64 = Buffer.from(jsonString).toString('base64');

        // อัปเดตไฟล์กลับไปที่ GitHub API
        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            },
            body: JSON.stringify({
                message: commitMessage || "Update Notes Data",
                content: updatedContentBase64,
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            res.json({ success: true, message: "บันทึก Note เรียบร้อย" });
        } else {
            const err = await putRes.json();
            res.status(500).json({ success: false, error: err });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// -------------------------------------------------------------
// 2. API สำหรับระบบ GAME LIBRARY (ไฟล์ games-data.json)
// -------------------------------------------------------------
app.post('/api/save-games', async (req, res) => {
    try {
        const { updatedGames, commitMessage } = req.body;
        const filePath = "web-data/json/games-data.json";
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;

        // ดึง sha ล่าสุดของไฟล์
        const getRes = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            }
        });

        if (!getRes.ok) throw new Error("ไม่สามารถอ่าน sha จาก GitHub ได้");
        const fileData = await getRes.json();

        // แปลงข้อมูลเป็น Base64 (รองรับภาษาไทย)
        const jsonString = JSON.stringify(updatedGames, null, 2);
        const updatedContentBase64 = Buffer.from(jsonString).toString('base64');

        // อัปเดตไฟล์กลับไปที่ GitHub API
        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            },
            body: JSON.stringify({
                message: commitMessage || "Update Game Library Data",
                content: updatedContentBase64,
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            res.json({ success: true, message: "บันทึกคลังเกมเรียบร้อย" });
        } else {
            const err = await putRes.json();
            res.status(500).json({ success: false, error: err });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// -------------------------------------------------------------
// 3. กำหนด PORT (ดึงจาก Render Environment หรือใช้ 3000 เมื่อรันในเครื่อง)
// -------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));