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

export async function getDecks() {
  const decks = await invoke("deckNames");
  return decks;
}
export async function findCards(query) {
    return await invoke("findCards", { query });
}

export async function cardsInfo(cardIds) {
    return await invoke("cardsInfo", { cards: cardIds });
}

// 临时牌组管理
export async function changeDeck(cardIds, deckName) {
    return await invoke("changeDeck", { cards: cardIds, deck: deckName });
}

export async function deleteDecks(deckNames, cardsToo = false) {
    return await invoke("deleteDecks", { decks: deckNames, cardsToo });
}

// 标签管理
export async function cardsToNotes(cardIds) {
    return await invoke("cardsToNotes", { cards: cardIds });
}

export async function addTags(noteIds, tags) {
    return await invoke("addTags", { notes: noteIds, tags });
}

export async function removeTags(noteIds, tags) {
    return await invoke("removeTags", { notes: noteIds, tags });
}

export async function notesInfo(noteIds) {
    return await invoke("notesInfo", { notes: noteIds });
}

// 复习状态更新
export async function guiDeckReview(deckName) {
    return await invoke("guiDeckReview", { name: deckName });
}

export async function guiShowQuestion() {
    return await invoke("guiShowQuestion");
}

export async function guiShowAnswer() {
    return await invoke("guiShowAnswer");
}

export async function guiAnswerCard(ease) {
    return await invoke("guiAnswerCard", { ease });
}

export async function guiCurrentCard() {
    return await invoke("guiCurrentCard");
}

export async function guiDeckBrowser() {
    return await invoke("guiDeckBrowser");
}
