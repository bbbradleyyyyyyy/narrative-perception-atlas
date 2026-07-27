# Changelog

## v1.0 — First Public Demo Release

> 2026-07-27

### Demo Mode — 产品展示模块

独立模块，不消耗 API Token，类似 Figma Prototype 的产品展示流程：

- **Welcome Experience**：首次访问展示 "Explore how different cultures perceive the same story."，提供 Start Demo / Skip Demo 双路径
- **固定 Demo Case（寄生虫 Parasite）**：预设 5 个文化透镜的完整分析结果（Lens06 硅谷科技理性精英、Lens24 艺术家/导演、Lens21 北美品牌受众、Lens29 历史长周期视角、Lens25 推荐算法视角），每个透镜包含第一印象、注意到、忽略了、文化解码四层分析
- **四步展示流程**：User Input（打字机效果）→ Lens Retrieval Animation（逐张揭示）→ Narrative Analysis（逐块展开）→ Final Report（双 CTA 引导）
- **完成后双 CTA**：Analyze Your Own Story（进入 Simulator）/ Explore More Cases（返回 Demo Library）
- **Skip Demo 逻辑**：跳过 Demo 直接进入 Simulator，保留 "Explore Demo Cases" 小入口供后续体验
- **完全独立于 Simulator**：Demo Mode 使用固定数据（`demo-data.js`），不调用 DeepSeek API，不影响 Simulator 正常逻辑

### 核心引擎

- **叙事感知仿真引擎**：输入任意事件/IP/议题，AI 扮演 30 个文化透镜，输出跨文化第一印象解读
- **30 个文化透镜**：覆盖北美、东亚、欧洲、南亚、中东、非洲、拉美等全球主要文化区域，每个透镜包含核心特质、解读偏好、情感触发点、误解模式、AI 推理模板和全球案例库
- **分批推理架构**：≤6 个透镜单批调用，7-15 个分 3 组，>15 个每批 5 个，解决单次 API token 上限
- **跨组对比总结**：多批推理完成后自动追加一次统合调用，提炼观点对立、意外共鸣和独特盲区
- **DeepSeek v4-pro 驱动**：思考模式（reasoning_content），max_tokens 根据透镜数量动态调整（上限 8192），强制中文输出
- **AbortController 超时控制**：前端 120 秒 fetch 超时 + 后端 180 秒代理超时

### 证据层 — MCP 实时搜索

- **Wikipedia 双语精确搜索**：精确标题匹配 → 相关性校验 → 回退搜索三级策略，避免模糊匹配返回无关内容
- **Reddit 多策略搜索**：3 组并行搜索（热门帖 / 观点讨论 / 争议帖），取前 6 篇高热度帖子并抓取 top 3 评论
- **智能平台链接**：根据查询内容类型（人物/IP/赛事/事件/文化现象）自动生成豆瓣、IMDb、烂番茄、Letterboxd、微博、知乎、X、虎扑、ESPN 等平台搜索链接
- **内容类型检测**：自动识别人物、影视作品、体育赛事、全球事件、文化现象五类查询

### 文化 IP 知识库

内置 10+ 中国文化 IP 结构化知识（哪吒 2、庆余年、黑神话、流浪地球、三体、沙丘、芭比、我是歌手、漫威、奥本海默等），包含核心故事、核心冲突、全球评价和热议议题，推理时自动注入上下文

### Lens Explorer — 交互式学习模块

4 阶段叙事认知训练关卡：

- **Stage 1 — Mission Briefing**：价值观猜测 + 触发词识别，理解文化透镜的认知框架
- **Stage 2 — Detection Phase**：从 3 个叙事片段中识别该群体的真实反应（含干扰项），选择后锁定答案才显示解析
- **Stage 3 — Field Intel**：预测真实案例中该群体的解读方式，完成 1 个 case 即解锁 Stage 4
- **Stage 4 — Final Verdict**：逐题真伪判断，每题锁定答案后显示正确/错误解析，最后展示三维评分（文化认知 / 受众预测 / 误读检测）

