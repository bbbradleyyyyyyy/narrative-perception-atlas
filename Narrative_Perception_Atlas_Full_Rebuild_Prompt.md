# Narrative Perception Atlas — 完整重建 Prompt
# 将此文件的全部内容复制到新的 TRAE 对话窗口中即可生成完整 Demo

---

请创建一个名为 **Narrative Perception Atlas** 的单文件 HTML 应用（index.html）。这是一个沉浸式跨文化叙事模拟引擎，允许用户输入任何IP/事件/叙事文本，模拟全球30种不同文化受众的真实反应。

---

## 一、技术栈要求

- **单文件HTML**，所有CSS在 `<style>` 中，所有JS在 `<script>` 中
- **CDN依赖**：
  - Tailwind CSS: `https://cdn.tailwindcss.com`
  - Font Awesome 6.5.0: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css`
  - Chart.js: `https://cdn.jsdelivr.net/npm/chart.js`
- **Canvas API** 用于粒子背景和世界地图
- **运行时API调用**（fetch）：Wikipedia中文/英文API、Wikipedia REST Summary API、DuckDuckGo Instant Answer API
- 纯前端，无后端依赖，文件可直接在浏览器中打开

---

## 二、视觉设计系统

### CSS变量（在 :root 中定义）
```css
:root {
  --gold: #F4B400;
  --gold-dim: rgba(244,180,0,0.15);
  --blue: #4A90D9;
  --blue-dim: rgba(74,144,217,0.12);
  --blue-glow: rgba(74,144,217,0.25);
  --surface: rgba(255,255,255,0.03);
  --surface-hover: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.08);
  --border-blue: rgba(74,144,217,0.15);
  --text: rgba(255,255,255,0.8);
  --text-dim: rgba(255,255,255,0.4);
  --text-muted: rgba(255,255,255,0.25);
}
```

### 颜色语义分层
| 颜色 | 含义 | 使用场景 |
|------|------|---------|
| 黑色 `#06060a` | 背景/宇宙/空间 | body背景 |
| 蓝色 `#4A90D9` | 世界结构/信息流/数据网络 | 世界地图线框、能量流、科技元素 |
| 金色 `#F4B400` | 判断/权重/输出结论 | Lens标签、进度条、分析结论、强调元素 |

### CSS动画（@keyframes，共10个）
`flowLines`, `subtlePulse`, `gridFloat`, `pathDraw`, `nodeReveal`, `shimmer`, `fadeSlideUp`, `glowPulse`, `breathe`, `fadeInUp`

---

## 三、HTML结构（DOM层级）

```
body（background:#06060a）
├── canvas#worldMapBg（沉浸式3D世界地图背景，fixed定位，z-index:0，opacity:0.85）
├── div.world-map-bg（CSS径向渐变背景层，fixed定位）
├── canvas#heroCanvas（英雄区世界地图轮廓canvas，fixed定位）
├── nav.site-nav（固定顶部导航栏，z-index:100）
│   ├── a.logo（"Narrative Perception Atlas"，金色）
│   ├── div.nav-links（两个锚点链接：#explorer "Explorer"，#simulator "Simulator"）
│   └── nav底部有蓝→金渐变能量线（::after伪元素）
├── header#hero（全屏英雄区）
│   ├── div.hero-badge（"Cross-cultural Narrative Simulation Engine"胶囊徽章）
│   ├── h1.hero-title（双语大标题：「透过多重透镜 / 看见文化」+ "SEEING CULTURE THROUGH MULTIPLE LENSES"，关键词金色高亮）
│   ├── p.hero-subtitle（双语副标题）
│   └── div.hero-cta（两个按钮：「探索透镜 Explorer」金色主按钮 + 「模拟器 Simulator」暗色次按钮）
├── section#explorer（模块1：受众透镜浏览器）
│   ├── h2（"30 Audience Lenses · 30 个受众透镜"，金色渐变文字）
│   ├── p（副标题说明）
│   ├── div.explorer-controls
│   │   ├── input#lensSearch（搜索框，placeholder:"搜索透镜... Search lenses..."）
│   │   └── div.filter-tags（9个地区过滤标签按钮：All/East Asia/Southeast Asia/South Asia/Middle East/Europe/N. America/Lat. America/Africa）
│   ├── div#lensGrid.lens-grid（动态渲染的透镜卡片3列网格）
│   └── div#lensDetail（透镜详情面板，默认隐藏，点击卡片后显示）
│       └── div#lensDetailContent
├── section#simulator（模块2：模拟器）
│   ├── h2（"Mass Media Audience Simulator" + "大众媒体受众模拟器"）
│   ├── div.sim-input
│   │   ├── textarea#narrativeInput（输入区域，placeholder包含示例IP名）
│   │   ├── span#charCount（字符计数）
│   │   ├── div#lensSelector.lens-chips（动态渲染的透镜选择芯片区域）
│   │   ├── span#lensCountLabel（已选数量）
│   │   └── button#analyzeBtn（"开始模拟 Simulate"按钮，至少选1个Lens才可用）
│   ├── div#progressSection（进度条，默认隐藏）
│   │   ├── div.progress-bar > div#progressFill（蓝金渐变进度条）
│   │   └── span#progressLabel（进度文本）
│   └── div#reportSection.report-section（报告输出区）
│       └── div#reportBody
└── footer（版本号 + 技术栈说明）
```

