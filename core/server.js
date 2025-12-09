// server.js
const express = require("express");
const anki = require('./ankiconnect');
const app = express();
const callAIChat = require('./ai');
const bodyParser = require("body-parser");
const { loadSettings, saveSettings } = require("./settingsStore");
require("dotenv").config();

app.use(express.json());
const PORT = 3000;


let queue = []; // learning queue


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/main.html");
});


app.post('/api/ai/generate-question', async (req, res) => {
    const { cardFront, apiKeyEnvName, aiUrl, modelName, temperature } = req.body;

    if (!cardFront) {
        return res.json({ success: false, error: 'cardFront missing' });
    }

    try {
        const question = await callAIChat({
            apiKeyEnvName,
            aiUrl,
            modelName,
            temperature,
            messages: [{
                role: "system",
                content:
                    "你是一个名为“Anki酱”的学习伙伴。你的任务是：根据提供给你的一个问题，请你以老师或学伴的身份换一种方式（第一人称）提问用户，用来引导用户主动回忆。你提问时应体现轻微的情境感，你的语气傲娇、有一丝丝轻视，但不要夸张、不要动作描写，也不要使用括号中的表演提示（如“歪着头”“眨眼”“～”）。你不会使用颜文字或emoji。注意要求：1. 你只能提出问题，不要解释、不要提示答案。2.不要拟人化动作描写，不要使用“～”“* 动作 *”之类语气。4. 表达应注意简洁，可以使用适当的语气词。"
            },
            {
                role: "user",
                content: "问题是" + "{" + cardFront + "},现在请向用户发问",
            }]
        });

        res.json({ success: true, question });

    } catch (err) {
        console.error("generate-question error:", err);
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/ai/feedback', async (req, res) => {
    const { cardFront, question, answer, apiKeyEnvName, aiUrl, modelName, temperature } = req.body;

    if (!answer) {
        return res.json({ success: false, error: 'answer missing' });
    }

    try {
        const feedback = await callAIChat({
            apiKeyEnvName,
            aiUrl,
            modelName,
            temperature,
            messages: [
                {
                    role: "system",
                    content:
                        "你是一个名为“Anki酱”的学习伙伴。你的任务是：根据提供的闪卡内容、用户的回答与标准答案，给出第一人称的简短反馈。你的语气带一点傲娇、一丝轻视，但不要夸张，也不要使用括号中的动作描写（如“歪头”“～”）。你不会使用颜文字或emoji。反馈需要：1. 明确指出用户回答的优点；2. 指出哪里可以改进，描述要具体；3. 给出轻度鼓励，语气自然，稍微傲娇但不冒犯。4. 不要复述标准答案全文，也不要替用户重答，只能评价。表达保持简洁、有点别扭的关心感。"
                },
                {
                    role: "user",
                    content:
                        `Flashcard: "${cardFront}"
                        Question asked: "${question}"
                        User answer: "${answer}"
                        Now give feedback to the user.`
                }
            ]

        });

        res.json({ success: true, feedback });

    } catch (err) {
        console.error("feedback error:", err);
        res.json({ success: false, error: err.message });
    }
});

// 获取所有牌组
app.get('/api/decks', async (req, res) => {
    try {
        const decks = await anki.getDecks();
        res.json(decks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 搜索指定卡片 ID 列表

app.post("/api/cards/search", async (req, res) => {
    const { query } = req.body;
    try {
        const cardIds = await anki.findCards(query);
        res.json({ success: true, result: cardIds });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// 获取卡片详细信息
app.post('/api/cards/info', async (req, res) => {
    const { cardIds } = req.body;

    try {
        const cards = await anki.cardsInfo(cardIds);
        //console.log("Fetched cards info:", cards);

        // 后端统一抽取 front 字段，前端不负责解析结构
        const simplified = cards.map(c => ({
            cardId: c.cardId,
            front: c.fields?.Front?.value || Object.values(c.fields)[0]?.value || "No front",
            back: c.fields?.Back?.value || Object.values(c.fields)[1]?.value || "No back",
            queue: c.queue,
            due: c.due,
            nextReviews: c.nextReviews,
            interval: c.interval
        }));

        res.json({ success: true, cards: simplified });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
// GET /api/settings  -> 返回完整 settings JSON
app.get("/api/settings", (req, res) => {
    try {
        const settings = loadSettings();
        res.json(settings);
    } catch (err) {
        console.error("Failed to load settings:", err);
        res.status(500).json({ error: "Failed to load settings" });
    }
});

// POST /api/settings  -> 覆盖 settings
app.post("/api/settings", (req, res) => {
    try {
        const newSettings = req.body;

        // 可以在这里做一点简单校验（可选）
        if (!newSettings || typeof newSettings !== "object") {
            return res.status(400).json({ error: "Invalid settings payload" });
        }

        saveSettings(newSettings);
        res.json({ success: true });
    } catch (err) {
        console.error("Failed to save settings:", err);
        res.status(500).json({ error: "Failed to save settings" });
    }
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
app.use(express.static("public"));
// 初始加载 due 卡片到队列
