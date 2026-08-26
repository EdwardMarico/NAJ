require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/note-data.json";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // อ่าน Token จาก .env

app.post('/api/save-notes', async (req, res) => {
    try {
        const { updatedNotes, commitMessage } = req.body;
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

        // 1. ดึง sha ล่าสุด (ใช้ Authorization: Bearer ...)
        const getRes = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            }
        });

        if (!getRes.ok) throw new Error("ไม่สามารถอ่าน sha จาก GitHub ได้");
        const fileData = await getRes.json();

        // 2. แปลง JSON เป็น Base64
        const jsonString = JSON.stringify(updatedNotes, null, 2);
        const updatedContentBase64 = Buffer.from(jsonString).toString('base64');

        // 3. ส่งข้อมูลไปอัปเดตบน GitHub (ใช้ Authorization: Bearer ...)
        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": GITHUB_USERNAME
            },
            body: JSON.stringify({
                message: commitMessage,
                content: updatedContentBase64,
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            res.json({ success: true, message: "บันทึกเรียบร้อย" });
        } else {
            const err = await putRes.json();
            res.status(500).json({ success: false, error: err });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Backend Server running on port 3000'));