# Product Documentation — Narrative Perception Atlas

> 本文档备份于 2026-07-27，从 TRAE 对话记录和项目代码中整理。

---

## 产品定位

Narrative Perception Atlas 是一个跨文化叙事感知仿真平台。用户输入任意文化事件、影视IP或社会议题，系统调用 DeepSeek 大语言模型，以 30 个预设文化透镜的身份分别给出第一印象式解读，揭示不同文化群体对同一叙事的认知差异、情感触发点和解读盲区。

与传统的舆情分析工具不同，NPA 不做统计聚合，而是模拟个体化的文化代入——每个透镜代表一种特定的文化身份（如"硅谷科技理性精英"、"中国平台文化青年"、"印度裔硅谷工程师"），拥有独立的价值观体系、审美偏好和解读惯性。

**目标用户：** 内容策略师、IP 运营方、跨文化传播研究者、出海品牌方、社会学/人类学研究者。

---

## 核心功能模块

### 1. Demo Mode — 产品展示模块

独立模块，不消耗 API Token，类似 Figma Prototype 的产品展示流程，为首次访问用户提供零门槛体验。

- **Welcome Experience**：首次访问展示 "Explore how different cultures perceive the same story."，提供 Start Demo / Skip Demo 双路径
- **固定 Demo Case（寄生虫 Parasite）**：预设 5 个文化透镜的完整分析结果（Lens06 硅谷科技理性精英、Lens24 艺术家/导演、Lens21 北美品牌受众、Lens29 历史长周期视角、Lens25 推荐算法视角），每个透镜包含第一印象、注意到、忽略了、文化解码四层分析
- **四步展示流程**：User Input（打字机效果）→ Lens Retrieval（逐张揭示）→ Narrative Analysis（逐块展开）→ 用户手动点击"阅读完毕，继续"→ Final Report（双 CTA 引导）
- **完成后双 CTA**：Analyze Your Own Story（进入 Simulator）/ Explore More Cases（返回 Demo Library）
- **完全独立于 Simulator**：使用固定数据（`demo-data.js`），不调用 DeepSeek API

### 2. 叙事感知仿真引擎（Narrative Simulator）

- 30 个文化透镜覆盖全球主要文化区域
- DeepSeek v4-pro 驱动，中文输出跨文化分析
- 分批推理架构：≤6 个透镜单批，7-15 个分 3 组，>15 个每批 5 个
- 跨组对比总结：多批推理完成后自动生成跨组张力分析
- 多阶段平滑进度条，实时显示推理进度和预计剩余时间

### 3. Lens Explorer — 交互式学习模块

4 阶段叙事训练关卡：

- **Stage 1 — Mission Briefing**：价值观猜测 + 触发词识别
- **Stage 2 — Detection Phase**：从 3 个叙事片段中识别真实反应（含干扰项）
- **Stage 3 — Field Intel**：预测真实案例中该群体的解读方式
- **Stage 4 — Final Verdict**：逐题真伪判断，三维评分（文化认知 / 受众预测 / 误读检测）

XP 经验值系统 + 4 个成就解锁 + localStorage 进度持久化

### 4. 证据层 — MCP 实时搜索

- Wikipedia 双语搜索（精确标题匹配 → 相关性校验 → 回退搜索）
- Reddit 多策略搜索（3 组并行：热门帖 / 观点讨论 / 争议帖）
- 智能平台链接生成（豆瓣、IMDb、微博、知乎、X、虎扑等）

### 5. 文化 IP 知识库

内置 10 个文化 IP 的结构化知识，推理时自动注入上下文：

| IP | 类型 | 核心冲突 |
|----|------|---------|
| 哪吒之魔童闹海 | 动画电影 | AI辅助制作 vs 手绘传统 |
| 三体 | 科幻小说/影视 | 文明存亡 vs 个体道德 |
| 庆余年 | 古装穿越剧 | 现代平等 vs 古代等级 |
| 我不是药神 | 现实主义电影 | 法律 vs 道德 |
| 马斯克 | 企业家/公众人物 | 创新自由 vs 社会责任 |
| 谷爱凌 | 运动员/商业IP | 国籍身份 vs 文化认同 |
| 芭比 | 电影/IP | 完美女性形象 vs 真实女性困境 |
| 我是歌手 | 音乐综艺 | 专业评价 vs 大众投票 |
| 黑神话：悟空 | 游戏 | 文化输出 vs 文化挪用 |
| 流浪地球 | 科幻电影 | 集体主义 vs 个人主义 |

