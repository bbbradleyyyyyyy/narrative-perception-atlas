// Cloudflare Pages Function — Health Check

export async function onRequest(context) {
  const { env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const hasKey = !!env.DEEPSEEK_API_KEY;
  return new Response(JSON.stringify({ status: hasKey ? 'ok' : 'no_key', model: 'deepseek-v4-pro' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}