---

## 四、Canvas背景系统（双Canvas架构）

### 4.1 Canvas #heroCanvas（英雄区世界地图轮廓）

**大陆轮廓数据（continents数组，7个区域，归一化坐标0-1）：**
- North America: `[[0.08,0.18],[0.12,0.14],[0.16,0.12],[0.20,0.14],[0.24,0.18],[0.26,0.24],[0.24,0.30],[0.20,0.34],[0.16,0.36],[0.12,0.34],[0.08,0.28]]`
- South America: `[[0.22,0.52],[0.24,0.48],[0.28,0.50],[0.30,0.56],[0.30,0.64],[0.28,0.72],[0.24,0.76],[0.22,0.72],[0.20,0.64],[0.20,0.56]]`
- Europe: `[[0.44,0.14],[0.48,0.12],[0.52,0.14],[0.54,0.18],[0.52,0.24],[0.48,0.26],[0.44,0.24],[0.42,0.20]]`
- Africa: `[[0.44,0.32],[0.48,0.30],[0.54,0.32],[0.56,0.38],[0.56,0.50],[0.54,0.58],[0.50,0.62],[0.46,0.58],[0.44,0.50],[0.42,0.42]]`
- Asia: `[[0.56,0.14],[0.62,0.12],[0.70,0.14],[0.76,0.16],[0.80,0.20],[0.82,0.26],[0.80,0.32],[0.76,0.36],[0.70,0.38],[0.64,0.36],[0.58,0.32],[0.56,0.26]]`
- Southeast Asia / Oceania: `[[0.74,0.42],[0.78,0.44],[0.82,0.46],[0.84,0.50],[0.82,0.52],[0.78,0.50],[0.74,0.48]]`
- Australia: `[[0.78,0.62],[0.82,0.60],[0.88,0.62],[0.90,0.66],[0.88,0.72],[0.84,0.74],[0.80,0.72],[0.78,0.68]]`

**城市节点（cities数组，20个）：**
NYC(0.15,0.28), LA(0.20,0.32), Toronto(0.12,0.22), London(0.47,0.18), Paris(0.50,0.20), Berlin(0.48,0.22), Dubai(0.65,0.25), Mumbai(0.70,0.22), Beijing(0.75,0.28), Shanghai(0.76,0.26), Tokyo(0.80,0.30), Seoul(0.84,0.35), Lagos(0.47,0.38), Nairobi(0.50,0.42), Sao Paulo(0.22,0.60), Buenos Aires(0.25,0.65), Sydney(0.83,0.65), Melbourne(0.87,0.68)

**洲际弧线（arcData，7条）：**
NA→EU, EU→Asia, SA→Africa, Asia→Oceania, NA→SA, EU→SE Asia, Asia→Australia

**粒子系统：**
- 大陆轮廓粒子：沿边缘线按距离/7px生成，`{x, y, ox, oy, size(0.5-2.3), alpha(0.08-0.33), speed(0.1-0.4), phase, isContinent:true}`
- 海洋浮动粒子：60个，更小更暗 `size(0.3-1.3), alpha(0.02-0.08)`
- 粒子间距离<80px时绘制连接线（金色，alpha按距离衰减）
- 颜色：大陆粒子金色`rgba(244,180,0,a)`，海洋粒子白色半透明

