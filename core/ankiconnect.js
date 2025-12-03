// invoke.js
const ANKI_URL = "http://127.0.0.1:8765";

async function invoke(action, params = {}) {
  const payload = {
    action,
    version: 6,
    params,
  };

  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // network-level error
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.result;
}

// 查询 due 卡片 + 对应 note 信息
async function getDueCards() {
  const cardIds = await invoke("findCards", { query: "deck:大学物理 is:due" });
  if (!cardIds.length) return [];

  const noteIds = await invoke("cardsToNotes", { cards: cardIds });
  const uniqueNotes = [...new Set(noteIds)];
  const notes = await invoke("notesInfo", { notes: uniqueNotes });

  return notes;
}

module.exports = {
  invoke,
  getDueCards,
};
