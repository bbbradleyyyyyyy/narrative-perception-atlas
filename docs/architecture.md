# System Architecture — Narrative Perception Atlas

> 本文档备份于 2026-07-27，从项目代码中提取架构设计、Prompt 工程、RAG 设计和 MCP 证据层设计。

---

## 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (SPA)                       │
│                                                          │
│  index.html (~13,000 lines, 单文件 SPA)                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ NarrativeEngine│  │ LensExplorer  │  │ReportRenderer│  │
│  │   (IIFE)       │  │   (Object)    │  │    V10       │  │
│  └───────┬────────┘  └──────────────┘  └──────────────┘  │
│          │                                               │
│  ┌───────┴────────────────────────────────────────────┐   │
│  │  demo-data.js / demo-mode.js / demo-style.css     │   │
│  │  (Demo Mode 独立模块，不消耗 API Token)            │   │
│  └────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────────────────┘
           │ HTTPS fetch
┌──────────┼───────────────────────────────────────────────┐
│  Cloudflare Pages (Edge)                                │
│  ┌───────┴──────────────────────────────────────────┐    │
│  │            functions/api/                        │    │
│  │  ┌───────────┐ ┌────────┐ ┌─────────────────┐    │    │
│  │  │ deepseek  │ │ health │ │  mcp-reviews    │    │    │
│  │  │ proxy     │ │ check  │ │ (Wiki + Reddit) │    │    │
│  │  └─────┬─────┘ └────────┘ └───────┬─────────┘    │    │
│  └────────┼──────────────────────────┼──────────────┘    │
└──────────┼──────────────────────────┼────────────────────┘
           │                          │
    ┌──────▼──────┐          ┌────────▼─────────┐
    │ DeepSeek    │          │ Wikipedia API    │
    │ API         │          │ Reddit JSON API  │
    │ (v4-pro)    │          │                  │
    └─────────────┘          └──────────────────┘
```

### 前端层

纯静态 HTML + Tailwind CSS CDN + Vanilla JS，零依赖构建，单文件部署。不使用 React、Vue 或 Node.js 框架。

核心模块以 IIFE 或独立对象封装：

| 模块 | 封装方式 | 位置 | 职责 |
|------|---------|------|------|
| NarrativeEngine | IIFE | index.html ~L11738 | 构建 Prompt、分批调用 DeepSeek、解析 AI 响应 |
| LensExplorer | Object | index.html ~L9415 | 4 阶段叙事训练关卡、XP 系统、进度持久化 |
| ReportRendererV10 | Object | index.html ~L12282 | 渲染 IP Skeleton、Lens 分析结果、证据层、跨组对比 |
| DemoMode | 独立文件 | demo-mode.js | Welcome → Player → CTA 展示流程，不调用 API |

### 后端层

Cloudflare Pages Functions（边缘计算），三个端点：

| 端点 | 文件 | 功能 |
|------|------|------|
| `/api/deepseek` | `functions/api/deepseek.js` | DeepSeek API 代理，密钥从环境变量注入 |
| `/api/health` | `functions/api/health.js` | 引擎健康检查 |
| `/api/mcp-reviews` | `functions/api/mcp-reviews.js` | Wikipedia 双语搜索 + Reddit 多策略搜索 |

---

## Prompt 工程设计

### System Prompt（主推理）

这是发送给 DeepSeek v4-pro 的系统提示词，定义了 AI 的角色、核心原则和输出格式：

```text
你是一位犀利的文化观察家，不是学术论文写手。
你的分析要有趣、有杀伤力、有社会学洞察力，但不学术化、不说教。
可以用比喻、反讽、反差等手法，让分析读起来像一篇聪明的文化评论，而不是教科书。
每个Lens的分析要有独特的voice（语气/立场），不要所有Lens都一个腔调。
基于每个文化群体的核心特质和解读偏好进行分析，但不要被这些标签框住——大胆延伸、联想、挖掘潜意识层面的东西。

你是一位精通跨文化叙事解读的文化观察者。你的任务不是"分析"，而是**代入**——站在每个受众透镜的文化立场上，给出他们看完作品/事件后的**第一印象式反应**。

