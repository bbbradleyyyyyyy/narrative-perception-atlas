# Changelog

## v1.0 — First Public Demo Release

> 2026-07-27

### 核心功能

- **叙事感知仿真引擎**：输入任意事件/IP/议题，AI 扮演 30 个文化透镜，给出跨文化第一印象解读
- **30 个文化透镜**：覆盖北美、东亚、欧洲、南亚、中东、非洲、拉美等全球主要文化区域
- **文化 IP 知识库**：内置哪吒 2、庆余年、三体、黑神话、流浪地球等 10+ 中国文化 IP 的结构化知识
- **证据层 — MCP 实时搜索**：Wikipedia 双语精确搜索 + Reddit 多策略搜索聚合
- **分批推理架构**：1-6 个透镜单批，7-15 个分 3 组，16-30 个分 5-6 组，解决单次 API token 上限
- **跨组对比总结**：多批推理后自动生成观点对立、意外共鸣和独特盲区分析
- **Lens Explorer 交互学习**：4 阶段认知训练关卡（Mission Briefing → Detection → Field Intel → Final Verdict）

### 产品体验

- 一键体验 Demo 按钮，预设热门内容，零门槛感受产品价值
- Skeleton Loading 骨架屏 + 多阶段平滑进度条，推理等待不再焦虑
- 友好错误卡片 + 重试/清空按钮，API 失败时有退路
- 空状态三步引导，新用户知道怎么开始
- Onboarding 首次访问引导，3 步说明产品价值和使用方式
- Lens 选择器支持搜索、全选/清空、按区域颜色分组
- 报告支持复制全文、分享链接、回到顶部
- Explorer 进度 localStorage 持久化，刷新不丢失

### 技术架构

- 前端：纯静态 HTML + Tailwind CSS + Vanilla JS，零依赖构建
- 后端：Cloudflare Pages Functions（/api/deepseek、/api/health、/api/mcp-reviews）
- AI 模型：DeepSeek v4-pro（思考模式，支持 reasoning_content）
- 部署：Cloudflare Pages + GitHub 自动部署

### 安全与合规

- API Key 仅通过 Cloudflare 环境变量注入，前端零泄露
- Git 历史无密钥泄露
- `.env` / `.env_*` 已加入 `.gitignore`
- `functions/api/deepseek.js` catch 块已模糊化错误信息，不暴露内部路径

---

## 未来 Roadmap

### Phase 1 — 稳定与优化

- [ ] 推理结果缓存（相同 query + lens 组合复用，降低 API 成本）
- [ ] 错误重试 + 指数退避策略
- [ ] 移动端适配（Lens Explorer 4 阶段训练）
- [ ] 中间结果展示（分批推理时每完成一批即展示该批结果）

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
