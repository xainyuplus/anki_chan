# 临时牌组学习功能实现说明

## 功能概述

实现了基于临时牌组的学习会话管理，完整集成 Anki 的间隔重复算法。

## 工作流程

### 1. 开始学习会话
- 用户从不同牌组选择卡片加入学习队列
- 点击开始学习时，系统自动：
  - 创建临时牌组 `Anki-chan::Session-{timestamp}`
  - 将所有队列中的卡片移动到临时牌组
  - 为每张卡片的 note 添加标签 `anki-chan-origin::{原牌组名}`
  - 在 Anki 中打开临时牌组的复习界面

### 2. 学习过程
- Web 界面显示卡片正面
- AI 生成学习问题
- 用户输入答案
- AI 提供反馈
- 用户根据掌握程度评分：
  - **Again** (红色) - 完全不记得
  - **Hard** (黄色) - 记得但困难
  - **Good** (绿色) - 记得较好
  - **Easy** (蓝色) - 轻松记住

### 3. 评分同步
- 评分通过 AnkiConnect API 同步到 Anki
- 调用 `guiShowAnswer` 显示答案
- 调用 `guiAnswerCard` 提交评分
- Anki 自动更新卡片的复习状态和间隔

### 4. 结束会话
- 学习完所有卡片后自动触发
- 系统自动：
  - 将卡片移回原牌组
  - 清理临时标签
  - 删除临时牌组

## 技术实现

### 后端 API (server.js)

#### POST /api/session/start
创建学习会话
```json
{
  "cardIds": [1234, 5678]
}
```

#### POST /api/session/end
结束学习会话（无参数）

#### POST /api/anki/answer
提交评分
```json
{
  "ease": 3  // 1-4
}
```

#### POST /api/anki/review-deck
在 Anki 中打开牌组
```json
{
  "deckName": "Anki-chan::Session-1234567890"
}
```

### AnkiConnect 封装 (ankiconnect.js)

新增方法：
- `changeDeck(cardIds, deckName)` - 移动卡片
- `cardsToNotes(cardIds)` - 获取 note IDs
- `addTags(noteIds, tags)` - 添加标签
- `removeTags(noteIds, tags)` - 移除标签
- `deleteDecks(deckNames, cardsToo)` - 删除牌组
- `guiDeckReview(deckName)` - 打开复习界面
- `guiShowAnswer()` - 显示答案
- `guiAnswerCard(ease)` - 提交评分

### 前端状态管理 (main.js)

新增状态：
```javascript
AppState.currentSession = {
  tempDeckName: "Anki-chan::Session-xxx",
  cardCount: 10
}
```

核心函数：
- `startStudy()` - 创建会话并开始学习
- `rateCard(ease)` - 评分并同步到 Anki
- `endStudySession()` - 清理会话

## 使用前提

1. Anki 必须在后台运行
2. AnkiConnect 插件已安装并启用
3. 学习时 Anki 会自动打开复习界面（可最小化）

## 注意事项

- 临时牌组名称包含时间戳，避免冲突
- 标签格式：`anki-chan-origin::{原牌组名}`
- 评分需要 Anki GUI 配合，会有短暂延迟
- 异常中断时可能需要手动清理临时牌组

## 未来优化方向

1. 添加会话恢复机制（处理异常中断）
2. 支持暂停/继续学习
3. 添加学习统计和进度可视化
4. 优化 Anki GUI 交互的延迟
5. 支持批量操作优化性能