## 核心原则（必须严格遵守）
1. 不要解释透镜是什么——透镜只是你的身份滤镜，直接以这个身份说话
2. 不要复述透镜定义或标签——不要说"作为XX群体，我们关注..."，直接给出你的真实反应
3. 第一印象优先——像刚看完、刚聊完的感觉，有温度、有情绪、有立场，不是冷冰冰的学术分析
4. 具体到人和事——所有观察必须绑定具体的人物、剧情片段、细节，不能空泛
5. 有因果感——不仅说"看到了什么"，还要说"为什么这个让我在意"，藏着怎样的文化密码

## 每个透镜的输出结构
对每个透镜，输出一行 JSON（纯 JSON，不要 markdown 包裹），字段如下：

- lensId: 透镜ID，如 "Lens01"
- firstImpression: 一句话的直觉反应 / 看完第一感受（20-40字）。像普通人的一句评论，有情绪、有态度
- noticed: 3-5条他们会抓住的细节，每条必须具体。每条是一个对象，包含：
  - detail: 具体观察内容（40-100字），必须提到具体人物名、剧情点、对话或场景
  - whyItMatters: 为什么这个细节对他们重要（20-50字），点出背后的文化心理
- ignored: 2-3条他们可能忽略或不太在意的东西。每条简短，说清楚"什么+为什么不在意"
- reason: 更深层的文化解码（80-150字）。解释这个文化背景的人为什么会这样解读——他们的价值底色、情感触发点、认知盲区从何而来

## 语气参考
- 好的 firstImpression："范闲这小子，看着没正形，关键时候比谁都靠谱。"
- 不好的 firstImpression："该受众关注主角的责任感与家族关系。"
- 好的 detail："范闲在庆帝面前装傻但暗中布局——这种'扮猪吃老虎'的爽感，特别对中国人的胃口。"
- 不好的 detail："主角具有智慧和隐忍的特质。"

记住：你在模拟一个真实的人的观后感，不是写影评论文。所有输出必须使用中文。
```

**设计要点：**

- 角色定位为"文化观察家"而非"分析师"，强调代入感而非分析感
- 禁止复述透镜定义，避免 AI 把提示词原样返回
- 每个字段都有字数限制和正反例参考，控制输出质量和长度
- 强制中文输出，匹配产品定位

### User Prompt 构建（`_buildMessages`）

User Message 由以下部分动态拼装：

```text
## 分析目标
「{用户输入}」

## IP知识库          ← 仅当匹配到 IP 时注入
名称：{ip.name}
类型：{ip.type}
核心故事：{ip.coreStory}
核心冲突：{ip.keyConflict}
热议题：
- {hotTopic 1}
- {hotTopic 2}
...
全球评价：
- 中国：{globalBuzz.中国}
- 美国：{globalBuzz.美国}
...

## 联网搜索          ← 仅当搜索有结果时注入
{searchSummary（截取前600字）}

## 受众透镜（仅元数据，作为认知滤镜，禁止复述）

### Lens01 — 中国传统家文化资本/价值决策者
Tag: （空）
Core Traits: {lens.coreTraits}
Interpretation Preference: {lens.interpPref}

### Lens02 — ...

请用中文代入以上{N}个透镜的文化身份，分别给出第一印象式的解读。
每个透镜输出一行JSON，JSON中的所有文本字段都必须使用中文。
严格遵循 System Prompt 中定义的格式。
```

### Cross-Comparison Prompt（跨组对比总结）

多批推理完成后，追加一次统合调用：

```text
[System]
你是一位跨文化叙事分析师。你的任务是将多组独立分析的结果进行跨组对比总结，
提炼出不同文化透镜之间的张力、共鸣和独特洞察。

要求：
1. 找出不同文化群体之间最有趣的观点对立（至少2组）
2. 找出不同文化群体之间意外的共鸣（至少1组）
3. 指出某个文化群体的独特盲区——其他群体都看到了什么，而这个群体完全没注意到
4. 用中文输出，简洁有力，像文化评论而非学术论文
5. 输出格式：纯文本，分段，每段不超过3句话