### 4.2 Canvas #worldMapBg（沉浸式3D线框世界地图 + 能量流 + 鼠标交互）

**更详细的大陆轮廓（mapOutlines数组，15个区域）：**
North America(17点), Central America(6点), South America(15点), Europe(15点), Scandinavia(6点), UK/Ireland(6点), Africa(17点), Middle East(11点), India subcontinent(7点), Asia(22点), Japan(8点), SE Asia/Indonesia(11点), Philippines(5点), Australia(13点), Greenland(7点)

**经纬度网格（gridLines数组）：**
- 9条经线（lon: 0.1到0.9，步长0.1），每条由20个纬度点组成
- 9条纬线（lat: 0.1到0.9，步长0.1），每条由20个经度点组成

**城市枢纽节点（mapNodes/hubs数组，15个）：**
NYC(0.22,0.30), LA(0.16,0.32), London(0.48,0.22), Paris(0.52,0.24), Dubai(0.56,0.30), Mumbai(0.68,0.28), Beijing(0.74,0.26), Tokyo(0.80,0.28), Singapore(0.76,0.34), Sydney(0.84,0.62), Lagos(0.50,0.48), Nairobi(0.56,0.46), Sao Paulo(0.28,0.60), Mexico(0.32,0.24), Seoul(0.66,0.24)

**能量流配对（flowPairs，15条洲际连接）：**
`[[0,2],[2,3],[3,4],[4,5],[5,6],[6,7],[6,8],[7,9],[0,13],[2,10],[10,11],[0,12],[3,1],[6,14],[8,9]]`

**颜色系统（JS变量）：**
```javascript
var GOLD = {r:244, g:180, b:0};
var BLUE = {r:74, g:144, b:217};
var CYAN = {r:100, g:200, b:255};
```

**粒子系统：** PARTICLE_COUNT=250，65%蓝色系/35%金色系，每个有delay跟随系数

**鼠标交互效果：**
- 鼠标移动生成trailParticles（最多60个，蓝金混合渐变色）
- 快速移动（speed>8）生成burstParticles（蓝→金渐变，向外扩散）
- 鼠标停留>300ms生成energyNodes（最多12个，蓝/金随机，扩散环动画）
- 鼠标附近粒子被轻微吸引（延迟跟随感），距离<180px生效
- 鼠标光晕：80px半径的柔和青蓝色辉光

**渲染层次（每帧绘制顺序）：**
1. 深空背景辉光（radial-gradient，蓝色中心+金色外圈）
2. 经纬度网格（蓝色，0.025透明度，3D波浪微动）
3. 大陆轮廓（双层渲染：外层蓝色辉光lineWidth=4 + 内层青蓝主线lineWidth=1.2，sin波动效果）
4. 城市枢纽节点（三层渲染：外辉光→环→核心点，鼠标靠近从蓝变金）
5. 能量流基线（蓝色0.06透明度）+ 往返移动的能量包（蓝→金渐变，半径10px）
6. 250个粒子（鼠标吸引+连线+蓝金混合）
7. 鼠标轨迹/爆发/能量节点粒子
8. 鼠标光晕

---

## 五、数据结构

### 5.1 ALL_LENSES 数组（30个Lens对象）

**每个Lens对象的字段：**
```
{
  id: 'Lens01',
  name: '...',
  nameZh: '...',
  region: 'East Asia',
  description: '...',
  tags: ['标签1', '标签2', '标签3'],
  assumptions: ['假设1', '假设2', ..., '假设6'],
  triggers: '触发词1、触发词2、...',
  misinterpretationPattern: {
    observation: '...',
    immediateInterpretation: '...',
    nativeCulturalMapping: '...',
    moralJudgment: '...',
    finalMisinterpretation: '...'
  },
  cases: [ /* 5个Case对象 */ ],
  counterNarratives: ['反叙事1', ..., '反叙事8'],
  reasoningTemplate: '步骤1 → 步骤2 → 步骤3'
}
```

