# Anki-chan

[中文](#中文) | [English](#english)

Anki-chan 是一个基于 AnkiConnect 的 AI 学习辅助工具：Anki 负责复习调度（间隔重复），Anki-chan 提供 AI 提问与反馈，帮助你在复习时进行更主动的回忆与表达。

## 中文

### 项目简介

Anki-chan 的核心目标是把传统“看题-想答案”的复习流程，升级为“解释-回答-AI追问/反馈”的交互式学习流程。

你仍然使用 Anki 原生的复习算法和评分（Again / Hard / Good / Easy），但同时获得一个网页端 AI 助手来辅助理解与纠错。

### 功能特性

- 单队列学习模式：使用 `Anki-chan` 牌组作为学习队列
- 卡片队列管理：可从任意牌组添加卡片到队列，并记录原始牌组
- AI 辅助学习：生成提问、回答反馈、支持自定义模型与角色模板
- 原生 Anki 联动：调用 Anki GUI 开始复习、展示答案、提交评分
- 本地运行：后端与配置均在本地，便于自定义与维护

### 项目结构（核心）

- `anki_chan/core/server.js`：Express 后端入口，提供 API
- `anki_chan/core/ankiconnect.js`：AnkiConnect API 封装
- `anki_chan/core/ai.js`：AI 调用逻辑（OpenAI-compatible 接口）
- `anki_chan/core/settingsStore.js`：AI 配置读取/保存
- `anki_chan/config/ai_config.json`：模型与角色模板配置
- `anki_chan/core/.env`：API Key 环境变量（本地私密配置）

### 前置条件

- 已安装 Anki 桌面端
- 已安装 [AnkiConnect 插件](https://ankiweb.net/shared/info/2055492159)
- Node.js（建议使用较新的 LTS 版本）

### 安装与启动

1. 安装 AnkiConnect 插件，并确保 Anki 正在运行
2. 克隆仓库
3. 安装依赖

```bash
cd anki_chan/core
npm install
```

4. 配置环境变量（`.env`）
5. 启动后端服务

```bash
npm start
```

6. 浏览器打开 `http://localhost:3000`

### `.env` 配置（重要）

在 `anki_chan/core/.env` 中填写你的模型 API Key（按 `ai_config.json` 中 `apiKeyEnvName` 对应）：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
QWEN_API_KEY=your_qwen_api_key
```

说明：
- `ai_config.json` 里每个模型都通过 `apiKeyEnvName` 指向一个环境变量名
- 你只需要填写自己实际会使用到的模型 Key
- 不要把 `.env` 中的真实密钥提交到公开仓库

### AI 配置说明（`config/ai_config.json`）

配置文件包含两部分：

- `models`：模型列表（显示名、接口地址、模型名、温度、对应环境变量）
- `roles`：AI 角色模板（例如提问角色、反馈角色）

常见字段说明：

- `defaultModel`：默认模型 key
- `models.<name>.baseURL`：聊天补全接口地址（OpenAI-compatible）
- `models.<name>.apiKeyEnvName`：在 `.env` 中读取的变量名
- `roles.<roleName>.model`：该角色使用哪个模型
- `roles.<roleName>.template.system/user`：提示词模板，支持 `{{front}}`、`{{back}}`、`{{answer}}`、`{{question}}` 等变量

### 使用流程（建议）

1. 启动 Anki（确保 AnkiConnect 可用）
2. 启动本项目后端并打开网页
3. 在设置页确认 AI 模型与角色配置可用
4. 浏览你的 Anki 牌组（系统会过滤 `Anki-chan` 队列牌组）
5. 选择卡片并加入队列（`Anki-chan` 牌组）
6. 切到学习队列，选择卡片开始学习
7. 使用网页端生成 AI 提问并作答
8. 获取 AI 反馈后，在 Anki 原生界面进行评分（Again / Hard / Good / Easy）
9. 需要时将卡片从队列移回原牌组

### 队列机制说明

- 加入队列时，卡片会被移动到 `Anki-chan` 牌组
- 系统会为卡片对应 note 添加标签记录原牌组：`anki-chan-origin::{deckName}`
- 从队列移除时，会根据该标签移回原牌组，并清理标签

### 常见问题（简要）

- Anki 连接失败：确认 Anki 已启动且 AnkiConnect 插件已启用
- AI 调用失败：检查 `.env` 中 API Key 是否正确、对应模型是否在 `ai_config.json` 中配置
- 页面能开但功能报错：先看后端终端日志（`server.js` 会输出错误信息）

---

## English

### Overview

Anki-chan is an AI-assisted companion for Anki. It keeps Anki's native spaced repetition workflow while adding AI-generated questions and answer feedback in a local web UI.

### Quick Start

1. Install Anki desktop and the [AnkiConnect add-on](https://ankiweb.net/shared/info/2055492159)
2. Run Anki
3. Install dependencies:

```bash
cd anki_chan/core
npm install
```

4. Configure `anki_chan/core/.env`

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
QWEN_API_KEY=your_qwen_api_key
```

5. Start server:

```bash
npm start
```

6. Open `http://localhost:3000`

### Configuration

- AI models and prompt roles are stored in `anki_chan/config/ai_config.json`
- Each model reads its API key from `.env` via `apiKeyEnvName`
- Prompt templates support variables such as `{{front}}`, `{{back}}`, `{{answer}}`, `{{question}}`

### Main Workflow

1. Browse decks and cards
2. Add selected cards to the `Anki-chan` queue deck
3. Start review and use AI question/feedback in the web UI
4. Rate cards in Anki's native review interface
5. Remove cards from queue to return them to original decks

### License

GPL-3.0-or-later
