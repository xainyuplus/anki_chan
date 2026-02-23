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
    tags: [], // 标签列表
    // 框选状态
    isSelecting: false,
    selectionStart: { x: 0, y: 0 },
    selectionBox: null,
    initialCheckboxStates: new Map(), // 记录框选开始时的checkbox状态
    // 队列学习模式
    queueMode: 'auto' // auto: 自动移出已完成, once: 学习一次即移出, keep: 保留反复学习
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
    loadQueueMode();
    loadSidebarState();
    checkAnkiConnection();
}

// 加载队列学习模式
function loadQueueMode() {
    const savedMode = localStorage.getItem('queueMode');
    if (savedMode) {
        AppState.queueMode = savedMode;
        document.getElementById('queueMode').value = savedMode;
    }
}

// 侧边栏折叠功能
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    // 保存折叠状态
    localStorage.setItem('sidebarCollapsed', isCollapsed);

    // 更新按钮图标
    const toggleBtn = document.getElementById('sidebarToggle');
    toggleBtn.textContent = isCollapsed ? '☰' : '✕';
}

// 加载侧边栏折叠状态
function loadSidebarState() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        document.getElementById('sidebar').classList.add('collapsed');
        document.getElementById('sidebarToggle').textContent = '☰';
    }
}

// 检查Anki连接状态
async function checkAnkiConnection() {
    try {
        const response = await fetch('/api/anki/status');
        const data = await response.json();

        if (data.success && data.connected) {
            // 连接成功，继续加载数据
            loadDecks();
            loadQueueCards();
            loadModelsAndTags();
            return;
        }

        // 连接失败，显示提示
        showAnkiConnectionModal();
    } catch (error) {
        // 连接失败，显示提示
        showAnkiConnectionModal();
    }
}

// 显示Anki连接提示弹窗
function showAnkiConnectionModal() {
    document.getElementById('ankiConnectionModal').style.display = 'block';
}

// 隐藏Anki连接提示弹窗
function hideAnkiConnectionModal() {
    document.getElementById('ankiConnectionModal').style.display = 'none';
}

// 绑定所有事件
function bindEvents() {
    // 侧边栏折叠
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

    // 侧边栏展开
    const expandBtn = document.getElementById('sidebarExpandBtn');
    if (expandBtn) {
        expandBtn.addEventListener('click', toggleSidebar);
    }

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
    document.getElementById('btnShowAnswer').addEventListener('click', showAnswer);
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

    // 框选功能
    initCardTableSelection();

    // Anki连接重试按钮
    document.getElementById('btnRetryConnection').addEventListener('click', async () => {
        hideAnkiConnectionModal();
        await checkAnkiConnection();
    });

    // 队列学习模式选择
    document.getElementById('queueMode').addEventListener('change', (e) => {
        AppState.queueMode = e.target.value;
        localStorage.setItem('queueMode', e.target.value);
    });
}

