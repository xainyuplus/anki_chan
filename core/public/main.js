// 全局状态管理
const AppState = {
    studyQueue: [],
    decks: [],
    currentCardIndex: 0,
    currentDeck: null,
    currentQuery: null,
    settings: null,
    allCards: []
};

// 初始化
function init() {
    loadSettings();
    showView('viewCardList');
    showSidebarTab('sidebarDecks');
    bindEvents();
    loadDecks();
}

// 绑定所有事件
function bindEvents() {
    // Tab切换
    document.getElementById('tabDecks').addEventListener('click', () => {
        showSidebarTab('sidebarDecks');
        document.getElementById('tabDecks').classList.add('active');
        document.getElementById('tabQueue').classList.remove('active');
    });

    document.getElementById('tabQueue').addEventListener('click', () => {
        showSidebarTab('sidebarQueue');
        document.getElementById('tabQueue').classList.add('active');
        document.getElementById('tabDecks').classList.remove('active');
        renderQueue();
    });

    // 搜索
    document.getElementById('searchButton').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // 设置
    document.getElementById('settingsButton').addEventListener('click', () => {
        showView('viewSettings');
    });

    document.getElementById("addModelBtn").addEventListener("click", addEmptyModelRow);
    document.getElementById("addRoleBtn").addEventListener("click", addEmptyRoleRow);
    document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);

    // 卡片列表操作
    document.getElementById('btnAddSelectedToQueue').addEventListener('click', addSelectedToQueue);
    document.getElementById('btnAddAllDueToQueue').addEventListener('click', addAllDueToQueue);

    // 学习界面
    document.getElementById('btnGetFeedback').addEventListener('click', getFeedback);
    document.getElementById('btnNextCard').addEventListener('click', nextCard);
    // 添加快捷键：点击队列中的卡片也能开始学习
    document.getElementById('queueList').addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
        startStudy();
    }
});
}

// 显示/隐藏视图
function showView(viewId) {
    ['viewCardList', 'viewStudy', 'viewSettings'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(viewId).style.display = 'block';
}

function showSidebarTab(tabId) {
    ['sidebarDecks', 'sidebarQueue'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';
}

// 加载卡组
async function loadDecks() {
    if (AppState.decks.length > 0) {
        renderDeckTree(AppState.decks);
        // console.log("Decks loaded from cache");
        return;
    }

    const decks = await fetch('/api/decks').then(r => r.json());
    AppState.decks = decks;
    //console.log("Decks loaded from server:", decks);
    renderDeckTree(decks);
}

function renderDeckTree(deckNames) {
    const tree = document.getElementById('deckTree');
    tree.innerHTML = '';

    const deckTree = buildDeckTree(deckNames);
    renderTreeNode(deckTree, tree);
}
// 把 decks 转成一棵树
function buildDeckTree(deckNames) {
    const root = {};

    deckNames.forEach(full => {
        const parts = full.split("::");
        let node = root;

        parts.forEach((p, i) => {
            if (!node[p]) node[p] = { __children: {}, __fullName: parts.slice(0, i + 1).join("::") };
            node = node[p].__children;
        });
    });

    return root;
}
// 递归渲染树节点
function renderTreeNode(tree, container) {
    Object.keys(tree).forEach(name => {
        const info = tree[name];
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = name;
        li.appendChild(span);
        li.dataset.deckName = info.__fullName;

        li.addEventListener("click", e => {
            e.stopPropagation();
            loadDeckCards(info.__fullName);
        });

        const children = info.__children;
        if (Object.keys(children).length > 0) {
            const toggle = document.createElement("span");
            toggle.className = "toggle-arrow";
            toggle.textContent = "►"; // 初始为折叠状态
            li.insertBefore(toggle, span); // 放在节点名前面

            const ul = document.createElement("ul");
            renderTreeNode(children, ul);
            li.appendChild(ul);
            ul.style.display = "none";
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                const isCollapsed = ul.style.display === "none";
                ul.style.display = isCollapsed ? "block" : "none";
                toggle.textContent = isCollapsed ? "▼" : "►";
            });

        }

        container.appendChild(li);
    });
}


// 加载卡组卡片
async function loadDeckCards(deckName) {
    AppState.currentDeck = deckName;
    AppState.currentQuery = `deck:"${deckName}"`;

    const query_result = await apiFindCards(AppState.currentQuery);
    if (!query_result.success) {
        alert("Error loading deck cards: " + query_result.error);
        return;
    }
    const cardIds = query_result.result;
    await loadCardInfo(cardIds);

}