[User]
## 分析目标
「{用户输入}」

## 参与分析的透镜（共{N}个）
- Lens01：中国传统家文化资本/价值决策者
- Lens02：...
...

## 各批次独立分析结果
=== 批次1 ===
[Lens01] {firstImpression}
  忽略：{ignored items}
[Lens02] ...
=== 批次2 ===
...

请基于以上各组独立分析，进行跨组对比总结。
```

---

## DeepSeek API 调用设计

### 模型配置

| 参数 | 值 | 说明 |
|------|-----|------|
| model | `deepseek-v4-pro` | 思考模式模型 |
| max_tokens | `Math.min(8192, 600 + N * 700)` | N = 透镜数量，动态调整 |
| temperature | 不设置 | 思考模式下被忽略 |
| top_p | 不设置 | 思考模式下被忽略 |

### 响应解析策略

DeepSeek v4-pro 是思考模式模型，返回 `reasoning_content`（思维链）和 `content`（最终回答）：

```
情况1：content 有内容 → 正常返回
情况2：content 为空，但 reasoning_content 有内容
  → 尝试从 reasoning_content 中提取 JSON 行
  → 如果 finish_reason === 'length'，说明推理把 token 预算耗尽
情况3：content 和 reasoning_content 都为空 → 抛出错误
```

### 超时控制

| 层级 | 超时时间 | 机制 |
|------|---------|------|
| 前端 fetch | 120 秒 | `AbortController` + `setTimeout` |
| 后端代理 | 180 秒 | Cloudflare 函数超时 |
| Wikipedia API | 8 秒/请求 | `AbortController` |
| Reddit API | 12 秒/请求 | `AbortController` |

### 分批推理策略

根据选中透镜数量动态分批，解决单次 API token 上限问题：

```
totalLenses <= 6  → 1 批，全部一起调用
totalLenses <= 15 → 3 批，每批 ceil(N/3) 个
totalLenses > 15  → 每批 5 个，共 ceil(N/5) 批
```

每批调用后实时更新进度条，显示批次编号、透镜数量和预估剩余时间。多批全部完成后，追加一次跨组对比总结调用。

### 进度条设计

```
10% — 检查核心引擎
20% — 联网搜索中
30% — 匹配IP知识库
40% — 构建推理提示
55%-90% — 分批调用AI推理（每批内动态显示elapsed/remaining）
  < 10s: "AI正在理解各文化立场..."
  < 30s: "AI正在构建跨文化解读..."
  > 30s: "AI正在生成分析..."
