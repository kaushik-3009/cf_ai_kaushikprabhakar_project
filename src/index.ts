import { routeAgentRequest } from 'agents';
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

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // The Cloudflare Agents SDK requires this router to inject namespace headers
    // It will automatically match paths like /agents/ChatAgent/{id}
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || 'default-session';

    // API endpoint for direct message sending (fallback)
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      try {
        const body: { session_id?: string; message?: string } = await request.json();
        const targetSession = body.session_id || sessionId;
        const targetId = env.ChatAgent.idFromName(targetSession);
        const targetStub = env.ChatAgent.get(targetId) as any;

        // Calling sendMessage via RPC
        await targetStub.sendMessage(body.message);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // Serve a basic diagnostic if someone hits the root via HTTP
    return new Response(`Cloudflare AI Agent Backend Live. Session: ${sessionId}`, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
};