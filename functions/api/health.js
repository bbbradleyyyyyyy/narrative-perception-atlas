// Cloudflare Pages Function — Health Check

export async function onRequest(context) {
  const { env } = context;
  const hasKey = !!env.DEEPSEEK_API_KEY;
  return new Response(JSON.stringify({ status: hasKey ? 'ok' : 'no_key', model: 'deepseek-v4-pro' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  });
}