// 根据 cardIds 获取卡片字段
async function loadCardInfo(cardIds) {
    try {
        const response = await fetch(`/api/cards/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardIds })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Unknown error");
        }
        //这里会增加更多信息
        const cards = data.cards.map(card => ({
            id: card.cardId,
            front: card.front
        }));

        AppState.allCards = cards;
        renderCardList(cards);
    } catch (error) {
        console.error("Failed to load card info:", error);
    }
}


function renderCardList(cards) {
    const tbody = document.querySelector('#cardTable tbody');
    tbody.innerHTML = '';

    cards.forEach(card => {
        const tr = document.createElement('tr');
        tr.dataset.cardId = card.id;
        tr.innerHTML = `
          <td><input type="checkbox" class="card-select"></td>
          <td>${stripHtml(card.front).substring(0, 100)}</td>
        `;
        tbody.appendChild(tr);
    });

    showView('viewCardList');
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// 搜索功能
async function performSearch() {
    const query = getSearchQuery();
    if (!query) {
        alert("Please enter a search query");
        return;
    }

    updateSearchState(query);
    const query_result = await apiFindCards(query);
    if (!query_result.success) {
        alert("Search error: " + query_result.error);
        return;
    }
    const cardIds = query_result.result;
    await loadCardInfo(cardIds);
}
//虽然暂时没什么用，但为将来扩展做准备
function getSearchQuery() {
    return document.getElementById('searchInput').value.trim();
}
function updateSearchState(query) {
    AppState.currentQuery = query;
    AppState.currentDeck = null; // 切换到搜索模式
}

//通用搜索接口
async function apiFindCards(query) {
    const response = await fetch('/api/cards/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await response.json();
    return data;
}

// 队列管理
function addSelectedToQueue() {
    const checkboxes = document.querySelectorAll('.card-select:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one card');
        return;
    }

    checkboxes.forEach(cb => {
        const tr = cb.closest('tr');
        const cardId = parseInt(tr.dataset.cardId);
        const cardText = tr.querySelector('td:nth-child(2)').textContent;

        if (!AppState.studyQueue.find(c => c.id === cardId)) {
            AppState.studyQueue.push({ id: cardId, front: cardText });
        }
    });

    alert(`Added ${checkboxes.length} card(s) to study queue`);
    renderQueue();
}

async function addAllDueToQueue() {
    //这里的逻辑是有问题的，现在的实现仅是把所有卡放进去
    if (AppState.allCards.length === 0) {
        alert('No cards loaded');
        return;
    }
    console.log("Adding all cards to queue:", AppState.allCards);
    AppState.allCards.forEach(card => {
        if (!AppState.studyQueue.find(c => c.id === card.id)) {
            AppState.studyQueue.push(card);
        }
    });

    alert(`Added ${AppState.allCards.length} card(s) to study queue`);
    renderQueue();
}

function renderQueue() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    AppState.studyQueue.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.innerHTML = `
          <span>${stripHtml(card.front).substring(0, 50)}</span>
          <button data-index="${index}">Remove</button>
        `;
        div.querySelector('button').addEventListener('click', () => {
            AppState.studyQueue.splice(index, 1);
            renderQueue();
        });
        queueList.appendChild(div);
    });

    document.getElementById('queueSummary').textContent = `Total: ${AppState.studyQueue.length} cards`;

    // 如果队列有内容，可以开始学习
    if (AppState.studyQueue.length > 0 && AppState.currentCardIndex >= AppState.studyQueue.length) {
        AppState.currentCardIndex = 0;

    }
}

// 学习功能
async function startStudy() {
    if (AppState.studyQueue.length === 0) {
        alert('Study queue is empty. Please add cards first.');
        return;
    }

    AppState.currentCardIndex = 0;
    await loadCurrentCard();
    showView('viewStudy');
}

async function loadCurrentCard() {
    if (AppState.currentCardIndex >= AppState.studyQueue.length) {
        alert('No more cards in queue!');
        return;
    }

    const card = AppState.studyQueue[AppState.currentCardIndex];
    document.getElementById('studyFront').textContent = stripHtml(card.front);
    document.getElementById('studyQuestion').textContent = 'Generating question...';
    document.getElementById('studyAnswer').value = '';
    document.getElementById('studyFeedback').textContent = '';

    // 生成AI问题
    await generateQuestion(card.front);
}
// 调用后端AI接口生成问题
async function generateQuestion(cardFront) {
    if (!AppState.settings.apiKeyEnvName || !AppState.settings.aiUrl) {
        document.getElementById('studyQuestion').textContent =
            'Missing API settings. Please configure in settings.';
        return;
    }

    const cardText = stripHtml(cardFront);

    try {
        const response = await fetch('/api/ai/generate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardFront: cardText,
                apiKeyEnvName: AppState.settings.apiKeyEnvName,
                aiUrl: AppState.settings.aiUrl,
                modelName: AppState.settings.modelName,
                temperature: AppState.settings.temperature
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('AI error:', data.error);
            document.getElementById('studyQuestion').textContent =
                'Error generating question.';
            return;
        }

        document.getElementById('studyQuestion').textContent = data.question;
    } catch (e) {
        console.error('generateQuestion failed:', e);
        document.getElementById('studyQuestion').textContent =
            'Error generating question.';
    }
}

// 调用后端AI接口获取反馈
async function getFeedback() {
    const answer = document.getElementById('studyAnswer').value.trim();
    if (!answer) {
        alert('Write your answer first.');
        return;
    }

    if (!AppState.settings.apiKeyEnvName || !AppState.settings.aiUrl) {
        alert('Missing API settings.');
        return;
    }

    const cardFront = document.getElementById('studyFront').textContent;
    const question = document.getElementById('studyQuestion').textContent;

    document.getElementById('studyFeedback').textContent = 'Getting feedback...';

    try {
        const response = await fetch('/api/ai/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardFront,
                question,
                answer,
                apiKeyEnvName: AppState.settings.apiKeyEnvName,
                aiUrl: AppState.settings.aiUrl,
                modelName: AppState.settings.modelName,
                temperature: AppState.settings.temperature
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('AI error:', data.error);
            document.getElementById('studyFeedback').textContent =
                'Error getting feedback.';
            return;
        }

        document.getElementById('studyFeedback').textContent = data.feedback;

    } catch (e) {
        console.error('getFeedback failed:', e);
        document.getElementById('studyFeedback').textContent =
            'Error getting feedback.';
    }
}



function nextCard() {
    AppState.currentCardIndex++;
    if (AppState.currentCardIndex >= AppState.studyQueue.length) {
        alert('You have completed all cards in the queue!');
        showView('viewCardList');
        return;
    }
    loadCurrentCard();
}







// 启动应用
init();


