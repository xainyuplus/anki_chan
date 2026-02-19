// 全局状态管理
const AppState = {
    studyQueue: [], // 当前学习的卡片列表
    currentCardIndex: 0,
    decks: [],
    currentDeck: null,
    currentQuery: null,
    settings: null,
    allCards: [],
    models: [], // 笔记模板列表
    tags: [] // 标签列表
};

// 筛选配置
const FilterConfig = {
    today: {
        label: '今天',
        options: [
            { value: 'prop:due=0', label: '今天到期' },
            { value: 'added:1', label: '今天添加' },
            { value: 'edited:1', label: '今天编辑' },
            { value: 'rated:1', label: '今天学习' },
            { value: 'introduced:1', label: '首次复习' },
            { value: 'resched:1', label: '已重新排程' },
            { value: 'rated:1:1', label: '今天重来' },
            { value: 'is:due -prop:due=0', label: '逾期未复习' }
        ]
    },
    flag: {
        label: '旗标',
        options: [
            { value: 'flag:1', label: '红旗' },
            { value: 'flag:2', label: '橙旗' },
            { value: 'flag:3', label: '绿旗' },
            { value: 'flag:4', label: '蓝旗' },
            { value: 'flag:5', label: '粉旗' },
            { value: 'flag:6', label: '青旗' },
            { value: 'flag:7', label: '紫旗' }
        ]
    },
    state: {
        label: '卡片状态',
        options: [
            { value: 'is:new', label: '未学习' },
            { value: 'is:learn', label: '学习中' },
            { value: 'is:review', label: '复习中' },
            { value: 'is:buried', label: '已搁置' },
            { value: 'is:suspended', label: '已暂停' }
        ]
    },
    note: {
        label: '笔记模板',
        options: [] // 动态加载
    },
    tag: {
        label: '标签',
        options: [] // 动态加载
    }
};