**每个Case对象的字段：**
```
{
  event: '事件名称和简述',
  cultureFraming: [
    { culture: '文化A', framing: '...', emotion: '...', judgment: '...' },
    { culture: '文化B', framing: '...', emotion: '...', judgment: '...' },
    { culture: '文化C', framing: '...', emotion: '...', judgment: '...' }
  ],
  whyHappened: '跨文化误解原因分析',
  eventBackground: '2-4段叙事性事件背景（100+字），包含事件发生背景、重要性、全球语境',
  misinterpretationCore: '2-3句话明确指出误解类型（价值观差异/媒体框架/语言翻译/文化预设冲突）',
  insightSummary: '一句话跨文化规律洞察（引号包裹）',
  realImage: 'Wikipedia Commons thumbnail URL',
  reasoningPattern: '推理路径 → 推理步骤 → 结论'
}
```

**30个Lens完整列表：**

| ID | nameZh | region | tags（示例） |
|----|--------|--------|-------------|
| Lens01 | 中国传统家文化资本/价值决策者 | East Asia | 家族血缘、代际传承、婚姻 |
| Lens02 | 中国平台文化青年 / 牛马文化 / 梗文化用户 | East Asia | 宏大叙事、内卷、努力 |
| Lens03 | 北美Z世代 | North America | 系统性不平等、心理健康、身份政治 |
| Lens04 | 美国保守民粹支持者 | North America | 主流媒体、传统价值、美国伟大 |
| Lens05 | 美国进步文化精英 | North America | 多元化、社会正义、制度批判 |
| Lens06 | 硅谷科技理性精英 | North America | 复杂系统、效率、技术创新 |
| Lens07 | 日本稳定秩序型社会 | East Asia | 社会秩序、和谐、突发变化 |
| Lens08 | 日本失落/低欲望青年 | East Asia | 阶层跃升、最低生活、不婚不育 |
| Lens09 | 韩国进步女性主义青年 | East Asia | 结构不平等、性别歧视、反抗 |
| Lens10 | 韩国传统主流社会 | East Asia | 家庭责任、国家忠诚、性别角色 |
| Lens11 | 全球化印度精英 | South Asia | 种姓制度改革、全球竞争力、传统 |
| Lens12 | 传统等级结构社会大众 | South Asia | 种姓秩序、宗教权威、家族荣誉 |
| Lens13 | 东南亚社区/宗教嵌入型社会 | Southeast Asia | 宗教和谐、社区纽带、面子文化 |
| Lens14 | 中东石油财阀 | Middle East | 资源主权、宗教合法性、家族统治 |
| Lens15 | 中东主流消费群体 | Middle East | 宗教保守、消费主义、青年失业 |
| Lens16 | 非洲城市机会型青年 | Africa | 后殖民遗产、移动互联、创业 |
| Lens17 | 欧洲进步环保主义者 | Europe | 气候正义、可持续发展、制度信任 |
| Lens18 | 欧洲生活方式个体主义者 | Europe | 工作生活平衡、文化消费、社会福利 |
| Lens19 | 拉美数字消费用户 | Latin America | 社交媒体、数字身份、不平等 |
| Lens20 | 技术从业者 / 算法 / 工程 / 理性思维 | Global | 技术乐观主义、效率、数据驱动 |
| Lens21 | 北美品牌受众 / 时尚编辑视角 | North America | 品牌叙事、消费主义、文化挪用 |
| Lens22 | 全球投资者 | Global | 市场机会、风险评估、ESG |
| Lens23 | 全球内容创作者 / 自媒体博主 | Global | 算法优化、创作者经济、文化表达 |
| Lens24 | 艺术家 / 导演 / 纯创作型表达者 | Global | 创作自由、审查制度、文化挪用 |
| Lens25 | 推荐算法视角 | Global | 用户行为预测、注意力经济、信息茧房 |
| Lens26 | AI大语言模型视角 | Global | 模式识别、文化偏见、训练数据 |
| Lens27 | 法律合规视角 | Global | 版权、言论自由、管辖权 |
| Lens28 | 伦理公平视角 | Global | 算法偏见、数字鸿沟、权力结构 |
| Lens29 | 历史长周期视角 | Global | 历史循环、文明兴衰、模式识别 |
| Lens30 | 生态与系统危机视角 | Global | 气候、生物多样性、可持续 |

