const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 从 .env 文件加载环境变量（如果存在）
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        // 去掉引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn('Warning: Could not load .env file:', e.message);
}

const PORT = 8765;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'api.deepseek.com';

// ============================================================
// MCP Evidence Layer V3 — 真实数据，有杀伤力的调取
// Wikipedia结构化摘要 + Reddit多策略搜索+评论抓取 + 智能平台链接
// ============================================================

const UA = 'NarrativePerceptionAtlas/3.0 (Research; +https://github.com/narrative-atlas)';

// 检测系统代理（Clash/V2Ray 等）
var PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || '';
var PROXY_HOST = '', PROXY_PORT = '';
if (PROXY_URL) {
  var pUrl = new URL(PROXY_URL);
  PROXY_HOST = pUrl.hostname;
  PROXY_PORT = parseInt(pUrl.port, 10) || 7890;
  console.log('[MCP V3] Using proxy:', PROXY_HOST + ':' + PROXY_PORT);
}

/**
 * 通用 HTTPS GET 请求（支持代理隧道）
 */
function httpsGet(hostname, pathName, timeoutMs) {
  return new Promise(function(resolve) {
    var req;
    if (PROXY_HOST) {
      // 通过 HTTP CONNECT 隧道连接
      var connectOpts = {
        hostname: PROXY_HOST,
        port: PROXY_PORT,
        method: 'CONNECT',
        path: hostname + ':443'
      };
      var connectReq = http.request(connectOpts);
      connectReq.on('connect', function(res, socket) {
        if (res.statusCode !== 200) { resolve(null); return; }
        var tlsOpts = {
          host: hostname,
          path: pathName,
          socket: socket,
          servername: hostname,
          rejectUnauthorized: false,
          headers: { 'Host': hostname, 'User-Agent': UA }
        };
        req = https.request(tlsOpts, function(httpRes) {
          if (httpRes.statusCode === 429) { resolve(null); socket.destroy(); return; }
          var data = '';
          httpRes.on('data', function(c) { data += c; });
          httpRes.on('end', function() {
            try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
            socket.destroy();
          });
        });
        req.on('error', function() { resolve(null); socket.destroy(); });
        req.setTimeout(timeoutMs || 10000, function() { req.abort(); resolve(null); socket.destroy(); });
        req.end();
      });
      connectReq.on('error', function() { resolve(null); });
      connectReq.setTimeout(timeoutMs || 10000, function() { connectReq.abort(); resolve(null); });
      connectReq.end();
    } else {
      // 直连
      var opts = {
        hostname: hostname,
        path: pathName,
        method: 'GET',
        rejectUnauthorized: false,
        headers: { 'User-Agent': UA }
      };
      req = https.request(opts, function(httpRes) {
        if (httpRes.statusCode === 429) { resolve(null); return; }
        var data = '';
        httpRes.on('data', function(c) { data += c; });
        httpRes.on('end', function() {
          try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
        });
      });
      req.on('error', function() { resolve(null); });
      req.setTimeout(timeoutMs || 10000, function() { req.abort(); resolve(null); });
      req.end();
    }
  });
}

// ---- Wikipedia: 结构化摘要 ----

/**
 * 搜索最佳匹配标题
 */
function wikiSearch(query, lang) {
  var host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org';
  return httpsGet(host, '/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&srlimit=1&format=json', 8000)
    .then(function(r) {
      if (!r || !r.query || !r.query.search || r.query.search.length === 0) return null;
      return r.query.search[0].title;
    });
}

/**
 * 获取页面摘要（8句）+ 分类信息
 */
function wikiExtract(title, lang) {
  var host = lang === 'zh' ? 'zh.wikipedia.org' : 'en.wikipedia.org';
  return Promise.all([
    httpsGet(host, '/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=extracts&exintro=true&explaintext=true&exsentences=8&format=json', 8000),
    httpsGet(host, '/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=categories&cllimit=10&format=json', 6000)
  ]).then(function(results) {
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

    return {
      title: title,
      extract: page.extract,
      lang: lang,
      categories: categories
    };
  });
}