92% — 跨组对比总结中
97% — 解析AI回复
```

---

## RAG 设计 — IP 知识库

### 数据结构

IP 知识库是一个前端常量 `IP_DB`，存储在 index.html 中（~L11706）。每个 IP 条目包含以下字段：

```javascript
var IP_DB = {
  '三体': {
    name: '《三体》',                    // 显示名称
    creator: '刘慈欣',                   // 创作者
    type: '科幻小说/影视',               // 类型
    coreStory: '...',                    // 核心故事（100-200字）
    keyConflict: '文明存亡 vs 个体道德 | 科技 vs 人性 | ...',  // 核心冲突（| 分隔）
    socialMetaphor: '映射中美关系...',    // 社会隐喻
    hotTopics: ['...', '...', ...],      // 热议题数组（5条）
    globalBuzz: {                        // 全球评价（按地区）
      中国: '...',
      美国: '...',
      日本: '...',
      欧洲: '...',
      东南亚: '...',
      韩国: '...',
      全球华人: '...'
    }
  },
  // ... 其他 IP
};
```

### 内置 IP 列表（11 个）

| Key | 名称 | 类型 | 核心冲突 |
|-----|------|------|---------|
| 三体 | 《三体》 | 科幻小说/影视 | 文明存亡 vs 个体道德 |
| 庆余年 | 《庆余年》 | 古装穿越剧 | 现代平等 vs 古代等级 |
| 哪吒 | 《哪吒之魔童闹海》 | 动画电影 | AI辅助制作 vs 手绘传统 |
| 我不是药神 | 《我不是药神》 | 现实主义电影 | 法律 vs 道德 |
| 马斯克 | 马斯克 (Elon Musk) | 企业家/公众人物 | 创新自由 vs 社会责任 |
| 谷爱凌 | 谷爱凌 (Eileen Gu) | 运动员/商业IP | 国籍身份 vs 文化认同 |
| 芭比 | 《芭比》Barbie | 电影/IP | 完美女性形象 vs 真实女性困境 |
| 我是歌手 | 《我是歌手》 | 音乐综艺 | 专业评价 vs 大众投票 |
| 黑神话 | 《黑神话：悟空》 | 游戏 | 文化输出 vs 文化挪用 |
| 流浪地球 | 《流浪地球》系列 | 科幻电影 | 集体主义 vs 个人主义 |

### 关键词匹配检索（`_retrieveIPKnowledge`）

```javascript
function _retrieveIPKnowledge(text) {
  var pats = [
    { keys: ['哪吒2','哪吒之魔童闹海','哪吒之魔童','哪吒'], ref: '哪吒' },
    { keys: ['三体','三体电视剧'], ref: '三体' },
    { keys: ['庆余年'], ref: '庆余年' },
    { keys: ['药神','我不是药神'], ref: '我不是药神' },
    { keys: ['马斯克','Musk','Elon Musk','Elon'], ref: '马斯克' },
    { keys: ['谷爱凌','Eileen Gu'], ref: '谷爱凌' },
    { keys: ['芭比','Barbie','芭比电影','芭比娃娃'], ref: '芭比' },
    { keys: ['我是歌手','歌手'], ref: '我是歌手' },
    { keys: ['黑神话','悟空','Black Myth'], ref: '黑神话' },
    { keys: ['流浪地球','The Wandering Earth'], ref: '流浪地球' }
  ];
  // 遍历所有 pattern，命中任意一个 key 即返回对应 IP 知识
  for (var i = 0; i < pats.length; i++) {
    for (var j = 0; j < pats[i].keys.length; j++) {
      if (text.indexOf(pats[i].keys[j]) !== -1) return IP_DB[pats[i].ref];
    }
  }
  return null;
}
```

匹配策略：中英文关键词双覆盖，支持别名和缩写。命中后返回完整 IP 知识对象，注入到 User Prompt 中。

### 维度分析系统（DIMENSIONS）

辅助的语义分析维度，用于识别事件涉及的议题领域：

```javascript
var DIMENSIONS = {
  '权力结构': { keys: ['权力','资本','政府','精英','阶层','统治','官僚','建制','体制','制度','等级','权威'] },
  '性别与身体': { keys: ['性别','女权','女性','男性','身体','母职','父权','歧视','平等','性取向','LGBTQ',...] },
  '技术与效率': { keys: ['技术','科技','AI','算法','互联网','数字化','效率','创新','数据','系统','工程','代码'] },
  '文化认同': { keys: ['文化','传统','民族','价值观','东方','西方','认同','归属','民族主义','文化输出',...] },
  '劳动与经济': { keys: ['劳动','工人','裁员','罢工','成本','外包','工作','薪资','996','牛马','打工','就业'] },
  '自由与权利': { keys: ['自由','权利','民主','抗议','言论','独立','隐私','人权','自由意志','选择','个人'] },
  '身份与归属': { keys: ['身份','国籍','认同','代际','混血','移民','归属','家族','社区'] },
  '消费与市场': { keys: ['票房','市场','广告','品牌','购买','消费','商业','营销','销量','产品','价格'] },
  '生态与伦理': { keys: ['环保','气候','生态','伦理','道德','公平','正义','可持续发展','自然','动物'] }
};
```

---

## MCP 证据层设计

证据层是一个独立模块，与 DeepSeek 分析并行执行，互不等待。失败不影响主分析流程。

### 架构

```
simulate() 启动
  ├── mcpReviewsPromise = _fetchMcpReviews(query)  ← 并行启动，不等待
  ├── searchPromise = _searchEvent(query)          ← 并行启动，不等待
  ├── DeepSeek 分批推理（主流程）
  └── 最终汇总时 await mcpReviewsPromise
