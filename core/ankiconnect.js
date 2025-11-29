// anki_chan/core/ankiconnect.js
const axios = require("axios");

const ANKI_URL = "http://127.0.0.1:8765";

// 完全按官方 README 的结构来：{ action, version, params }
async function invoke(action, params = {}) {
  const payload = { action, version: 6, params };

  const res = await axios.post(ANKI_URL, payload, {
    // 不手动 JSON.stringify，交给 axios 处理（它会自动加 Content-Type）
    timeout: 5000,
  });

  const data = res.data;

  if (!("result" in data) || !("error" in data)) {
    throw new Error("Invalid response from AnkiConnect");
  }
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result;
}

// 先写一个版本检查，确认 invoke 是通的
async function getApiVersion() {
  return await invoke("version");
}

// 查询 due 卡片：findCards + cardsInfo（都是文档里的 action）:contentReference[oaicite:1]{index=1}
async function getDueCards() {
  // 1. 找到所有 due 卡片 id
  const ids = await invoke("findCards", { query: "is:due" });
  if (!ids || ids.length === 0) return [];

  // 2. 根据 id 拉取详细信息
  const cards = await invoke("cardsInfo", { cards: ids });
  return cards;
}

module.exports = {
  invoke,
  getApiVersion,
  getDueCards,
};
