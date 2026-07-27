# Narrative Perception Atlas

> 跨文化叙事感知引擎 — 让 AI 扮演 30 种文化身份，模拟同一事件在不同价值观群体中的认知路径。

---

## 产品定位

Narrative Perception Atlas 是一个**跨文化叙事感知仿真平台**。用户输入任意文化事件、影视IP或社会议题，系统调用 DeepSeek 大语言模型，以 30 个预设文化透镜的身份分别给出第一印象式解读，揭示不同文化群体对同一叙事的认知差异、情感触发点和解读盲区。

与传统的舆情分析工具不同，NPA 不做统计聚合，而是**模拟个体化的文化代入**——每个透镜代表一种特定的文化身份（如"硅谷科技理性精英"、"中国平台文化青年"、"印度裔硅谷工程师"），拥有独立的价值观体系、审美偏好和解读惯性。这种设计使 NPA 成为内容策略、跨文化传播、IP 出海评估和学术研究的独特工具。

**目标用户：** 内容策略师、IP 运营方、跨文化传播研究者、出海品牌方、社会学/人类学研究者。

---

## 核心功能

### 叙事感知仿真引擎

- **30 个文化透镜**覆盖全球主要文化区域（北美、东亚、欧洲、南亚、中东、非洲、拉美），每个透镜包含核心特质、解读偏好和情感触发点
- **DeepSeek v4-pro 驱动**，以中文输出跨文化分析，兼顾直觉反应与深度文化解码
- **分批推理架构**：1-6 个透镜单批调用，7-15 个分 3 组，16-30 个分 5-6 组，解决单次 API token 上限问题
- **跨组对比总结**：多批推理完成后自动生成跨组张力分析，提炼观点对立、意外共鸣和独特盲区
- **多阶段平滑进度条**，实时显示推理进度和预计剩余时间

### 文化 IP 知识库

内置 10+ 中国文化 IP 的结构化知识（哪吒 2、庆余年、黑神话、三体、流浪地球等），包含核心故事、核心冲突、全球评价和热议议题，在推理时自动注入上下文。

### 证据层 — MCP 实时搜索

- **Wikipedia 双语搜索**：精确标题匹配 → 相关性校验 → 回退搜索的三级策略，避免模糊匹配返回无关内容
- **Reddit 多策略搜索**：3 组并行搜索（热门帖 / 观点讨论 / 争议帖），取前 6 篇高热度帖子并抓取高赞评论
- **智能平台链接**：根据查询内容类型（人物/IP/赛事/事件）自动生成豆瓣、IMDb、微博、知乎、X、虎扑等平台搜索链接

### Lens Explorer — 交互式学习模块

4 阶段叙事训练关卡，帮助用户理解不同文化透镜的思维方式：

- **Stage 1 — Mission Briefing**：阅读文化透镜的认知框架
- **Stage 2 — Detection Phase**：从 3 个叙事片段中识别该群体的真实反应（含干扰项）
- **Stage 3 — Field Intel**：预测真实案例中该群体的解读方式
- **Stage 4 — Final Verdict**：三道真伪判断题，检验学习成果

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│  ┌───────────────────────────────────────────┐  │
│  │        index.html (SPA, ~12,000 lines)    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │Narrative │  │  Lens    │  │ Report  │ │  │
│  │  │Simulator │  │ Explorer │  │Renderer │ │  │
│  │  └────┬─────┘  └──────────┘  └─────────┘ │  │
│  └───────┼───────────────────────────────────┘  │
└──────────┼──────────────────────────────────────┘
           │ HTTPS
┌──────────┼──────────────────────────────────────┐
│  Cloudflare Pages                               │
│  ┌───────┴────────────────────────────────────┐ │
│  │         functions/api/                      │ │
│  │  ┌──────────┐ ┌────────┐ ┌──────────────┐ │ │
│  │  │deepseek  │ │health  │ │ mcp-reviews  │ │ │
│  │  │ proxy    │ │ check  │ │ (Wiki+Reddit)│ │ │
│  │  └────┬─────┘ └────────┘ └──────┬───────┘ │ │
│  └───────┼─────────────────────────┼──────────┘ │
└──────────┼─────────────────────────┼────────────┘
           │                         │
    ┌──────▼──────┐         ┌───────▼────────┐
    │ DeepSeek    │         │  Wikipedia     │
    │ API (v4-pro)│         │  Reddit JSON   │
    └─────────────┘         └────────────────┘