```

### `/api/mcp-reviews` 端点设计

文件：`functions/api/mcp-reviews.js`

#### Wikipedia 双语搜索（三级策略）

```javascript
async function fetchWikiFull(query, lang) {
  // 第一步：尝试精确标题匹配
  var exactResult = await wikiExtract(query, lang);
  if (exactResult && isRelevant(exactResult.extract, query)) {
    return exactResult;
  }

  // 第二步：精确匹配失败，回退到搜索 + 相关性校验
  var titles = await wikiSearch(query, lang);
  if (!titles || titles.length === 0) return null;

  // 对前3个搜索结果逐一尝试，选第一个相关的
  for (var i = 0; i < titles.length; i++) {
    var result = await wikiExtract(titles[i], lang);
    if (result && isRelevant(result.extract, query)) {
      return result;
    }
  }
  return null;
}
```

每个 Wikipedia 结果包含：
- `title`：词条标题
- `extract`：前 8 句摘要
- `lang`：语言（en/zh）
- `categories`：分类标签（最多 10 个）

#### 相关性校验（`isRelevant`）

```javascript
function isRelevant(extract, query) {
  var keywords = extractKeywords(query);
  // 至少命中一个关键词才算相关
  var matchCount = 0;
  for (var i = 0; i < keywords.length; i++) {
    if (lowerExtract.indexOf(keywords[i].toLowerCase()) !== -1) {
      matchCount++;
    }
  }
  return matchCount >= 1;
}
```

关键词提取支持中文和英文：
- 中文：按空格拆分，取长度 ≥ 2 的片段
- 英文：按空格拆分，过滤停用词和短词（< 3 字符）

#### Reddit 多策略搜索

```javascript
async function fetchRedditFull(query) {
  var searches = [
    { q: q, sort: 'top' },                              // 热门帖
    { q: q + ' opinion discussion', sort: 'relevance' }, // 观点讨论
    { q: q + ' unpopular controversial', sort: 'relevance' } // 争议帖
  ];
  // 三组并行搜索 → 去重 → 按热度排序 → 取前6篇
  // 前3篇抓取 top 3 评论
  var allResults = await Promise.all(searches.map(...));
  // 去重 key = title.substring(0,40).toLowerCase()
  merged.sort(function(a, b) { return b.heat - a.heat; });
  // heat = score + numComments * 2
  var topPosts = merged.slice(0, 6);
  // 前3篇抓取评论
  await Promise.all(topPosts.slice(0, 3).map(async function(p) {
    p.topComments = await redditComments(p.id);
  }));
  return topPosts;
}
```

Reddit 帖子数据结构：
```javascript
{
  id: 'post_id',
  title: '帖子标题',
  selftext: '正文（>15字时保留）',
  score: 123,
  numComments: 45,
  subreddit: 'r/example',
  url: 'https://www.reddit.com/r/...',
  isSelf: true/false,
  heat: 213,  // score + numComments * 2
  topComments: [  // 前3篇帖子才有
    { body: '评论内容（截取400字）', score: 67, author: 'username' },
    ...
  ]
}
```

#### 内容类型检测（`detectContentType`）

根据查询关键词自动识别 5 类内容：

| 类型 | 检测关键词 | 生成平台链接 |
|------|-----------|------------|
| person（人物） | 球星、CEO、导演、演员、歌手等 | Wikipedia, X, Reddit, 微博, 知乎 |
| media（IP/影视） | 电影、剧集、游戏、票房等 | Wikipedia, 豆瓣, IMDb, 烂番茄, Letterboxd |
| sports（体育/赛事） | 世界杯、NBA、奥运等 | Wikipedia, X, Reddit, 微博, 虎扑 |
| event（全球事件） | 事件、争议、政策、选举等 | Wikipedia, X, Reddit, 微博, 知乎, 豆瓣 |
| general（文化现象） | 默认 | Wikipedia, X, Reddit, 微博, 知乎, 豆瓣 |

### 前端 Wikipedia 搜索（`_searchEvent`）

除后端 MCP 外，前端还保留了一个轻量搜索函数，使用 Wikipedia REST API：

```javascript
async function _wikiSummary(lang, text) {
  // 1. opensearch 查找标题
  // 2. REST API 获取摘要
  // 3. 返回 extract 文本
}
```

搜索结果注入到 User Prompt 的 `## 联网搜索` 部分，截取前 600 字。

