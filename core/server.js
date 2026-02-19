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


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/main.html");
});


app.post('/api/ai/generate-question', async (req, res) => {
    const { roleName = "teacherQuestion", cardFront, cardBack } = req.body;

    if (!cardFront) {
        return res.json({ success: false, error: 'cardFront missing' });
    }

    try {
        const question = await callAIChat({
            roleName,
            variables: { front: cardFront, back: cardBack }
        });

        res.json({ success: true, question });

    } catch (err) {
        console.error("generate-question error:", err);
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/ai/feedback', async (req, res) => {
    const { roleName = "teacherFeedback", cardFront, cardBack, answer, question } = req.body;

    if (!answer) {
        return res.json({ success: false, error: 'answer missing' });
    }

    try {
        const feedback = await callAIChat({
            roleName,
            variables: { front: cardFront, back: cardBack, answer, question }
        });

        res.json({ success: true, feedback });

    } catch (err) {
        console.error("feedback error:", err);
        res.json({ success: false, error: err.message });
    }
});

// 获取所有牌组（过滤 Anki-chan 临时牌组）
app.get('/api/decks', async (req, res) => {
    try {
        const decks = await anki.getDecks();
        // 过滤掉所有 Anki-chan 相关的牌组（包括父牌组和子牌组）
        const filteredDecks = decks.filter(deck =>
            !deck.startsWith('Anki-chan') &&
            deck !== 'Anki-chan'
        );
        res.json(filteredDecks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取所有笔记模板
app.get('/api/models', async (req, res) => {
    try {
        const models = await anki.modelNames();
        res.json({ success: true, models });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 获取所有标签
app.get('/api/tags', async (req, res) => {
    try {
        const tags = await anki.getTags();
        res.json({ success: true, tags });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
        //console.log("Fetched cards info:", cards[0]);

        // 获取所有 note IDs 以便获取标签
        const noteIds = cards.map(c => c.note);
        const notesInfo = await anki.notesInfo(noteIds);

        // 后端统一抽取 front 字段，前端不负责解析结构
        const simplified = cards.map((c, index) => ({
            cardId: c.cardId,
            front: c.fields?.Front?.value || Object.values(c.fields)[0]?.value || "No front",
            back: c.fields?.Back?.value || Object.values(c.fields)[1]?.value || "No back",
            queue: c.queue,
            due: c.due,
            nextReviews: c.nextReviews,
            interval: c.interval,
            flags: c.flags || 0,
            modelName: c.modelName || '',
            tags: notesInfo[index]?.tags || []
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

// Queue 管理 API（单一队列：Anki-chan）
const QUEUE_DECK_NAME = 'Anki-chan';

// 添加卡片到队列
app.post('/api/queue/add-cards', async (req, res) => {
    const { cardIds } = req.body;

    if (!cardIds || cardIds.length === 0) {
        return res.json({ success: false, error: 'Card IDs required' });
    }

    try {
        // 获取卡片当前所属牌组
        const cardsInfo = await anki.cardsInfo(cardIds);

        // 移动卡片到队列
        await anki.changeDeck(cardIds, QUEUE_DECK_NAME);

        // 为每张卡片添加原始牌组标签
        const noteIds = await anki.cardsToNotes(cardIds);

        for (let i = 0; i < cardIds.length; i++) {
            const originalDeck = cardsInfo[i].deckName;
            const noteId = noteIds[i];

            // 添加标签记录原始牌组
            await anki.addTags([noteId], `anki-chan-origin::${originalDeck}`);
        }

        res.json({ success: true, addedCount: cardIds.length });

    } catch (err) {
        console.error('Failed to add cards to queue:', err);
        res.json({ success: false, error: err.message });
    }
});

// 获取队列中的卡片
app.get('/api/queue/cards', async (req, res) => {
    try {
        const cardIds = await anki.findCards(`deck:"${QUEUE_DECK_NAME}"`);
        const cards = await anki.cardsInfo(cardIds);

        const simplified = cards.map(c => ({
            cardId: c.cardId,
            front: c.fields?.Front?.value || Object.values(c.fields)[0]?.value || "No front",
            back: c.fields?.Back?.value || Object.values(c.fields)[1]?.value || "No back",
            queue: c.queue,
            due: c.due
        }));

        res.json({ success: true, cards: simplified });

    } catch (err) {
        console.error('Failed to get queue cards:', err);
        res.json({ success: false, error: err.message });
    }
});

// 从队列中移除单个卡片（移回原牌组）
app.post('/api/queue/remove-card', async (req, res) => {
    const { cardId } = req.body;

    if (!cardId) {
        return res.json({ success: false, error: 'Card ID required' });
    }

    try {
        // 获取卡片信息
        const cardInfo = await anki.cardsInfo([cardId]);
        if (cardInfo.length === 0) {
            return res.json({ success: false, error: 'Card not found' });
        }

        const noteId = cardInfo[0].note;

        // 查找原始牌组标签
        const noteInfo = await anki.notesInfo([noteId]);
        const tags = noteInfo[0].tags;

        let originalDeck = 'Default';
        for (const tag of tags) {
            if (tag.startsWith('anki-chan-origin::')) {
                originalDeck = tag.replace('anki-chan-origin::', '');
                break;
            }
        }

        // 移回原牌组
        await anki.changeDeck([cardId], originalDeck);

        // 清理标签
        await anki.removeTags([noteId], `anki-chan-origin::${originalDeck}`);

        res.json({ success: true });

    } catch (err) {
        console.error('Failed to remove card from queue:', err);
        res.json({ success: false, error: err.message });
    }
});

// Anki GUI 操作：答题
app.post('/api/anki/answer', async (req, res) => {
    const { ease } = req.body; // 1=Again, 2=Hard, 3=Good, 4=Easy

    if (!ease || ease < 1 || ease > 4) {
        return res.json({ success: false, error: 'Invalid ease value' });
    }

    try {
        // 显示答案
        await anki.guiShowAnswer();

        // 等待一小段时间确保 Anki 准备好
        await new Promise(resolve => setTimeout(resolve, 100));

        // 提交答案
        const result = await anki.guiAnswerCard(ease);

        res.json({ success: true, result });

    } catch (err) {
        console.error('Failed to answer card:', err);
        res.json({ success: false, error: err.message });
    }
});

// 在 Anki 中打开牌组复习
app.post('/api/anki/review-deck', async (req, res) => {
    const { deckName } = req.body;

    if (!deckName) {
        return res.json({ success: false, error: 'Deck name required' });
    }

    try {
        const result = await anki.guiDeckReview(deckName);
        res.json({ success: true, result });

    } catch (err) {
        console.error('Failed to start deck review:', err);
        res.json({ success: false, error: err.message });
    }
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
app.use(express.static("public"));
// 初始加载 due 卡片到队列