/**
 * 完整的 Wikipedia 获取流程
 */
function fetchWikiFull(query, lang) {
  return wikiSearch(query, lang).then(function(title) {
    if (!title) return null;
    return wikiExtract(title, lang);
  });
}

// ---- Reddit: 多策略搜索 + 评论抓取 ----

/**
 * 单次 Reddit 搜索
 */
function redditSearch(queryStr, sort, limit) {
  return httpsGet('www.reddit.com', '/search.json?q=' + encodeURIComponent(queryStr) + '&sort=' + (sort || 'relevance') + '&limit=' + (limit || 8) + '&restrict_sr=&t=all', 12000)
    .then(function(result) {
      if (!result || !result.data || !result.data.children) return [];
      var posts = [];
      result.data.children.forEach(function(child) {
        if (child.kind !== 't3') return;
        var d = child.data;
        if (!d.title || d.title.length < 10) return;
        // 过滤纯图片/视频帖（没有讨论价值）
        if (d.is_video && !d.is_self) return;
        if (d.post_hint === 'image' && !d.is_self && (!d.selftext || d.selftext.length < 20)) return;
        posts.push({
          id: d.id,
          title: d.title,
          selftext: (d.selftext && d.selftext.length > 15) ? d.selftext : '',
          score: d.score,
          numComments: d.num_comments,
          subreddit: d.subreddit,
          url: 'https://www.reddit.com' + d.permalink,
          isSelf: d.is_self,
          // 综合热度分 = 投票分 + 评论数*2（讨论密度权重更高）
          heat: d.score + d.num_comments * 2
        });
      });
      return posts;
    });
}

/**
 * 获取单个帖子 top 3 评论
 */
function redditComments(postId) {
  return httpsGet('www.reddit.com', '/comments/' + postId + '.json?limit=5&sort=top&depth=1', 8000)
    .then(function(result) {
      if (!result || !Array.isArray(result) || result.length < 2) return [];
      var comments = [];
      var topLevel = result[1].data ? result[1].data.children : [];
      topLevel.forEach(function(child) {
        if (child.kind !== 't1') return;
        var body = child.data.body;
        if (!body || body.length < 20) return;
        // 过滤bot/自动回复
        if (body.indexOf('I am a bot') >= 0) return;
        if (body.indexOf('[deleted]') === 0) return;
        if (body.indexOf('[removed]') === 0) return;
        comments.push({
          body: body.substring(0, 400),
          score: child.data.score,
          author: child.data.author
        });
      });
      return comments.slice(0, 3);
    });
}

/**
 * 多策略 Reddit 搜索：
 * 1) 原词搜索 (top)
 * 2) 原词 + opinion discussion (relevance)
 * 3) 原词 + unpopular controversial (relevance)
 * 去重 + 热度排序 + 抓取top帖子评论
 */
function fetchRedditFull(query) {
  var q = query.trim();
  var searches = [
    { q: q, sort: 'top', label: 'original' },
    { q: q + ' opinion discussion', sort: 'relevance', label: 'opinion' },
    { q: q + ' unpopular controversial', sort: 'relevance', label: 'controversy' }
  ];

  return Promise.all(searches.map(function(s) {
    return redditSearch(s.q, s.sort, 6);
  })).then(function(allResults) {
    // 合并去重（按title前40字符）
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

    // 按热度排序，取top 6
    merged.sort(function(a, b) { return b.heat - a.heat; });
    var topPosts = merged.slice(0, 6);

    // 对 top 3 帖子抓取评论
    var commentPromises = topPosts.slice(0, 3).map(function(p) {
      return redditComments(p.id).then(function(comments) {
        p.topComments = comments;
        return p;
      }).catch(function() { p.topComments = []; return p; });
    });

    return Promise.all(commentPromises).then(function() {
      // 剩余帖子补空评论
      for (var i = 3; i < topPosts.length; i++) {
        topPosts[i].topComments = [];
      }
      return topPosts;
    });
  });
}

