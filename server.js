const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let totalRequests = 0;
let keys = [
    { key: "DIG4-MASTER-KEY", duration: "Lifetime", active: true }
];
let bannedUsers = [];

// عرض لوحة التحكم
app.get('/', (req, res) => {
    totalRequests++;
    res.sendFile(path.join(__dirname, 'index.html'));
});

// إرسال البيانات للوحة
app.get('/api/keys-list', (req, res) => {
    totalRequests++;
    res.json({
        totalRequests: totalRequests,
        activeKeys: keys.filter(k => k.active).length,
        bannedCount: bannedUsers.length,
        keys: keys
    });
});

// محرك تشفير السكربتات (Obfuscator Engine)
app.post('/api/obfuscate', (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: "No script provided" });

    const bytes = Array.from(Buffer.from(script)).map(b => `\\${b}`).join('');
    const obfuscated = `-- [[ DIG4 PROTECTED OBFUSCATION ]]\nlocal _f = "${bytes}"\nloadstring(string.gsub(_f, "\\\\(%d+)", function(b) return string.char(tonumber(b)) end))()`;
    
    res.json({ obfuscatedScript: obfuscated });
});

// محرك الذكاء الاصطناعي (AI Assistant)
app.post('/api/ai-generate', (req, res) => {
    const { prompt } = req.body;
    let aiResponse = "";

    if (prompt.includes("مفتاح") || prompt.includes("key")) {
        const generatedKey = "DIG4-AI-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        keys.push({ key: generatedKey, duration: "7 Days", active: true });
        aiResponse = `🤖 قام ذكاء DIG4 الاصطناعي بتوليد وتمكين المفتاح التالي: ${generatedKey}`;
    } else if (prompt.includes("سكربت") || prompt.includes("script")) {
        aiResponse = `-- [DIG4 AI Generated Script]\ngame.StarterGui:SetCore("SendNotification", {Title = "DIG4 AI", Text = "تم تنفيذ سكربت الذكاء الاصطناعي بنجاح!"})`;
    } else {
        aiResponse = `🤖 تم معالجة طلبك عبر نظام DIG4 الذكي: "${prompt}".`;
    }

    res.json({ response: aiResponse });
});

// التحقق من المفتاح في اللعبة
app.get('/api/verify', (req, res) => {
    totalRequests++;
    const key = req.query.key;
    const found = keys.find(k => k.key === key && k.active);
    
    res.setHeader('Content-Type', 'text/plain');

    if (found) {
        res.send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA";
                Text = "تم التحقق من المفتاح بنجاح عبر نظام DIG4!";
                Duration = 5;
            });
            print("DIG4 Loaded Successfully!");
        `);
    } else {
        res.status(403).send(`
            game.StarterGui:SetCore("SendNotification", {
                Title = "DIG4 LUA";
                Text = "المفتاح غير صالح أو منتهي!";
                Duration = 5;
            });
            error("Invalid DIG4 key!");
        `);
    }
});

// إضافة مفتاح
app.post('/api/add-key', (req, res) => {
    const { key, duration } = req.body;
    if (key) {
        keys.push({ key, duration, active: true });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`DIG4 Server running on port ${PORT}`);
});
