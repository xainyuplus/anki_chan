// server.js
const express = require("express");
const { getDueCards } = require("./ankiconnect");

const app = express();
const PORT = 3000;
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
app.get("/ai-question", (req, res) => {
    
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
app.use(express.static("public"));
// 初始加载 due 卡片到队列
pushDueCards();