// 初始化
function init() {
    loadSettings();
    showView('viewCardList');
    showSidebarTab('sidebarDecks');
    bindEvents();
    loadDecks();
    loadQueueCards();
    loadModelsAndTags();
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
        loadQueueCards();
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

    // 筛选功能
    document.getElementById('filterCategory').addEventListener('change', onFilterCategoryChange);
    document.getElementById('btnApplyFilter').addEventListener('click', applyFilter);

    // 学习界面
    document.getElementById('btnGetFeedback').addEventListener('click', getFeedback);

    // 评分按钮
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ease = parseInt(e.target.dataset.ease);
            await rateCard(ease);
        });
    });

    // 点击队列中的卡片开始学习
    document.getElementById('queueList').addEventListener('click', (e) => {
        if (e.target.classList.contains('queue-item-text')) {
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

// 加载笔记模板和标签
async function loadModelsAndTags() {
    try {
        // 加载笔记模板
        const modelsResponse = await fetch('/api/models');
        const modelsData = await modelsResponse.json();
        if (modelsData.success) {
            AppState.models = modelsData.models;
            FilterConfig.note.options = modelsData.models.map(m => ({
                value: `note:"${m}"`,
                label: m
            }));
        }

        // 加载标签
        const tagsResponse = await fetch('/api/tags');
        const tagsData = await tagsResponse.json();
        if (tagsData.success) {
            AppState.tags = tagsData.tags;
            FilterConfig.tag.options = tagsData.tags.map(t => ({
                value: `tag:"${t}"`,
                label: t
            }));
        }
    } catch (err) {
        console.error('Failed to load models and tags:', err);
    }
}

// 筛选类别改变时更新子选项
function onFilterCategoryChange() {
    const category = document.getElementById('filterCategory').value;
    const subSelect = document.getElementById('filterSubCategory');

    if (!category) {
        subSelect.style.display = 'none';
        return;
    }

    const config = FilterConfig[category];
    if (!config) return;

    subSelect.innerHTML = '<option value="">请选择</option>';
    config.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        subSelect.appendChild(option);
    });

    subSelect.style.display = 'inline-block';
}

// 应用筛选
async function applyFilter() {
    const category = document.getElementById('filterCategory').value;
    const subCategory = document.getElementById('filterSubCategory').value;

    if (!category) {
        alert('请选择筛选类别');
        return;
    }

    if (!subCategory) {
        alert('请选择具体筛选条件');
        return;
    }

    // 构建查询
    let query = subCategory;

    // 如果当前有选中的牌组，添加牌组限制
    if (AppState.currentDeck) {
        query = `deck:"${AppState.currentDeck}" ${subCategory}`;
    }

    AppState.currentQuery = query;

    const query_result = await apiFindCards(query);
    if (!query_result.success) {
        alert("筛选失败: " + query_result.error);
        return;
    }

    // 获取卡片详细信息
    const cardIds = query_result.result;
    await loadCardInfo(cardIds);
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
            front: card.front,
            back: card.back,
            queue: card.queue,
            due: card.due,
            nextReviews: card.nextReviews,
            interval: card.interval

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

    const category = document.getElementById('filterCategory').value;

    cards.forEach(card => {
        const tr = document.createElement('tr');
        tr.dataset.cardId = card.id;

        // 根据筛选类别显示不同的状态信息
        let statusText = '';
        let statusClass = '';

        if (category === 'flag') {
            // 显示旗标状态
            const flagNames = ['', '红旗', '橙旗', '绿旗', '蓝旗', '粉旗', '青旗', '紫旗'];
            statusText = card.flags ? flagNames[card.flags] || '无旗标' : '无旗标';
            statusClass = card.flags ? `flag-${card.flags}` : '';
        } else if (category === 'note') {
            // 显示笔记模板
            statusText = card.modelName || '未知模板';
            statusClass = 'note-type';
        } else if (category === 'tag') {
            // 显示标签
            statusText = card.tags && card.tags.length > 0 ? card.tags.join(', ') : '无标签';
            statusClass = 'tag-info';
        } else {
            // 默认显示卡片状态
            if (card.queue === 0) {
                statusText = '未学习';
                statusClass = 'queue-new';
            } else if (card.queue === 1) {
                statusText = '学习中';
                statusClass = 'queue-learning';
            } else if (card.queue === 2) {
                //这里逻辑不对，due信息似乎不是表示还有几天到期
                statusText = `待复习 (due: ${card.due})`;
                statusClass = 'queue-due';
            } else if (card.queue === -1) {
                statusText = '已暂停';
                statusClass = 'queue-suspended';
            } else if (card.queue === -2) {
                statusText = '已搁置';
                statusClass = 'queue-buried';
            } else if (card.queue === -3) {
                statusText = '已搁置(手动)';
                statusClass = 'queue-buried';
            }
        }

        tr.innerHTML = `
          <td><input type="checkbox" class="card-select"></td>
          <td>${stripHtml(card.front).substring(0, 100)}</td>
          <td>
            <span class="queue-tag ${statusClass}">
              ${statusText}
            </span>
          </td>
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
async function addSelectedToQueue() {
    const checkboxes = document.querySelectorAll('.card-select:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one card');
        return;
    }

    const cardIds = [];
    checkboxes.forEach(cb => {
        const tr = cb.closest('tr');
        const cardId = parseInt(tr.dataset.cardId);
        cardIds.push(cardId);
    });

    try {
        const response = await fetch('/api/queue/add-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardIds })
        });

        const result = await response.json();

        if (result.success) {
            alert(`Added ${result.addedCount} card(s) to queue`);
            loadQueueCards();
            checkboxes.forEach(cb => cb.checked = false);
        } else {
            alert('Failed to add cards: ' + result.error);
        }
    } catch (err) {
        console.error('Failed to add cards:', err);
        alert('Failed to add cards');
    }
}

// 加载队列中的卡片
async function loadQueueCards() {
    try {
        const response = await fetch('/api/queue/cards');
        const data = await response.json();

        if (data.success) {
            AppState.studyQueue = data.cards.map(c => ({
                id: c.cardId,
                front: c.front,
                back: c.back,
                queue: c.queue,
                due: c.due
            }));
            renderQueue();
        }
    } catch (err) {
        console.error('Failed to load queue cards:', err);
    }
}

function renderQueue() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    AppState.studyQueue.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.innerHTML = `
          <span class="queue-item-text">${stripHtml(card.front).substring(0, 50)}</span>
          <button data-index="${index}">Remove</button>
        `;
        div.querySelector('button').addEventListener('click', async () => {
            await removeFromQueue(index);
        });
        queueList.appendChild(div);
    });

    document.getElementById('queueSummary').textContent = `Total: ${AppState.studyQueue.length} cards`;

    if (AppState.studyQueue.length > 0 && AppState.currentCardIndex >= AppState.studyQueue.length) {
        AppState.currentCardIndex = 0;
    }
}

// 从队列中移除卡片
async function removeFromQueue(index) {
    const card = AppState.studyQueue[index];

    try {
        const response = await fetch('/api/queue/remove-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: card.id })
        });

        const data = await response.json();

        if (!data.success) {
            alert('Failed to remove card: ' + data.error);
            return;
        }

        // 从前端队列移除
        AppState.studyQueue.splice(index, 1);
        renderQueue();

    } catch (err) {
        console.error('Failed to remove card:', err);
        alert('Failed to remove card');
    }
}

// 学习功能
async function startStudy() {
    if (AppState.studyQueue.length === 0) {
        alert('Study queue is empty. Please add cards first.');
        return;
    }

    // 在 Anki 中打开 Anki-chan 牌组
    await openAnkiReview('Anki-chan');

    // 开始学习流程
    AppState.currentCardIndex = 0;
    await loadCurrentCard();
    showView('viewStudy');
}

// 在 Anki 中打开复习界面
async function openAnkiReview(deckName) {
    try {
        const response = await fetch('/api/anki/review-deck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deckName })
        });

        const data = await response.json();

        if (!data.success) {
            console.warn('Failed to open Anki review:', data.error);
        }
    } catch (err) {
        console.warn('Failed to open Anki review:', err);
    }
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

    // 更新进度显示
    const progressSpan = document.getElementById('studyProgress');
    if (progressSpan) {
        progressSpan.textContent = `${AppState.currentCardIndex + 1}/${AppState.studyQueue.length}`;
    }

    // 生成AI问题
    await generateQuestion(card);
}
// 调用后端AI接口生成问题
async function generateQuestion(card) {
    const cardText = stripHtml(card.front);

    try {
        const response = await fetch('/api/ai/generate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roleName: 'teacherQuestion',
                cardFront: cardText,
                cardBack: card.back
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
        card.question = data.question;
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

    const card = AppState.studyQueue[AppState.currentCardIndex];
    const cardFront = card.front;
    const cardBack = card.back;
    const question = card.question || document.getElementById('studyQuestion').textContent;

    document.getElementById('studyFeedback').textContent = 'Getting feedback...';

    try {
        const response = await fetch('/api/ai/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roleName: 'teacherFeedback',
                cardFront,
                cardBack,
                question,
                answer
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


// 评分卡片并更新 Anki
async function rateCard(ease) {
    try {
        const response = await fetch('/api/anki/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ease })
        });

        const data = await response.json();

        if (!data.success) {
            alert('Failed to rate card: ' + data.error);
            return;
        }

        // 评分成功，进入下一张卡片
        nextCard();

    } catch (err) {
        console.error('Failed to rate card:', err);
        alert('Failed to rate card');
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


