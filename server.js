const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// قواعد البيانات المؤقتة في السيرفر
let scriptsList = [
    { name: "BlockSpin Hub", code: "print('BlockSpin Loaded!')" }
];
let keysList = [
    { key: "DIG4-DEMO-KEY", scriptName: "BlockSpin Hub", duration: "Lifetime", active: true }
];

// جلب قائمة السكربتات المضافة
app.get('/api/scripts', (req, res) => {
    res.json(scriptsList);
});

// إضافة سكربت جديد من لوحة التحكم
app.post('/api/add-script', (req, res) => {
    const { name, code } = req.body;
    if(name && code) {
        scriptsList.push({ name, code });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Missing data" });
    }
});

// توليد مفتاح خاص بسكربت معين بالترتيب
app.post('/api/generate-key', (req, res) => {
    const { scriptName, duration } = req.body;
    const newKey = "DIG4-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    keysList.push({
        key: newKey,
        scriptName: scriptName,
        duration: duration,
        active: true
    });

    res.json({ success: true, key: newKey });
});

// التحقق من المفتاح والسكربت وتنفيذ الكود داخل لعبة روبلوكس
app.get('/api/verify', (req, res) => {
    const key = req.query.key;
    const scriptName = req.query.script;

    res.setHeader('Content-Type', 'text/plain');

    // البحث عن المفتاح والسكربت المرتبط به
    const foundKey = keysList.find(k => k.key === key && k.active);
    const targetScript = scriptsList.find(s => s.name === scriptName);

    if (foundKey && targetScript && foundKey.scriptName === scriptName) {
        // إرجاع كود الـ Lua الحقيقي الخاص بالسكربت للعبة مع إشعار DIG4
        res.send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA";
                Text = "تم التحقق من المفتاح بنجاح لـ ${scriptName}!";
                Duration = 5;
            });
            ${targetScript.code}
        `);
    } else {
        res.status(403).send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA";
                Text = "المفتاح غير صالح أو لا يتبع هذا السكربت!";
                Duration = 5;
            });
            error("DIG4: Invalid key or unauthorized script!");
        `);
    }
});

app.listen(PORT, () => {
    console.log(`DIG4 Server running on port ${PORT}`);
});