XP 经验值系统 + 4 个成就解锁 + localStorage 进度持久化

### 产品体验

- **Onboarding 首次访问引导**：3 步高亮说明，关闭后自动触发 Demo Mode Welcome
- **Skeleton Loading 骨架屏** + 多阶段平滑进度条（显示批次进度和透镜数量）
- **友好错误卡片** + 重试 / 减少透镜 / 清空重来三种恢复路径
- **空状态三步引导**：输入 → 选透镜 → 启动推演
- **Lens 选择器**：搜索框 + 清空按钮 + 按区域颜色分组 + 过滤计数
- **报告交互**：复制全文、分享链接、回到顶部
- **Explorer 数据互通**：Explorer 里解锁的 Lens 在 Simulator 中高亮标注「已学习」

### 视觉设计

- 80% 黑 / 15% 灰 / 5% 金配色体系，glassmorphism + 软发光视觉语言
- CRT 扫描线、琥珀色磷光文字、VT323 像素字体、终端窗口边框复古未来主义风格
- Portal → Level 1 全屏沉浸式过渡动画（粒子汇聚、虫洞效果、宇宙膨胀）
- Narrative Simulator 蓝色主调 / Lens Explorer 金色主调，两个空间独立视觉身份
- 鼠标粒子流动效果 + 世界地图 Canvas 动态背景

### 技术架构

- **前端**：纯静态 HTML + Tailwind CSS CDN + Vanilla JS，零依赖构建，单文件部署
- **后端**：Cloudflare Pages Functions（`/api/deepseek`、`/api/health`、`/api/mcp-reviews`）
- **部署**：Cloudflare Pages + GitHub 自动部署，push 即上线
- **本地开发**：Node.js `server.js`，支持 HTTPS 代理隧道（Clash/V2Ray）

### 安全与合规

- API Key 仅通过 Cloudflare 环境变量注入，前端零泄露
- `.env` / `.env_*` 已加入 `.gitignore`
- `functions/api/deepseek.js` catch 块模糊化错误信息，不暴露内部路径
- `functions/api/health.js` 支持 OPTIONS 预检请求
- `_headers` 配置 CORS 全局放通 + 静态资源长期缓存

---

## 未来 Roadmap

### Phase 1 — 稳定与优化

- [ ] 推理结果缓存（相同 query + lens 组合复用结果，降低 API 成本）
- [ ] 错误重试 + 指数退避策略
- [ ] 移动端适配（Lens Explorer 4 阶段训练布局重构）
- [ ] 中间结果逐步展示优化
- [ ] 报告 TOC 导航条（快速跳转到各 Lens 视角）
- [ ] 更多 Demo Case 扩充（电影 × 历史 × 游戏跨品类覆盖）

### Phase 2 — 数据与洞察

- [ ] 推理结果持久化存储（Cloudflare D1 / Durable Objects）
- [ ] 历史分析仪表盘：按 IP / 事件 / 区域聚合，对比时间窗口叙事变化
- [ ] 文化透镜热度图：可视化哪些透镜对特定事件反应最强烈
- [ ] 导出功能：PDF 报告、CSV 数据表格

### Phase 3 — 交互与协作

- [ ] 用户自定义文化透镜（创建、编辑、分享）
- [ ] 多用户协作工作区（共享分析、评论、标注）
- [ ] 对比模式：并排查看两个透镜的解读差异
- [ ] 开放 REST API 供第三方集成

### Phase 4 — 模型与扩展

- [ ] 多模型支持：Claude、GPT-4o、Qwen 等可选推理后端
- [ ] 多语言输出：英文、日文、韩文分析
- [ ] 实时事件流：接入新闻 API，自动检测热点事件并触发批量分析
- [ ] AI 文化偏见检测：分析模型本身在不同透镜上的系统性偏差

---

*Built with curiosity about how different cultures perceive the same story.*
