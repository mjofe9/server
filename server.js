const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let totalRequests = 0;
let keys = [
    { key: "FRX-1QR9SA-HTQ7FE", duration: "Lifetime", active: true }
];
let bannedUsers = [];

// عرض لوحة التحكم الأصلية
app.get('/', (req, res) => {
    totalRequests++;
    res.sendFile(path.join(__dirname, 'index.html'));
});

// إرسال البيانات الحقيقية للوحة التحكم (Stats & Keys)
app.get('/api/stats', (req, res) => {
    res.json({
        totalRequests: totalRequests,
        activeKeysCount: keys.filter(k => k.active).length,
        bannedCount: bannedUsers.length,
        keys: keys
    });
});

// API إضافة وتوليد المفتاح (ربط شغال للزر)
app.post('/api/add-key', (req, res) => {
    const { key, duration } = req.body;
    if (key) {
        keys.push({ key, duration: duration || "Lifetime", active: true });
        res.json({ success: true, message: "تمت إضافة المفتاح بنجاح" });
    } else {
        res.status(400).json({ success: false, message: "مفتاح غير صالح" });
    }
});

// API التحقق من المفتاح داخل اللعبة من روبلوكس (loadstring)
app.get('/api/verify', (req, res) => {
    totalRequests++;
    const key = req.query.key;
    const found = keys.find(k => k.key === key && k.active);
    
    res.setHeader('Content-Type', 'text/plain');

    if (found) {
        res.send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "FRX LUA";
                Text = "تم التحقق من المفتاح بنجاح! أهلاً بك.";
                Duration = 5;
            });
            print("FRX LUA Loaded Successfully!");
        `);
    } else {
        res.status(403).send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "FRX LUA";
                Text = "المفتاح غير صالح أو منتهي!";
                Duration = 5;
            });
            error("Invalid or expired key!");
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
