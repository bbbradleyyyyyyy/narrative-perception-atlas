// Cloudflare Pages Function — DeepSeek API Proxy

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY 环境变量未设置。请在 Cloudflare Dashboard → Pages → Settings → Environment Variables 中添加。' }), { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  try {
    const body = await request.json();
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });
    const data = await resp.text();
    return new Response(data, { status: resp.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'DeepSeek API 请求失败: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
}