```

**前端：** 纯静态 HTML + Tailwind CSS CDN + Vanilla JS，零依赖构建，单文件部署。

**后端 API（Cloudflare Pages Functions）：**
- `/api/deepseek` — DeepSeek API 代理，密钥从 Cloudflare 环境变量读取，不暴露给前端
- `/api/health` — 引擎状态检查
- `/api/mcp-reviews` — Wikipedia 双语搜索 + Reddit 多策略搜索聚合

**AI 模型：** DeepSeek v4-pro（思考模式），支持 reasoning_content 思维链，max_tokens 根据选中透镜数量动态调整（上限 8192）。

**部署：** Cloudflare Pages + GitHub 自动部署，push 即上线。

---

## 文件结构

```
narrative-perception-atlas/
├── index.html                  # 前端 SPA（Narrative Simulator + Lens Explorer + Report Renderer）
├── functions/api/              # Cloudflare Pages Functions
│   ├── deepseek.js             # DeepSeek API 代理
│   ├── health.js               # 引擎健康检查
│   └── mcp-reviews.js          # Wikipedia + Reddit 证据层
├── wrangler.toml               # Cloudflare 配置
├── _headers                    # CORS + 静态资源缓存策略
├── server.js                   # 本地开发服务器（不部署到 Cloudflare）
├── assets/                     # 静态图片资源
│   ├── hero_observatory_1024x576.jpg
│   ├── ai_chamber_1024x576.jpg
│   ├── civilization_tree_1024x576.jpg
│   ├── cozy_room_1024x576.jpg
│   └── lens_detail_1024x576.jpg
├── .gitignore                  # 排除 .env / node_modules / 备份文件
└── README.md                   # 本文档
```

---

## 部署方式

### 前置条件

- GitHub 账号
- Cloudflare 账号
- DeepSeek API Key（从 [platform.deepseek.com](https://platform.deepseek.com) 获取）

### 步骤

**1. Fork 本仓库到你的 GitHub**

**2. Cloudflare Dashboard 操作**

- 进入 Workers & Pages → Create → 选择 GitHub 连接
- 选择 `narrative-perception-atlas` 仓库
- 构建设置：
  - Framework preset: `None`
  - Build command: `echo skip`
  - Build output directory: `/`
- 环境变量：
  - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key（Production + Preview 都勾选）
- 点击 Save and Deploy

**3. 验证部署**

```bash
# 检查引擎状态
curl https://your-project.pages.dev/api/health
# 预期返回: {"status":"ok","model":"deepseek-v4-pro"}

# 测试 MCP 搜索
curl -X POST https://your-project.pages.dev/api/mcp-reviews \
  -H "Content-Type: application/json" \
  -d '{"query":"哪吒2"}'
```

### 本地开发

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 启动本地开发服务器
npx wrangler pages dev . --binding DEEPSEEK_API_KEY=your-key

# 或者使用 Node.js 本地服务器
node server.js
```

---

## 后续开发路线

### Phase 1 — 稳定与优化（当前）

- [x] 30 个文化透镜覆盖全球主要区域
- [x] DeepSeek v4-pro 推理 + 分批架构
- [x] Wikipedia + Reddit 证据层
- [x] 4 阶段 Lens Explorer 交互学习模块
- [x] Cloudflare Pages 生产部署
- [ ] 推理结果缓存（相同 query + 相同 lens 组合复用结果，降低 API 成本）
- [ ] 错误重试 + 指数退避策略

### Phase 2 — 数据与洞察

- [ ] 推理结果持久化存储（Cloudflare D1 或 Durable Objects）
- [ ] 历史分析仪表盘：按 IP / 事件 / 文化区域聚合，对比不同时间窗口的叙事变化
- [ ] 文化透镜热度图：可视化哪些透镜对特定事件反应最强烈
- [ ] 导出功能：PDF 报告、CSV 数据表格

### Phase 3 — 交互与协作

- [ ] 用户自定义文化透镜（创建、编辑、分享）
- [ ] 多用户协作工作区（共享分析结果、评论、标注）
- [ ] 对比模式：并排查看两个透镜对同一事件的解读差异
- [ ] API 接口：开放 REST API 供第三方集成

### Phase 4 — 模型与扩展

- [ ] 多模型支持：Claude、GPT-4o、Qwen 等作为可选推理后端
- [ ] 多语言输出：英文、日文、韩文分析
- [ ] 实时事件流：接入新闻 API，自动检测热点事件并触发批量分析
- [ ] 文化偏见检测：分析 AI 模型本身在不同文化透镜上的系统性偏差

---

## 技术选型

| 层级 | 技术 | 选择理由 |
|------|------|---------|
| 前端 | HTML + Tailwind CSS + Vanilla JS | 零构建、零依赖、单文件部署，CDN 加载 |
| 后端 | Cloudflare Pages Functions | 全球边缘网络、免费额度充裕、GitHub 自动部署 |
| AI 模型 | DeepSeek v4-pro | 中文理解能力强、思考模式支持推理链、性价比高 |
| 证据层 | Wikipedia API + Reddit JSON API | 公开 API、无需认证、提供结构化上下文 |
| 部署 | Cloudflare Pages + GitHub | Push 即部署、自动 SSL、全球 CDN |

---

## 许可

本项目采用 MIT 许可。欢迎 Fork、修改和商业使用。

---

*Built with curiosity about how different cultures perceive the same story.*