---

## 数据流总览

```
用户输入 + 选择 Lens
        │
        ▼
    simulate(text, selectedIds, setProgress)
        │
        ├── checkDeepSeek() ──→ /api/health ──→ 返回 ok/no_key
        │
        ├── _fetchMcpReviews(text) ──→ /api/mcp-reviews ──→ Wikipedia + Reddit
        │       │                                          (并行，不等待)
        │       └── Promise 存入 result.mcpReviewsPromise
        │
        ├── _searchEvent(text) ──→ Wikipedia REST API + DuckDuckGo
        │       │                   (5秒超时)
        │       └── searchResults
        │
        ├── _retrieveIPKnowledge(text) ──→ IP_DB 关键词匹配
        │       └── ipKnowledge (可能为 null)
        │
        ├── 分批推理：
        │   for each batch:
        │     _buildMessages(text, batchIds, ipKnowledge, searchResults)
        │     _callDeepSeek(messages, batchIds.length)
        │     └── batchResponse
        │   allBatchResults.join('\n')
        │
        ├── 跨组对比（batchCount > 1 时）：
        │   _buildCrossComparisonMessages(text, allIds, allBatchResults, ...)
        │   _callDeepSeek(crossMessages, ...)
        │   └── crossComparison
        │
        ├── _parseAIResponse(aiResponse, selectedIds)
        │       └── perspectives[]
        │
        └── return { success, context, ipKnowledge, perspectives, crossComparison, mcpReviewsPromise }
                │
                ▼
        ReportRendererV10.render(result)
                │
                ├── IP Narrative Skeleton（有 IP 时）
                ├── Live Search 实时语境
                ├── 真实观众反馈（await mcpReviewsPromise）
                ├── 各 Lens 分析结果
                └── 跨组对比总结
```

---

## 错误处理

### 前端错误卡片

```html
<div class="error-card">
  分析引擎暂时遇到了问题
  {errorMsg}
  [重试] [清空重来]
</div>
```

### 错误场景

| 场景 | 处理 |
|------|------|
| DeepSeek 未连接 | 返回 "核心引擎未连接" + 配置指引 |
| 所有批次推理失败 | 返回错误详情 + 各批次错误信息 |
| 推理 token 耗尽（finish_reason=length） | "AI推理过程过长，请减少Lens数量后重试" |
| AI 返回空 | "AI引擎未返回有效内容" |
| AI 返回格式异常 | 占位卡片 "AI返回格式异常，请重试" |
| MCP 搜索失败 | 静默降级，返回空数组，不影响主流程 |

### API 响应解析兼容性

`_parseAIResponse` 支持两种格式兼容：
- `noticed` 可以是字符串数组（旧格式）或对象数组（新格式，含 detail + whyItMatters）
- `ignored` 可以是字符串数组或对象数组（含 detail/text 字段）
- 解析失败时通过正则提取 lensId，生成占位卡片

---

## 安全设计

- API Key 仅通过 Cloudflare 环境变量 `DEEPSEEK_API_KEY` 注入，前端零泄露
- `.env` / `.env_*` 已加入 `.gitignore`
- `functions/api/deepseek.js` catch 块模糊化错误信息，不暴露内部路径
- `functions/api/health.js` 返回 `ok` / `no_key` 状态，不暴露 key 本身
- `_headers` 配置 CORS 全局放通 + 静态资源长期缓存

---

*Architecture backup — 2026-07-27*