/**
 * 智能内容类型检测
 * 返回: { type: 'media'|'person'|'event'|'general', typeLabel: '...', typeLabelEn: '...' }
 */
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

/**
 * 根据内容类型，返回适合的平台搜索链接
 */
function getPlatformLinks(query, contentType, hasChinese) {
  var links = [];
  var q = encodeURIComponent(query);

  // 所有类型都有的通用平台
  if (hasChinese) {
    links.push({ name: 'Wikipedia', icon: 'W', url: 'https://zh.wikipedia.org/wiki/Special:Search/' + q, label: '维基百科' });
  } else {
    links.push({ name: 'Wikipedia', icon: 'W', url: 'https://en.wikipedia.org/wiki/Special:Search/' + q, label: 'Wikipedia' });
  }

  // 根据类型选择平台
  if (contentType.type === 'media') {
    links.push(
      { name: 'Douban', icon: 'Db', url: 'https://www.douban.com/search?cat=1002&q=' + q, label: '豆瓣' },
      { name: 'IMDb', icon: 'IM', url: 'https://www.imdb.com/find/?q=' + q + '&ref_=nv_sr_sm', label: 'IMDb' },
      { name: 'Rotten Tomatoes', icon: 'RT', url: 'https://www.rottentomatoes.com/search?search=' + q, label: '烂番茄' },
      { name: 'Letterboxd', icon: 'Lb', url: 'https://letterboxd.com/search/films/' + q + '/', label: 'Letterboxd' }
    );
  } else if (contentType.type === 'person') {
    if (hasChinese) {
      links.push(
        { name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' },
        { name: 'Zhihu', icon: 'Zh', url: 'https://www.zhihu.com/search?type=content&q=' + q, label: '知乎' }
      );
    }
    links.push(
      { name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' },
      { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' }
    );
  } else if (contentType.type === 'sports') {
    links.push(
      { name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' },
      { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' }
    );
    if (hasChinese) {
      links.push(
        { name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' },
        { name: 'Hupu', icon: 'Hp', url: 'https://bbs.hupu.com/search?q=' + q + '&type=1', label: '虎扑' }
      );
    } else {
      links.push(
        { name: 'ESPN', icon: 'ES', url: 'https://www.espn.com/search/_/q/' + q, label: 'ESPN' }
      );
    }
  } else if (contentType.type === 'event') {
    links.push(
      { name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' },
      { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' },
      { name: 'Google News', icon: 'GN', url: 'https://news.google.com/search?q=' + q + '&hl=' + (hasChinese ? 'zh-CN' : 'en'), label: 'Google News' }
    );
    if (hasChinese) {
      links.push({ name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' });
    }
  } else {
    // general
    links.push(
      { name: 'X / Twitter', icon: 'X', url: 'https://twitter.com/search?q=' + q + '&src=typed_query&f=top', label: 'X' },
      { name: 'Reddit', icon: 'Rd', url: 'https://www.reddit.com/search/?q=' + q + '&sort=relevance', label: 'Reddit' }
    );
    if (hasChinese) {
      links.push(
        { name: 'Douban', icon: 'Db', url: 'https://www.douban.com/search?q=' + q, label: '豆瓣' },
        { name: 'Weibo', icon: 'Wb', url: 'https://s.weibo.com/weibo?q=' + q, label: '微博' },
        { name: 'Zhihu', icon: 'Zh', url: 'https://www.zhihu.com/search?type=content&q=' + q, label: '知乎' }
      );
    }
  }

  return links;
}

/**
 * /api/mcp-reviews 接口处理 (V3 — 真实数据+评论+结构化摘要)
 */
function handleMcpReviews(req, res, body) {
  var query = body.query || '';

  if (!query) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Missing query parameter' }));
    return;
  }

  console.log('[MCP V3] Query:', query);

  var hasChinese = /[\u4e00-\u9fa5]/.test(query);
  var contentType = detectContentType(query);

  // 并行请求：Wikipedia EN/ZH + Reddit多策略搜索
  var wikiPromises = [fetchWikiFull(query, 'en')];
  if (hasChinese) {
    wikiPromises.push(fetchWikiFull(query, 'zh'));
  }
  var redditPromise = fetchRedditFull(query);

  Promise.all([Promise.all(wikiPromises), redditPromise]).then(function(results) {
    var wikiResults = results[0].filter(function(r) { return r !== null; });
    var redditPosts = results[1] || [];

    console.log('[MCP V3] Wiki results:', wikiResults.length, '| Reddit posts:', redditPosts.length);

    // 构建 Intel Brief（结构化）
    var intelBrief = {
      type: contentType.typeLabel,
      typeEn: contentType.typeLabelEn,
      contentType: contentType.type,
      summaryEn: '',
      summaryZh: '',
      wikiTitleEn: '',
      wikiTitleZh: '',
      categories: []
    };

    wikiResults.forEach(function(w) {
      if (w.lang === 'en') {
        intelBrief.summaryEn = w.extract;
        intelBrief.wikiTitleEn = w.title;
      } else {
        intelBrief.summaryZh = w.extract;
        intelBrief.wikiTitleZh = w.title;
      }
      // 合并分类标签
      if (w.categories && w.categories.length > 0) {
        intelBrief.categories = intelBrief.categories.concat(w.categories.slice(0, 5));
      }
    });
    // 去重分类
    if (intelBrief.categories.length > 0) {
      var seen = {};
      intelBrief.categories = intelBrief.categories.filter(function(c) {
        var k = c.toLowerCase();
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      }).slice(0, 6);
    }

    // 构建平台链接
    var platformLinks = getPlatformLinks(query, contentType, hasChinese);

    var responseData = {
      query: query,
      contentType: contentType.type,
      intelBrief: intelBrief,
      redditPosts: redditPosts.slice(0, 5),
      platformLinks: platformLinks
    };

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(responseData));
  }).catch(function(err) {
    console.error('[MCP V3] Error:', err);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    var contentType = detectContentType(query);
    res.end(JSON.stringify({
      query: query,
      contentType: contentType.type,
      intelBrief: { type: contentType.typeLabel, typeEn: contentType.typeLabelEn, contentType: contentType.type, summaryEn: '', summaryZh: '', categories: [] },
      redditPosts: [],
      platformLinks: getPlatformLinks(query, contentType, hasChinese)
    }));
  });
}

// DeepSeek API proxy
function proxyDeepSeek(req, res, body) {
  if (!DEEPSEEK_API_KEY) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY 环境变量未设置。请在启动server.js前设置: export DEEPSEEK_API_KEY=your_key' }));
    return;
  }

  const postData = JSON.stringify(body);
  const options = {
    hostname: DEEPSEEK_BASE_URL,
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
      'Content-Length': Buffer.byteLength(postData)
    },
    rejectUnauthorized: false
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    });
  });

  proxyReq.setTimeout(180000, function() {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'DeepSeek API 请求超时（>180秒）' }));
    }
  });

  proxyReq.on('error', (e) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'DeepSeek API 请求失败: ' + e.message }));
    }
  });

  proxyReq.write(postData);
  proxyReq.end();
}

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Health check
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: DEEPSEEK_API_KEY ? 'ok' : 'no_key', model: 'deepseek-v4-pro' }));
    return;
  }

  // DeepSeek proxy
  if (req.url === '/api/deepseek' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        proxyDeepSeek(req, res, JSON.parse(body));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // MCP Evidence Layer - Added
  // 真实观众评论搜索接口
  if (req.url === '/api/mcp-reviews' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        handleMcpReviews(req, res, JSON.parse(body));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // Static files
  let filePath = req.url.split('?')[0]; // strip query string
  if (filePath === '/') filePath = '/index.html';
  filePath = path.join(__dirname, decodeURIComponent(filePath));
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Narrative Perception Atlas server running at http://localhost:${PORT}`);
  console.log(`DeepSeek API Key: ${DEEPSEEK_API_KEY ? 'configured' : 'NOT SET — set DEEPSEEK_API_KEY env var'}`);
});
