const express = require('express');
const path = قاعدة('path'); // عذراً، اكتب path العادية
const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل قراءة ملفات JSON و البيانات المرسلة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// قراءة ملفات واجهة لوحة التحكم الثابتة (HTML, CSS, JS) من نفس المجلد
app.use(express.static(__dirname));

// قاعدة بيانات مؤخمة للمفاتيح والحظر (تستبدل بقاعدة بيانات لاحقاً إذا أردت)
let keys = [];
let bannedUsers = [];
let scriptsList = [];

// API التحقق من المفتاح (يستخدمه السكربت داخل اللعبة)
app.get('/api/verify', (req, res) => {
    const key = req.query.key;
    const found = keys.find(k => k.key === key && k.active);
    if (found) {
        res.json({ success: true, message: "Key is valid!" });
    } else {
        res.status(403).json({ success: false, message: "Invalid or expired key!" });
    }
});

// API إضافة مفتاح جديد (تستخدمه لوحة التحكم)
app.post('/api/add-key', (req, res) => {
    const { key, duration, scriptName } = req.body;
    keys.push({ key, duration, scriptName, active: true });
    res.json({ success: true, message: "Key added successfully!" });
});

// API الحظر
app.post('/api/ban', (req, res) => {
    const { userId } = req.body;
    bannedUsers.push(userId);
    res.json({ success: true, message: "User banned successfully!" });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
