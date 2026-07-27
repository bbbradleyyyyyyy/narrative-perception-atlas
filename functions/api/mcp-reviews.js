// Cloudflare Pages Function — MCP Evidence Layer V3
// Wikipedia结构化摘要 + Reddit多策略搜索+评论抓取 + 智能平台链接

const UA = 'NarrativePerceptionAtlas/3.0 (Research; +https://github.com/narrative-atlas)';

async function fetchJSON(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 10000);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
    clearTimeout(timer);
    if (resp.status === 429) return null;
    return await resp.json();
  } catch (e) { clearTimeout(timer); return null; }
}

async function wikiSearch(query, lang) {
  var host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org';
  var r = await fetchJSON('https://' + host + '/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&srlimit=3&format=json', 8000);
  if (!r || !r.query || !r.query.search || r.query.search.length === 0) return [];
  return r.query.search.map(function(s) { return s.title; });
}

// 提取核心关键词：去掉标点和常见停用词，取前2-3个核心词
function extractKeywords(query) {
  var cleaned = query.replace(/[，。！？、；：""''（）\[\]【】《》…—\-·.,!?;:"'()<>\s]+/g, ' ').trim();
  if (!cleaned) return [];
  var hasChinese = /[\u4e00-\u9fa5]/.test(cleaned);
  var words;
  if (hasChinese) {
    // 中文：按常见分隔符拆，然后取长度>=2的片段
    words = cleaned.split(/\s+/).filter(function(w) { return w.length >= 2; });
    // 如果只有一个长中文词，尝试拆出2-3字的核心片段（简单处理：取前2字和后2字作为关键词）
    if (words.length === 1 && words[0].length > 4) {
      var w = words[0];
      words = [w.substring(0, 2), w.substring(w.length - 2)];
    }
  } else {
    // 英文：按空格拆，过滤短词和停用词
    var stopwords = ['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','shall','of','in','on','at','to','for','with','by','from','as','and','or','but','not','no','this','that','these','those','it','its','i','you','he','she','we','they','them','their','what','which','who','whom','how','why','when','where'];
    words = cleaned.toLowerCase().split(/\s+/).filter(function(w) {
      return w.length >= 3 && stopwords.indexOf(w) === -1;
    });
  }
  return words.slice(0, 3);
}

// 相关性校验：检查 extract 文本中是否包含核心关键词
function isRelevant(extract, query) {
  if (!extract || !query) return false;
  var keywords = extractKeywords(query);
  if (keywords.length === 0) return true; // 无法提取关键词时默认相关
  var lowerExtract = extract.toLowerCase();
  var matchCount = 0;
  for (var i = 0; i < keywords.length; i++) {
    if (lowerExtract.indexOf(keywords[i].toLowerCase()) !== -1) {
      matchCount++;
    }
  }
  // 至少命中一个关键词才算相关（如果只有1个关键词则必须命中；如果有2+个则至少命中1个）
  return matchCount >= 1;
}

async function wikiExtract(title, lang) {
  var host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org';
  var results = await Promise.all([
    fetchJSON('https://' + host + '/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=extracts&exintro=true&explaintext=true&exsentences=8&format=json', 8000),
    fetchJSON('https://' + host + '/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=categories&cllimit=10&format=json', 6000)
  ]);
  var extractData = results[0];
  var catData = results[1];
  if (!extractData || !extractData.query || !extractData.query.pages) return null;
  var pages = extractData.query.pages;
  var pageId = Object.keys(pages)[0];
  var page = pages[pageId];
  if (!page || page.missing !== undefined || !page.extract) return null;
  var categories = [];
  if (catData && catData.query && catData.query.pages) {
    var catPage = catData.query.pages[pageId];
    if (catPage && catPage.categories) {
      catPage.categories.forEach(function(c) {
        var name = c.title.replace('Category:', '').replace('分类:', '');
        if (name.length < 50) categories.push(name);
      });
    }
  }
  return { title: title, extract: page.extract, lang: lang, categories: categories };
}

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

async function redditSearch(queryStr, sort, limit) {
  var result = await fetchJSON('https://www.reddit.com/search.json?q=' + encodeURIComponent(queryStr) + '&sort=' + (sort || 'relevance') + '&limit=' + (limit || 8) + '&restrict_sr=&t=all', 12000);
  if (!result || !result.data || !result.data.children) return [];
  var posts = [];
  result.data.children.forEach(function(child) {
    if (child.kind !== 't3') return;
    var d = child.data;
    if (!d.title || d.title.length < 10) return;
    if (d.is_video && !d.is_self) return;
    if (d.post_hint === 'image' && !d.is_self && (!d.selftext || d.selftext.length < 20)) return;
    posts.push({ id: d.id, title: d.title, selftext: (d.selftext && d.selftext.length > 15) ? d.selftext : '', score: d.score, numComments: d.num_comments, subreddit: d.subreddit, url: 'https://www.reddit.com' + d.permalink, isSelf: d.is_self, heat: d.score + d.num_comments * 2 });
  });
  return posts;
}

async function redditComments(postId) {
  var result = await fetchJSON('https://www.reddit.com/comments/' + postId + '.json?limit=5&sort=top&depth=1', 8000);
  if (!result || !Array.isArray(result) || result.length < 2) return [];
  var comments = [];
  var topLevel = result[1].data ? result[1].data.children : [];
  topLevel.forEach(function(child) {
    if (child.kind !== 't1') return;
    var body = child.data.body;
    if (!body || body.length < 20) return;
    if (body.indexOf('I am a bot') >= 0) return;
    if (body.indexOf('[deleted]') === 0) return;
    if (body.indexOf('[removed]') === 0) return;
    comments.push({ body: body.substring(0, 400), score: child.data.score, author: child.data.author });
  });
  return comments.slice(0, 3);
}

async function fetchRedditFull(query) {
  var q = query.trim();
  var searches = [
    { q: q, sort: 'top' },
    { q: q + ' opinion discussion', sort: 'relevance' },
    { q: q + ' unpopular controversial', sort: 'relevance' }
  ];
  var allResults = await Promise.all(searches.map(function(s) { return redditSearch(s.q, s.sort, 6); }));
  var seen = {};
  var merged = [];
  allResults.forEach(function(posts) {
    posts.forEach(function(p) {
      var key = p.title.substring(0, 40).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      merged.push(p);
    });
  });
  merged.sort(function(a, b) { return b.heat - a.heat; });
  var topPosts = merged.slice(0, 6);
  await Promise.all(topPosts.slice(0, 3).map(async function(p) {
    try { p.topComments = await redditComments(p.id); } catch (e) { p.topComments = []; }
  }));
  for (var i = 3; i < topPosts.length; i++) topPosts[i].topComments = [];
  return topPosts;
}

function detectContentType(q) {
  var lower = q.toLowerCase();
  var personKeys = ['哈兰德','梅西','messi','ronaldo','c罗','姆巴佩','mbappe','trump','特朗普','拜登','biden','musk','马斯克','泰勒','taylor','swift','adele','杰伦','周杰伦','吴京','成龙','jackie','赵丽颖','迪丽热巴','球员','球星','运动员','教练','总统','ceo','导演','主演','歌手','演员','企业家','科学家','政治家','艺人'];
  var mediaKeys = ['电影','剧集','电视剧','动画','动漫','游戏','小说','改编','票房','上映','season','episode','netflix','anime','movie','film','series','show','game','黑神话','哪吒','庆余年','流浪地球','漫威','marvel','复联','avengers','芭比','barbie','奥本海默','oppenheimer','三体','沙丘','dune','inside out','头脑特工队'];
  var eventKeys = ['事件','事故','争议','新闻','政策','选举','抗议','罢工','战争','地震','疫情','发布会','声明','曝光','scandal','crisis','protest','election','pandemic','movement','reformation'];
  var sportsKeys = ['世界杯','nba','欧冠','英超','西甲','中超','olympic','奥运','冠军','决赛','比分','football','soccer','basketball','tennis','f1','formula 1','欧冠决赛','nba总决赛','super bowl','世界杯决赛'];
  if (personKeys.some(function(k) { return lower.indexOf(k) >= 0; })) return { type: 'person', typeLabel: '人物', typeLabelEn: 'Person / Figure' };
  if (mediaKeys.some(function(k) { return lower.indexOf(k) >= 0; })) return { type: 'media', typeLabel: 'IP / 影视作品', typeLabelEn: 'IP / Media Franchise' };
  if (sportsKeys.some(function(k) { return lower.indexOf(k) >= 0; })) return { type: 'sports', typeLabel: '体育 / 赛事', typeLabelEn: 'Sports / Event' };
  if (eventKeys.some(function(k) { return lower.indexOf(k) >= 0; })) return { type: 'event', typeLabel: '全球事件', typeLabelEn: 'Global Event' };
  return { type: 'general', typeLabel: '文化现象', typeLabelEn: 'Cultural Phenomenon' };
}

function getPlatformLinks(query, contentType, hasChinese) {
  var links = [];
  var q = encodeURIComponent(query);
  if (hasChinese) { links.push({ name: 'Wikipedia', icon: 'W', url: 'https://zh.wikipedia.org/wiki/Special:Search/' + q, label: '维基百科' }); }
  else { links.push({ name: 'Wikipedia', icon: 'W', url: 'https://en.wikipedia.org/wiki/Special:Search/' + q, label: 'Wikipedia' }); }
  if (contentType.type === 'media') {
    links.push(
      { name: 'Douban', icon: 'Db', url: 'https://www.douban.com/search?cat=1002&q=' + q, label: '豆瓣' },
      { name: 'IMDb', icon: 'IM', url: 'https://www.imdb.com/find/?q=' + q + '&ref_=nv_sr_sm', label: 'IMDb' },
      { name: 'Rotten Tomatoes', icon: 'RT', url: 'https://www.rottentomatoes.com/search?search=' + q, label: '烂番茄' },
      { name: 'Letterboxd', icon: 'Lb', url: 'https://letterboxd.com/search/films/' + q + '/', label: 'Letterboxd' }
    );
  } else if (contentType.type === 'person') {
    if (hasChinese) { links.push({ name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' }, { name: 'Zhihu', icon: 'Zh', url: 'https://www.zhihu.com/search?type=content&q=' + q, label: '知乎' }); }
    links.push({ name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' }, { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' });
  } else if (contentType.type === 'sports') {
    links.push({ name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' }, { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' });
    if (hasChinese) { links.push({ name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' }, { name: 'Hupu', icon: 'Hp', url: 'https://bbs.hupu.com/search?q=' + q + '&type=1', label: '虎扑' }); }
  } else {
    links.push({ name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' }, { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' });
    if (hasChinese) { links.push({ name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' }, { name: 'Zhihu', icon: 'Zh', url: 'https://www.zhihu.com/search?type=content&q=' + q, label: '知乎' }, { name: 'Douban', icon: 'Db', url: 'https://www.douban.com/search?cat=1002&q=' + q, label: '豆瓣' }); }
  }
  return links;
}

export async function onRequest(context) {
  const { request } = context;
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  var body = await request.json();
  var query = body.query || '';
  if (!query) return new Response(JSON.stringify({ error: 'Missing query parameter' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  var hasChinese = /[\u4e00-\u9fa5]/.test(query);
  var contentType = detectContentType(query);

  try {
    var wikiPromises = [fetchWikiFull(query, 'en')];
    if (hasChinese) wikiPromises.push(fetchWikiFull(query, 'zh'));
    var results = await Promise.all([Promise.all(wikiPromises), fetchRedditFull(query)]);
    var wikiResults = results[0].filter(function(r) { return r !== null; });
    var redditPosts = results[1] || [];

    var intelBrief = { type: contentType.typeLabel, typeEn: contentType.typeLabelEn, contentType: contentType.type, summaryEn: '', summaryZh: '', wikiTitleEn: '', wikiTitleZh: '', categories: [] };
    wikiResults.forEach(function(w) {
      if (w.lang === 'en') { intelBrief.summaryEn = w.extract; intelBrief.wikiTitleEn = w.title; }
      else { intelBrief.summaryZh = w.extract; intelBrief.wikiTitleZh = w.title; }
      if (w.categories && w.categories.length > 0) intelBrief.categories = intelBrief.categories.concat(w.categories.slice(0, 5));
    });
    if (intelBrief.categories.length > 0) {
      var seen = {};
      intelBrief.categories = intelBrief.categories.filter(function(c) { var k = c.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; }).slice(0, 6);
    }
    var platformLinks = getPlatformLinks(query, contentType, hasChinese);

    return new Response(JSON.stringify({ query: query, contentType: contentType.type, intelBrief: intelBrief, redditPosts: redditPosts.slice(0, 5), platformLinks: platformLinks }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    return new Response(JSON.stringify({ query: query, contentType: contentType.type, intelBrief: { type: contentType.typeLabel, typeEn: contentType.typeLabelEn, contentType: contentType.type, summaryEn: '', summaryZh: '', categories: [] }, redditPosts: [], platformLinks: getPlatformLinks(query, contentType, hasChinese) }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
}