**每个Lens必须有5个真实的跨文化误解案例（cases数组）。** 案例必须基于真实世界事件（如韩国游戏捏指事件、泰国冒犯君主罪、Victoria's Secret品牌重塑、Getty Images AI版权争议等），不能用虚构事件。每个case的cultureFraming至少3个不同文化视角。

### 5.2 IP_DB（内置IP知识库）

**识别模式（pats数组，关键词→IP key映射）：**
```javascript
[
  { pats: ['哪吒2','哪吒之魔童闹海','哪吒之魔童','哪吒'], ref: '哪吒' },
  { pats: ['三体','三体电视剧'], ref: '三体' },
  { pats: ['庆余年'], ref: '庆余年' },
  { pats: ['药神','我不是药神'], ref: '我不是药神' },
  { pats: ['马斯克','Musk','Elon Musk','Elon'], ref: '马斯克' },
  { pats: ['谷爱凌','Eileen Gu'], ref: '谷爱凌' },
  { pats: ['芭比','Barbie','芭比电影'], ref: '芭比' },
  { pats: ['我是歌手','歌手'], ref: '我是歌手' },
  { pats: ['黑神话','悟空','Black Myth'], ref: '黑神话' },
  { pats: ['流浪地球','The Wandering Earth'], ref: '流浪地球' }
]
```

**每个IP对象的字段：**
```
{
  name: '《哪吒之魔童闹海》',
  creator: '饺子导演 / 光线传媒',
  type: '动画电影',
  coreStory: '核心故事摘要（50-100字）',
  keyConflict: '个人自由 vs 家族责任 | 反叛精神 vs 社会规范 | 票房成功 vs 艺术价值',
  socialMetaphor: '社会隐喻描述',
  hotTopics: ['话题1', '话题2', '话题3', '话题4', '话题5'],
  globalBuzz: {
    '中国': '中国观众反应描述',
    '美国': '美国观众反应描述',
    '日本': '日本观众反应描述',
    // ... 其他地区
  }
}
```

**需要10个IP的完整数据。** 如果不确定具体内容，用合理的占位描述。

---

## 六、核心JS模块

### 6.1 SimulatorEngine（模拟引擎）

**定义方式：** IIFE，返回 `{ simulate, setReady, isReady }`

**9个分析维度（DIMENSIONS数组）：**
```
['权力结构', '性别与身体', '技术与效率', '文化认同', '劳动与经济', '自由与权利', '身份与归属', '消费与市场', '生态与伦理']
```

**核心方法：**

1. **`simulate(text, selectedIds)`** — async主入口
   - 流程：搜索事件 → 检索IP知识 → 构建事件骨架 → 分配topics → 逐Lens生成叙事 → 返回结果
   - 返回 `{ success, version:'V9', skeleton, ipKnowledge, reactions }`

2. **`_buildEventSkeleton(text, ipKnowledge, searchResults)`** — 构建事件骨架
   - 从输入文本中提取：rawText, keywords, segments（3-5个关键片段）, hotTopics, keyConflict, socialMetaphor, globalBuzz

3. **`_extractLensFilter(lens)`** — 提取Lens关注的top 3维度

4. **`_assignTopicsGlobally(skeleton, filters)`** — 全局topic贪心去重分配（确保不同Lens不会聚焦完全相同的话题）

5. **`_simulateNarrative(skeleton, lens, filter, idx, assignedTopics, usedConflicts)`** — 单Lens叙事生成
   - 为该Lens选择最佳冲突维度（避免与其他Lens重复）
   - 调用 `_generateLensNarrative` 生成三段式文本

6. **`_generateLensNarrative(skeleton, lens, filter, topics, conflict)`** — 生成三段式叙事：
   - 第一段：**该群体最关心什么**（调用 `_genFocusSection`）
   - 第二段：**该群体会忽略什么**（调用 `_genIgnoreSection`）
   - 第三段：**该群体会怎么误读**（调用 `_genMisreadSection`）

7. **`_genFocusSection(dim, skeleton, topics, eventName, ipTopics)`** — 关注焦点段
   - 必须包含该维度下的具体事件细节（从skeleton的segments和ipTopics中提取）
   - 不能是模板化输出——每个Lens的叙事要有独特的推理逻辑
   - 如果有IP知识，自动融入IP具体角色名、情节、数据
   - 如果是开放世界输入，使用通用推理框架但保持叙事感

