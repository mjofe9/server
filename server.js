const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

let keys = [];
let bannedUsers = [];
let scriptsList = [];

app.get('/api/verify', (req, res) => {
    const key = req.query.key;
    const found = keys.find(k => k.key === key && k.active);
    if (found) {
        res.json({ success: true, message: "Key is valid!" });
    } else {
        res.status(403).json({ success: false, message: "Invalid or expired key!" });
    }
});

app.post('/api/add-key', (req, res) => {
    const { key, duration, scriptName } = req.body;
    keys.push({ key, duration, scriptName, active: true });
    res.json({ success: true, message: "Key added successfully!" });
});

app.post('/api/ban', (req, res) => {
    const { userId } = req.body;
    bannedUsers.push(userId);
    res.json({ success: true, message: "User banned successfully!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
