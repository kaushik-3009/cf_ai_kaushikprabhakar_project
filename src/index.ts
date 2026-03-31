import { ChatAgent } from './ChatAgent';

export interface Env {
  ChatAgent: DurableObjectNamespace;
}

export { ChatAgent };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      try {
        const body: { session_id?: string; message?: string } = await request.json();
        
        if (!body.session_id || !body.message) {
          return new Response('Missing session_id or message', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Derive the Durable Object ID from the session_id
        const id = env.ChatAgent.idFromName(body.session_id);
        
        // Get the DO stub
        const stub = env.ChatAgent.get(id) as any;

        // Route the user's message to the sendMessage method via RPC
        const aiResponse = await stub.sendMessage(body.message);

        return new Response(JSON.stringify({ response: aiResponse }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