8. **`_genIgnoreSection(dim, eventName)`** — 忽略段
   - 解释该维度群体会忽略什么以及为什么

9. **`_genMisreadSection(dim, skeleton, topics, conflict, eventName, ipTopics)`** — 误解段
   - 指出该群体可能产生的误解
   - 解释误解的认知机制
   - 如果有冲突维度，融入冲突分析

**重要约束：**
- 叙事生成函数中**不能有任何IP特定硬编码**（如哪吒角色名、具体台词、票房数字等）
- IP信息只能从 `ipTopics` 参数中获取（运行时从IP_DB读取）
- 对于开放世界输入（未匹配到IP），`ipTopics` 为空，使用通用推理

### 6.2 ReportRenderer（报告渲染器）

**定义方式：** 对象字面量 `const ReportRenderer = { render(result) { ... } }`

**render(result) 输出3大板块：**

1. **IP Narrative Skeleton 面板**（仅当 `result.ipKnowledge` 存在时显示）
   - IP名称、创作者、类型标签
   - 核心故事摘要
   - 核心冲突（pill标签，金色背景）
   - 热议题（pill标签）
   - 全球评价（按地区分卡片展示，每个地区一段反应描述）
   - 带glowPulse动画的.skeleton-panel样式

2. **Per-Lens 叙事区**（对每个选择的Lens生成一个reaction-block）
   - 每个block包含：
     - SVG头像（32x32，与LensExplorer同色系）+ Lens ID + 名称
     - 聚焦维度标签（金色胶囊）
     - 冲突维度标签（红色胶囊）
     - 三段叙事文本，带递减透明度的左边框（蓝→金渐变）
   - fadeInUp动画，逐个延迟出现（每个block延迟0.15s）

3. **底部总结**（所有Lens分析完成后）
   - 跨文化共识点
   - 跨文化分歧点
   - 关键误解风险

**reaction-block CSS结构：**
```css
.reaction-block {
  position: relative;
  border: 1px solid rgba(74,144,217,0.08);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  background: rgba(255,255,255,0.01);
  animation: fadeInUp 0.6s ease forwards;
}
.reaction-block::before {
  /* radial-gradient 脉冲辉光 */
}
.reaction-block::after {
  /* 左侧2px蓝→金渐变竖线 */
}
```

### 6.3 LensExplorer（透镜浏览器）

**定义方式：** 对象字面量 `const LensExplorer = { ... }`

**核心方法：**

1. **`_generateAvatar(lens)`** — 生成SVG头像
   - 按地区映射颜色：East Asia=#e8a849, North America=#5b9bd5, South Asia=#e07c4f, Southeast Asia=#4fb8a0, Middle East=#c785d0, Africa=#8bc34a, Europe=#7e8fc4, Latin America=#e07c8a, Global=#9e9e9e
   - SVG包含：圆形背景+几何符号（人物/齿轮/地球/书籍等）

2. **`init()`** — 初始化，调用renderGrid()

3. **`renderGrid()`** — 渲染透镜卡片网格
   - 支持搜索过滤（实时搜索nameZh和description）
   - 支持地区过滤（filter-tags点击切换）
   - 每张卡片包含：SVG头像、Lens ID标签（金色）、名称、描述（默认隐藏）、tags、底部能量条
   - 卡片有CSS hover动画

4. **`showDetail(id)`** — 显示透镜详情
   - 核心价值观（assumptions列表）
   - 触发词（triggers）
   - 误解路径流程图（misinterpretationPattern的5步可视化）
   - 5个案例卡片列表
   - Chart.js雷达图（6维度：个人主义/集体主义/传统导向/进步导向/情感驱动/理性驱动）

5. **`showCaseDetail(lensId, caseIdx)`** — 显示案例详情（6段式Narrative Case Card）
   - ① Case Title（Lens ID + 事件名）
   - ② Real-world Visual（Wikipedia真实图片，如有realImage直接显示，否则动态从Wikipedia API加载）
   - ③ Event Background（叙事性事件背景）
   - ④ Cross-cultural Narratives（每个文化视角含关注点/情绪/判断三维度）
   - ⑤ Misinterpretation Core（红色边框卡片）
   - ⑥ Insight Summary（金色引用框）

