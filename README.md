# Anki-chan / Anki酱

[English](#english) | [中文](#中文)

---

## English

### Overview

**Anki-chan** is an AI-powered learning assistant that integrates with Anki through AnkiConnect. It enhances your study experience by providing AI-generated questions and feedback while leveraging Anki's native spaced repetition algorithm.

The core idea is simple: Instead of only recalling answers silently, learners *teach*, *explain*, and *respond* to AI prompts. This transforms the review process into an active dialogue that strengthens memory, surfaces uncertainty, and supports deeper understanding.

### Key Features

- **Single Queue System**: Uses a dedicated "Anki-chan" deck as a study queue
- **Smart Card Management**: Add cards from any deck to the queue, with automatic origin tracking
- **AI-Assisted Learning**:
  - AI-generated questions based on card content
  - Intelligent feedback on your answers
  - Customizable AI models and roles
- **Native Anki Integration**:
  - Uses Anki's built-in interval repetition algorithm
  - Syncs ratings (Again/Hard/Good/Easy) directly to Anki
  - Opens Anki's native review interface for studying
- **Flexible Card Organization**:
  - Browse and search cards from all decks
  - Add selected cards to the study queue
  - Remove cards back to their original decks

### How It Works

1. **Add Cards**: Browse your Anki decks and add cards to the "Anki-chan" queue
2. **Study**: Start studying - the system opens Anki's review interface while providing AI assistance in the web interface
3. **AI Interaction**: Get AI-generated questions and feedback to deepen your understanding
4. **Rate Cards**: Use Anki's native rating buttons (Again/Hard/Good/Easy) to schedule reviews
5. **Manage Queue**: Remove cards from the queue to return them to their original decks

### Technical Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript
- **Integration**: AnkiConnect API
- **AI**: Configurable AI models (supports OpenAI-compatible APIs)

### Prerequisites

- Anki desktop application
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki
- Node.js (v14 or higher)

### Installation

1. Install AnkiConnect add-on in Anki
2. Clone this repository
3. Install dependencies:
   ```bash
   cd core
   npm install
   ```
4. Configure your AI settings in the web interface
5. Start the server:
   ```bash
   npm start
   ```
6. Open http://localhost:3000 in your browser

### Usage

1. **Configure AI Settings**: Click "Settings" to add your AI models and roles
2. **Browse Decks**: View all your Anki decks (except Anki-chan)
3. **Add to Queue**: Select cards and click "Add selected to Queue"
4. **Study**: Switch to "Study Queue" tab and click on any card to start studying
5. **Review**: The system opens Anki's review interface - rate cards as usual
6. **AI Assistance**: Use the web interface to get AI questions and feedback
7. **Manage**: Remove cards from the queue when done

### Architecture

- Cards added to queue are moved to the "Anki-chan" deck
- Original deck information is stored using tags: `anki-chan-origin::{deckName}`
- Removing cards from queue moves them back to their original decks
- Study sessions use Anki's native GUI for card review
- AI assistance runs in parallel in the web interface

Anki-chan aims to be a lightweight, privacy-friendly, and highly customizable companion that works entirely on the user's local machine.

---

## 中文

### 概述

**Anki酱** 是一个基于 AnkiConnect 的 AI 学习助手。它通过提供 AI 生成的问题和反馈来增强你的学习体验，同时利用 Anki 原生的间隔重复算法。

核心理念很简单：学习者不再只是默默回忆答案，而是*教授*、*解释*和*回应* AI 提示。这将复习过程转变为一种主动对话，从而增强记忆、发现不确定性并支持更深入的理解。

### 核心特性

- **单一队列系统**：使用专用的 "Anki-chan" 牌组作为学习队列
- **智能卡片管理**：从任意牌组添加卡片到队列，自动追踪原始位置
- **AI 辅助学习**：
  - 基于卡片内容生成 AI 问题
  - 对你的答案提供智能反馈
  - 可自定义 AI 模型和角色
- **原生 Anki 集成**：
  - 使用 Anki 内置的间隔重复算法
  - 直接同步评分（重来/困难/良好/简单）到 Anki
  - 打开 Anki 原生复习界面进行学习
- **灵活的卡片组织**：
  - 浏览和搜索所有牌组的卡片
  - 将选中的卡片添加到学习队列
  - 将卡片移回原始牌组

### 工作原理

1. **添加卡片**：浏览你的 Anki 牌组并添加卡片到 "Anki-chan" 队列
2. **开始学习**：系统打开 Anki 复习界面，同时在网页界面提供 AI 辅助
3. **AI 互动**：获取 AI 生成的问题和反馈，加深理解
4. **评分卡片**：使用 Anki 原生评分按钮（重来/困难/良好/简单）安排复习
5. **管理队列**：从队列中移除卡片，将其返回原始牌组

### 技术栈

- **后端**：Node.js + Express
- **前端**：原生 JavaScript
- **集成**：AnkiConnect API
- **AI**：可配置的 AI 模型（支持 OpenAI 兼容 API）

### 前置要求

- Anki 桌面应用
- 已安装 [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 插件
- Node.js（v14 或更高版本）

### 安装步骤

1. 在 Anki 中安装 AnkiConnect 插件
2. 克隆此仓库
3. 安装依赖：
   ```bash
   cd core
   npm install
   ```
4. 在网页界面配置 AI 设置
5. 启动服务器：
   ```bash
   npm start
   ```
6. 在浏览器中打开 http://localhost:3000

### 使用方法

1. **配置 AI 设置**：点击 "Settings" 添加你的 AI 模型和角色
2. **浏览牌组**：查看所有 Anki 牌组（Anki-chan 除外）
3. **添加到队列**：选择卡片并点击 "Add selected to Queue"
4. **开始学习**：切换到 "Study Queue" 标签页，点击任意卡片开始学习
5. **复习**：系统打开 Anki 复习界面 - 像往常一样评分卡片
6. **AI 辅助**：使用网页界面获取 AI 问题和反馈
7. **管理**：完成后从队列中移除卡片

### 架构设计

- 添加到队列的卡片会被移动到 "Anki-chan" 牌组
- 原始牌组信息通过标签存储：`anki-chan-origin::{牌组名}`
- 从队列移除卡片时会将其移回原始牌组
- 学习会话使用 Anki 原生 GUI 进行卡片复习
- AI 辅助在网页界面并行运行

Anki酱旨在成为一个轻量级、注重隐私且高度可定制的伴侣，完全在用户的本地机器上运行。

### 许可证

MIT License

### 贡献

欢迎提交 Issue 和 Pull Request！
