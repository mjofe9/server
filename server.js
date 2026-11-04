const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// التحقق المباشر بروابط روبلوكس مع إشعارات باسم DIG4
app.get('/api/verify', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`
        game.StarterGui:SetCore("SendNotification", {
            Title = "DIG4 LUA";
            Text = "تم التحقق من المفتاح بنجاح عبر DIG4!";
            Duration = 5;
        });
        print("DIG4 Loaded Successfully!");
    `);
});

app.listen(PORT, () => {
    console.log(`DIG4 Server running on port ${PORT}`);
});