6. **`_loadCaseImage(lensId, caseIdx, evtName)`** — 动态加载Wikipedia图片
   - 调用 `https://en.wikipedia.org/api/rest_v1/page/summary/{searchTerm}`
   - 如果有thumbnail则显示，否则显示fallback

---

## 七、游戏化CSS系统

### Lens卡片CSS
```css
.lens-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.25,0.1,0.25,1);
  position: relative;
  overflow: hidden;
}
.lens-card::before { /* radial-gradient 金色辉光，hover时显示 */ }
.lens-card::after { /* 流动线条纹理动画，使用flowLines */ }
.lens-card:hover {
  border-color: rgba(244,180,0,0.25);
  box-shadow: 0 0 25px rgba(244,180,0,0.08);
  transform: translateY(-4px) scale(1.01);
}
.lens-card-desc {
  /* 默认 max-height:0; opacity:0; overflow:hidden; transform:translateY(8px) */
  /* hover时 max-height:120px; opacity:1; transform:translateY(0) */
  /* transition 0.45s cubic-bezier */
}
```

### 其他关键CSS类
- `.lens-energy` — 底部2px能量条 + shimmer光效
- `.assumption-card` — 左侧3px金色边框卡片
- `.case-card` — hover时顶部金色渐变线
- `.misread-flow` — 误解路径垂直流程图
- `.misread-node` — 逐个延迟动画揭示
- `.skill-node` — 胶囊形标签
- `.skeleton-panel` — glowPulse 4s循环发光
- `.dot-cn/.dot-us/.dot-jp/.dot-kr/.dot-eu/.dot-in/.dot-sea/.dot-global` — 各地区视角圆点配色

---

## 八、中文输入法兼容

textarea必须处理compositionstart/compositionend事件：
```javascript
var isComposing = false;
textarea.addEventListener('compositionstart', function() { isComposing = true; });
textarea.addEventListener('compositionend', function() { isComposing = false; updateCharCount(); });
textarea.addEventListener('input', function() { if (!isComposing) updateCharCount(); });
```

---

## 九、地区过滤标签

9个filter标签：All, East Asia, Southeast Asia, South Asia, Middle East, Europe, N. America, Lat. America, Africa

点击"All"显示全部。点击其他标签只显示对应region的Lens。支持与搜索框同时过滤。

---

## 十、分析流程（用户体验）

1. 用户在Simulator区输入文本（IP名/事件/任意叙事）
2. 输入时自动检测是否匹配IP_DB（显示匹配到的IP名称）
3. 用户在lensSelector区选择1-30个Lens（点击添加/移除芯片）
4. 点击"开始模拟"按钮
5. 进度条显示4个步骤：知识检索 → Lens分配 → 叙事生成 → 报告渲染
6. 报告区从上到下依次渲染：IP Narrative Skeleton → 逐个Lens叙事block → 总结
7. 每个叙事block有fadeInUp动画，逐个出现

---

## 十一、禁止事项

- 禁止使用picsum占位图——所有图片必须从Wikipedia API动态获取或使用真实URL
- 禁止在叙事生成函数中硬编码任何IP特定内容（角色名、台词、数据）
- 禁止使用模板化输出——每个Lens的叙事必须有独立的推理逻辑
- 禁止改变此prompt中指定的颜色语义（黑/金/蓝三层）
- 禁止破坏Canvas粒子背景系统的四层渲染架构
- 禁止使用 alert/prompt/confirm
- 所有30个Lens的150个Case必须有完整的6段式数据（eventBackground/misinterpretationCore/insightSummary/realImage都不能为空）

---

## 十二、知识库来源

以下5个知识库文件需要提供（如果你有上传的txt文件，请读取它们；如果没有，请基于上述数据结构自行创建合理的知识库内容）：

1. **Audience Lens Knowledge Base** — 30个受众透镜的详细定义
2. **Misinterpretation Pattern Library** — 跨文化误解模式库
3. **Cultural Dimension Framework** — 文化维度分析框架
4. **Cross-cultural Case Studies** — 跨文化案例库（每个Lens 5个真实案例）
5. **Narrative Reasoning Methodology** — 叙事推理方法论

---

请生成完整的 index.html 文件，确保所有功能都可用。文件大小预计在5000-6000行左右。
