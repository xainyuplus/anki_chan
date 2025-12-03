let currentCard = null;

async function loadDeck() {
    const res = await fetch("/deck-length");
    const data = await res.json();
    console.log(`Cards remaining: ${data.length}`);

    await loadNextCard();
}
async function loadNextCard() {
    const res = await fetch("/next-card");
    const card = await res.json();
    renderCard(card);
}
async function renderCard(card) {
    const $card = document.getElementById("card");

    if (card.done) {
        $card.innerHTML = "<h2>All done for today! 🎉</h2>";
        return;
    }
    else {
        document.querySelector(".card-front").innerHTML = card.front;
        document.querySelector(".card-back").innerHTML = card.back;
        const aiQuestion = await askAI(card.front);
        document.getElementById("ai-question").innerText = aiQuestion;
    }

}
async function askAI(front) {
    console.log("Asking AI for question...");
  const res = await fetch("/ai-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ front })
  });

  const data = await res.json();
  console.log("AI Question:", data.question);
  return data.question;
}
async function sendReview(action) {
    if (!currentCard) return;

    await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentCard.id, action })
    });

    loadCard();
}

document.querySelectorAll("#buttons button").forEach(btn => {
    btn.addEventListener("click", () => sendReview(btn.dataset.action));
});

loadDeck();
