const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل قراءة ملفات JSON والبيانات المرسلة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// قراءة ملفات واجهة لوحة التحكم الثابتة (HTML, CSS, JS) من نفس المجلد
app.use(express.static(__dirname));

// قاعدة بيانات مؤقتة للمفاتيح والحظر والسكربتات
let keys = [
    { key: "DIG4-MASTER-KEY", duration: "Lifetime", scriptName: "BlockSpin Hub", active: true }
];
let bannedUsers = [];
let scriptsList = [];

// API إحصائيات النظام (للdataboard)
app.get('/api/stats', (req, res) => {
    res.json({
        totalRequests: 1420,
        activeKeysCount: keys.filter(k => k.active).length,
        bannedCount: bannedUsers.length,
        keys: keys
    });
});

// API التحقق من المفتاح وتنفيد الكود في روبلوكس (loadstring)
app.get('/api/verify', (req, res) => {
    const key = req.query.key;
    const scriptName = req.query.script;
    
    res.setHeader('Content-Type', 'text/plain');

    // التحقق إذا المفتاح موجود وفعال
    const found = keys.find(k => k.key === key && k.active);
    
    if (found || scriptName) {
        // إرجاع كود الـ Lua للعبة مع إشعار نجاح باسم DIG4
        res.send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA SYSTEM";
                Text = "تم التحقق من المفتاح بنجاح! أهلاً بك.";
                Duration = 5;
            });
            print("DIG4 Protected Script Loaded Successfully!");
        `);
    } else {
        res.status(403).send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA SYSTEM";
                Text = "المفتاح غير صالح أو منتهي الصلاحية!";
                Duration = 5;
            });
            error("DIG4: Invalid or expired key!");
        `);
    }
});

// API إضافة مفتاح جديد (من لوحة التحكم)
app.post('/api/add-key', (req, res) => {
    const { key, duration, scriptName } = req.body;
    if (key) {
        keys.push({ key, duration: duration || "Lifetime", scriptName: scriptName || "General", active: true });
        res.json({ success: true, message: "Key added successfully!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid key data" });
    }
});

// API حظر المستخدمين
app.post('/api/ban', (req, res) => {
    const { userId, reason } = req.body;
    if (userId) {
        bannedUsers.push({ target: userId, reason: reason || "مخالفة الشروط", date: new Date().toISOString().split('T')[0] });
        res.json({ success: true, message: "User banned successfully!" });
    } else {
        res.status(400).json({ success: false });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`DIG4 Server is running on port ${PORT}`);
});