每个 IP 包含字段：`name`、`creator`、`type`、`coreStory`、`keyConflict`、`socialMetaphor`、`hotTopics`（数组）、`globalBuzz`（按地区对象，覆盖中国、美国、日本、韩国、欧洲、东南亚、中东、全球华人）。

IP 匹配通过关键词触发，如 `['哪吒2','哪吒之魔童闹海','哪吒之魔童','哪吒']` → `哪吒`。

---

## UI 视觉设计规范

### 配色方案

80% 黑 / 15% 灰 / 5% 金配色体系：

```css
:root {
  --gold: #F4B400; --gold-dim: rgba(244,180,0,0.15); --gold-glow: rgba(244,180,0,0.25);
  --blue: #4A90D9; --blue-dim: rgba(74,144,217,0.12); --blue-glow: rgba(74,144,217,0.25);
  --cyan: #38bdf8; --cyan-dim: rgba(56,189,248,0.1);
  --surface: rgba(255,255,255,0.03); --surface-hover: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.08); --border-blue: rgba(74,144,217,0.15);
  --text: rgba(255,255,255,0.9); --text-dim: rgba(255,255,255,0.6); --text-muted: rgba(255,255,255,0.4);
  --universe-bg: #04060e; --deep-space: #02040a;
}
```

颜色语义：
- **黑色**：背景 / 宇宙 / 空间
- **金色**：判断 / 权重 / 输出结论（Explorer 主调）
- **蓝色**：世界结构 / 信息流 / 数据网络（Simulator 主调）；Explorer 内交互选项（challenge-option）的悬停/选中状态

### 字体

```html
<link href="https://fonts.googleapis.com/css2?family=VT323&family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

- **VT323**：复古终端窗口标题、引导语、Lens ID 标签
- **Orbitron**：科技感标题、FINAL VERDICT 等大字
- **Share Tech Mono**：等宽数据显示

### 视觉效果

- CRT 扫描线（`.crt-overlay`）：全屏重复线性渐变，opacity 0.5
- 屏幕闪烁（`@keyframes crt-flicker`）：5 秒周期，93% 处微闪
- 磷光发光（`.phosphor-glow`）：金色文字阴影
- 打字机动画（`@keyframes typewriter`）：1.5s steps(30)
- 光标闪烁（`@keyframes blink-cursor`）：1s 周期
- 虫洞过渡：空间切换时的扩张动画
- 世界地图背景：Canvas 实时渲染，鼠标轨迹粒子、能量节点

### 空间架构（Two-Level Space System）

- **Portal（门户）**：隐藏顶部栏，展示入口卡片
- **Simulator 空间**：显示顶部栏，标题"Narrative Simulator"，蓝色主调
- **Explorer 空间**：显示顶部栏，标题"Lens Explorer"，金色主调

切换时带有沉浸式过渡动画：
- 进入 Explorer：金色虫洞扩张动画
- 进入 Simulator：蓝色扫描线动画

---

## 前端模块划分

| 模块 | 实现位置 | 入口 |
|------|---------|------|
| Narrative Simulator | `NarrativeEngine` IIFE（index.html 第 11738 行） | `App.navigateTo('simulator')` |
| Lens Explorer | `LensExplorer` 对象（第 9840 行起） | `App.navigateTo('explorer')` |
| Report Renderer | `ReportRendererV10` 对象（第 12282 行） | `ReportRendererV10.render(result)` |
| Demo Mode | 独立文件 `demo-mode.js` + `demo-data.js` + `demo-style.css` | `DemoMode.showWelcome()` |

### Onboarding 与 Demo Mode 联动

```
首次访问 → Onboarding 引导 → 关闭后触发 DemoMode.onOnboardingClosed()
  → 首次（npa_demo_seen 未设置）→ showWelcome() 展示 Demo Welcome
  → 非首次（npa_demo_seen=1）→ navigateTo('simulator') + 添加重入按钮
```

localStorage 状态键：
- `npa_onboarded`：是否完成 Onboarding
- `npa_demo_seen`：是否看过 Demo
- `npa_explorer_progress`：Explorer 进度
- `knowledgeXP`：XP 积分
- `exploredLenses`：已探索透镜集合
- `exploredCases`：已探索案例集合
- `achievements`：成就解锁状态

---

## 技术约束

- 前端：纯静态 HTML + Tailwind CSS CDN + Vanilla JS，零依赖构建，单文件部署
- 不使用 React、Vue 或 Node.js 框架
- 中文为主显示语言，英文为辅
- API Key 通过环境变量注入，前端零泄露
- Demo Mode 不消耗 API Token，Simulator 使用 DeepSeek

---

*Built with curiosity about how different cultures perceive the same story.*
