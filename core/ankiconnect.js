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
