# Queue 管理系统实现总结

## 核心设计

**Queue = Anki-chan 的子牌组**
- 所有队列都是 `Anki-chan::` 下的子牌组
- 队列直接存在于 Anki 中，不需要额外的数据存储
- 卡片通过标签 `anki-chan-origin::{原牌组名}` 记录原始位置

## 已实现功能

### 后端 API (server.js)

1. **GET /api/queues** - 获取所有队列
2. **POST /api/queues/create** - 创建新队列
3. **POST /api/queues/delete** - 删除队列（卡片移回原牌组）
4. **POST /api/queues/add-cards** - 添加卡片到队列
5. **POST /api/queues/cards** - 获取队列中的卡片

### 前端功能 (queueManager.js + main.js)

1. **队列列表显示** - 在 Study Queue 标签页显示所有队列
2. **创建队列** - 点击 "+ New Queue" 按钮创建
3. **选择队列** - 点击队列名称选择当前队列
4. **添加卡片** - 选中卡片后添加到当前队列
5. **开始学习** - 点击队列的 "Study" 按钮开始学习
6. **删除队列** - 点击 "Delete" 按钮删除队列并还原卡片
7. **学习进度** - 显示当前学习进度 (x/y)

### Decks 过滤

- 过滤掉所有 `Anki-chan` 相关的牌组
- Decks 列表中不显示队列牌组

## 使用流程

1. **创建队列**
   - 切换到 "Study Queue" 标签页
   - 点击 "+ New Queue"
   - 输入队列名称

2. **添加卡片**
   - 在 Decks 中选择牌组或搜索卡片
   - 选中要添加的卡片
   - 确保已选择一个队列（点击队列名称）
   - 点击 "Add selected to Current Queue"

3. **学习**
   - 点击队列的 "Study" 按钮
   - Anki 会自动打开该队列的复习界面
   - 在 Web 界面进行 AI 辅助学习
   - 使用评分按钮（Again/Hard/Good/Easy）

4. **清理队列**
   - 点击队列的 "Delete" 按钮
   - 所有卡片自动移回原牌组
   - 队列被删除

## 技术细节

### 标签系统
- 添加卡片到队列时，自动添加标签 `anki-chan-origin::{原牌组名}`
- 删除队列时，根据标签将卡片移回原牌组
- 移回后自动清理标签

### 牌组创建
- 使用 AnkiConnect 的 `changeDeck` API
- 如果牌组不存在会自动创建

### 学习集成
- 直接使用 Anki 的复习界面
- Web 界面提供 AI 辅助功能
- 评分通过 `guiAnswerCard` API 同步到 Anki

## 待优化

1. 队列详情视图（显示队列中的所有卡片）
2. 从队列中移除单个卡片
3. 队列重命名功能
4. 学习统计和历史记录
5. 更美观的 UI 设计
