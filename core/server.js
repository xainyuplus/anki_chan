// server.js
const express = require("express");
const { getDueCards } = require("./ankiconnect");

const app = express();
const PORT = 3000;

app.get("/due", async (req, res) => {
  try {
    const data = await getDueCards();
    res.json({
      count: data.length,
      cards: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
