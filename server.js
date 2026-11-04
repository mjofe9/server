const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// قراءة ملف index.html وإظهاره في الصفحة الرئيسية (لوحة التحكم)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// مصفوفات التخزين المؤقت للمفاتيح والمحظورين
let keys = [
    { key: "FRX-1QR9SA-HTQ7FE", duration: "Lifetime", scriptName: "Main Script", active: true }
];
let bannedUsers = [];

// API التحقق من المفتاح - يُرجع كود Lua ينفذه روبلوكس
app.get('/api/verify', (req, res) => {
    const key = req.query.key;
    const found = keys.find(k => k.key === key && k.active);
    
    // ضبط صيغة الاستجابة إلى نص صافي يفهمه loadstring
    res.setHeader('Content-Type', 'text/plain');

    if (found) {
        // السكربت الذي سيعمل داخل روبلوكس عند صحة المفتاح
        res.send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "FRX LUA";
                Text = "تم التحقق من المفتاح بنجاح! أهلاً بك.";
                Duration = 5;
            });
            print("FRX LUA Loaded Successfully!");
            
            -- ضَع كود اللعبة أو السكربت الخاص بك هنا:
            -- print("Your Script Running Here")
        `);
    } else {
        // رسالة الخطأ داخل اللعبة عند إدخال مفتاح خاطئ
        res.status(403).send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "FRX LUA";
                Text = "المفتاح غير صالح أو غير مفعل!";
                Duration = 5;
            });
            error("Invalid or expired key!");
        `);
    }
});

// API إضافة مفتاح جديد من لوحة التحكم
app.post('/api/add-key', (req, res) => {
    const { key, duration, scriptName } = req.body;
    keys.push({ key, duration, scriptName, active: true });
    res.json({ success: true, message: "Key added successfully!" });
});

// API حظر مستخدم
app.post('/api/ban', (req, res) => {
    const { userId } = req.body;
    bannedUsers.push(userId);
    res.json({ success: true, message: "User banned successfully!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
