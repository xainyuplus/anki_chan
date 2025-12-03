// server.js
const OpenAI = require("openai");
const express = require("express");
const { getDueCards } = require("./ankiconnect");
require("dotenv").config();
const app = express();
app.use(express.json());
const PORT = 3000;
const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
});
let queue = []; // learning queue
async function pushDueCards() {
    const cards = await getDueCards();
    cards.forEach(card => {
        queue.push({
            cardId: card.cards,
            noteId: card.noteId,
            front: card.fields["正面"].value,
            back: card.fields["背面"].value,
            type: card.modelName,
        });
    });
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});
app.get("/next-card", (req, res) => {
    if (queue.length === 0) {
        return res.json({ done: true });
    }
    res.json(queue[0]); // 队头
});
app.get("/deck-length", (req, res) => {
    res.json({ length: queue.length });
});
app.post("/ai-question", async (req, res) => {
    try {
        const { front } = req.body;
        if (!front) {
            return res.status(400).json({ error: "Missing 'front' field" });
        }

        // 调用 DeepSeek Chat Completion
        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",  // 或 "deepseek-chat"（看你实际用哪个）
            temperature: 1.3,
            messages: [
                {
                    role: "system",
                    content:
                        "你是一个名为“Anki酱”的学习伙伴。你的任务是：根据提供给你的一个问题，请你以老师或学伴的身份换一种方式（第一人称）提问用户，用来引导用户主动回忆。你提问时应体现轻微的情境感，你的语气傲娇、傲慢、有一丝丝轻视，但不要夸张、不要动作描写，也不要使用括号中的表演提示（如“歪着头”“眨眼”“～”）。你不会使用颜文字或emoji。注意要求：1. 你只能提出问题，不要解释、不要提示答案。2.不要拟人化动作描写，不要使用“～”“* 动作 *”之类语气。4. 可以使用适当的语气词。"
    },
    {
        role: "user",
            content: "问题是"+"{"+front+"},现在请向用户发问，注意覆盖问题中所有重要信息点",
    }
      ]
});

const question = completion.choices?.[0]?.message?.content?.trim();
return res.json({ question });

  } catch (error) {
    console.error("AI error:", error);
    return res.status(500).json({ error: "AI service error" });
}
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
app.use(express.static("public"));
// 初始加载 due 卡片到队列
pushDueCards();