// 显示/隐藏视图
function showView(viewId) {
    ['viewCardList', 'viewStudy', 'viewSettings'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(viewId).style.display = 'block';

    // 更新侧边栏展开按钮
    updateSidebarExpandBtn(viewId);
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
            // 默认显示queue状态
            statusText = getQueueStatusText(card);
            statusClass = getQueueStatusClass(card);
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

// 获取队列状态文本
function getQueueStatusText(card) {
    const queue = card.queue;

    if (queue === 0) return '未学习';
    if (queue === 1) return '学习中';
    if (queue === 2) return '复习中';
    if (queue === -1) return '已暂停';
    if (queue === -2) return '已搁置';
    if (queue === -3) return '已搁置(手动)';
    return '未知状态';
}

// 获取队列状态样式类
function getQueueStatusClass(card) {
    const queue = card.queue;

    if (queue === 0) return 'queue-new';
    if (queue === 1) return 'queue-learning';
    if (queue === 2) return 'queue-due';
    if (queue === -1) return 'queue-suspended';
    if (queue === -2 || queue === -3) return 'queue-buried';
    return '';
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
                due: c.due,
                nextReviews: c.nextReviews,
                interval: c.interval
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
    document.getElementById('studyBack').textContent = '';
    document.getElementById('studyFeedback').textContent = '';

    // 隐藏评分按钮
    const ratingSection = document.querySelector('.rating-section');
    if (ratingSection) {
        ratingSection.classList.remove('visible');
    }

    // 更新进度显示
    const progressSpan = document.getElementById('studyProgress');
    if (progressSpan) {
        progressSpan.textContent = `${AppState.currentCardIndex + 1}/${AppState.studyQueue.length}`;
    }

    // 同步更新侧边栏展开按钮的进度显示
    updateSidebarExpandBtn('viewStudy');

    // 更新评分按钮显示next interval
    updateRatingButtons(card);

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

// 显示卡片背面
function showAnswer() {
    const card = AppState.studyQueue[AppState.currentCardIndex];
    document.getElementById('studyBack').innerHTML = card.back;

    // 显示评分按钮
    const ratingSection = document.querySelector('.rating-section');
    if (ratingSection) {
        ratingSection.classList.add('visible');
    }
}

// 更新评分按钮显示next interval
function updateRatingButtons(card) {
    const buttonLabels = ['Again', 'Hard', 'Good', 'Easy'];
    const buttons = document.querySelectorAll('.rating-btn');

    buttons.forEach((btn) => {
        const ease = parseInt(btn.dataset.ease);
        const baseLabel = buttonLabels[ease - 1];

        // nextReviews是一个数组，索引对应ease-1
        if (card.nextReviews && card.nextReviews[ease - 1]) {
            btn.textContent = `${baseLabel} (${card.nextReviews[ease - 1]})`;
        } else {
            btn.textContent = baseLabel;
        }
    });
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

        // 显示评分按钮
        const ratingSection = document.querySelector('.rating-section');
        if (ratingSection) {
            ratingSection.classList.add('visible');
        }

    } catch (e) {
        console.error('getFeedback failed:', e);
        document.getElementById('studyFeedback').textContent =
            'Error getting feedback.';
    }
}


// 评分卡片并更新 Anki
async function rateCard(ease) {
    try {
        const currentCard = AppState.studyQueue[AppState.currentCardIndex];

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

        // 根据学习模式决定是否移出队列
        await handleCardAfterRating(currentCard, ease);

    } catch (err) {
        console.error('Failed to rate card:', err);
        alert('Failed to rate card');
    }
}

// 评分后处理卡片
async function handleCardAfterRating(card, ease) {
    let shouldRemove = false;

    if (AppState.queueMode === 'once') {
        // 学习一次即移出
        shouldRemove = true;
    } else if (AppState.queueMode === 'keep') {
        // 保留反复学习，不移出
        shouldRemove = false;
    } else if (AppState.queueMode === 'auto') {
        // 自动模式：检查评分按钮对应的下次复习间隔
        // nextReviews是字符串数组，如['<⁨10⁩ 分', '⁨11.2⁩ 个月', '⁨1.9⁩ 年', '⁨2.5⁩ 年']
        // ease: 1=Again, 2=Hard, 3=Good, 4=Easy
        if (card.nextReviews && card.nextReviews.length >= ease) {
            const nextReview = card.nextReviews[ease - 1];

            // 检查是否包含"天"、"个月"或"年"，这些表示大于1天
            const isLongInterval = nextReview.includes('天') ||
                                  nextReview.includes('个月') ||
                                  nextReview.includes('年');

            // 如果间隔大于1天，则移出队列
            shouldRemove = isLongInterval;
        } else {
            // 如果没有nextReviews数据，检查queue状态
            const isLearning = card.queue === 1;
            const isNew = card.queue === 0;
            shouldRemove = !isLearning && !isNew;
        }
    }

    if (shouldRemove) {
        // 从队列中移除卡片
        await removeFromQueueById(card.id);
        // 不增加索引，因为数组已经变短
        if (AppState.currentCardIndex >= AppState.studyQueue.length) {
            alert('You have completed all cards in the queue!');
            showView('viewCardList');
            return;
        }
        loadCurrentCard();
    } else {
        // 不移出，进入下一张
        nextCard();
    }
}

// 根据卡片ID从队列中移除
async function removeFromQueueById(cardId) {
    try {
        const response = await fetch('/api/queue/remove-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId })
        });

        const data = await response.json();
        if (data.success) {
            // 从本地状态中移除
            AppState.studyQueue = AppState.studyQueue.filter(c => c.id !== cardId);
            await loadQueueCards();
        }
    } catch (err) {
        console.error('Failed to remove card from queue:', err);
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

// 框选功能
function initCardTableSelection() {
    const cardTable = document.getElementById('cardTable');

    cardTable.addEventListener('mousedown', (e) => {
        // 如果点击的是checkbox，不启动框选
        if (e.target.type === 'checkbox') return;

        // 如果点击的是表头，不启动框选
        if (e.target.tagName === 'TH' || e.target.closest('thead')) return;

        AppState.isSelecting = true;
        AppState.selectionStart = { x: e.clientX, y: e.clientY };

        // 记录所有checkbox的初始状态
        AppState.initialCheckboxStates.clear();
        document.querySelectorAll('#cardTable tbody tr').forEach(tr => {
            const checkbox = tr.querySelector('.card-select');
            if (checkbox) {
                AppState.initialCheckboxStates.set(tr, checkbox.checked);
            }
        });

        // 创建框选框
        AppState.selectionBox = document.createElement('div');
        AppState.selectionBox.className = 'selection-box';
        document.body.appendChild(AppState.selectionBox);

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!AppState.isSelecting) return;

        const currentX = e.clientX;
        const currentY = e.clientY;
        const startX = AppState.selectionStart.x;
        const startY = AppState.selectionStart.y;

        // 更新框选框位置和大小
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        AppState.selectionBox.style.left = left + 'px';
        AppState.selectionBox.style.top = top + 'px';
        AppState.selectionBox.style.width = width + 'px';
        AppState.selectionBox.style.height = height + 'px';

        // 检测哪些行在框选范围内
        updateSelectedRows(left, top, width, height);
    });

    document.addEventListener('mouseup', () => {
        if (!AppState.isSelecting) return;

        AppState.isSelecting = false;

        // 移除框选框
        if (AppState.selectionBox) {
            AppState.selectionBox.remove();
            AppState.selectionBox = null;
        }

        // 移除所有selecting类
        document.querySelectorAll('#cardTable tbody tr.selecting').forEach(tr => {
            tr.classList.remove('selecting');
        });

        // 清空初始状态记录
        AppState.initialCheckboxStates.clear();
    });
}

function updateSelectedRows(left, top, width, height) {
    const rows = document.querySelectorAll('#cardTable tbody tr');

    rows.forEach(tr => {
        const rect = tr.getBoundingClientRect();

        // 检测行是否与框选框相交
        const isIntersecting = !(
            rect.right < left ||
            rect.left > left + width ||
            rect.bottom < top ||
            rect.top > top + height
        );

        const checkbox = tr.querySelector('.card-select');
        const initialState = AppState.initialCheckboxStates.get(tr);

        if (isIntersecting) {
            // 在框选范围内，设置为选中
            tr.classList.add('selecting');
            if (checkbox) checkbox.checked = true;
        } else {
            // 不在框选范围内，恢复初始状态
            tr.classList.remove('selecting');
            if (checkbox && initialState !== undefined) {
                checkbox.checked = initialState;
            }
        }
    });
}

// 更新侧边栏展开按钮的显示内容
function updateSidebarExpandBtn(currentView) {
    const expandBtn = document.getElementById('sidebarExpandBtn');
    if (!expandBtn) return;

    if (currentView === 'viewStudy' && AppState.studyQueue.length > 0) {
        // 学习模式下显示进度
        expandBtn.classList.add('show-progress');
        expandBtn.textContent = `${AppState.currentCardIndex + 1}/${AppState.studyQueue.length}`;
    } else {
        // 其他模式显示图标
        expandBtn.classList.remove('show-progress');
        expandBtn.textContent = '☰';
    }
}

// 启动应用
init();


