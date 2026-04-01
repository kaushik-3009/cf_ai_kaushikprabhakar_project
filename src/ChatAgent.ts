import { Agent, callable } from 'agents';

export interface Env {
  AI: any;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatState {
  messages: ChatMessage[];
}

export class ChatAgent extends Agent<Env, ChatState> {
  initialState = { 
    messages: [
      { role: 'system', content: 'You are a helpful and technical Cloudflare AI Assistant. You specialize in the Cloudflare Developer Platform (Workers, Pages, Durable Objects, R2, D1, etc.). Use Markdown for formatting and code blocks where appropriate.' }
    ] 
  };

  @callable()
  async sendMessage(userMessage: string): Promise<void> {
    const messages = [...this.state.messages];
    messages.push({ role: 'user', content: userMessage });
    
    // Optimistically update state with user message
    this.setState({ messages });

    // Call Workers AI with streaming enabled
    const stream = await this.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      {
        messages: messages,
        stream: true
      }
    ) as ReadableStream;

    let fullResponse = '';
    
    // Read the streaming response from Workers AI
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      const lines = chunkText.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.response) {
              fullResponse += data.response;
              
              // Broadcast partial token to frontend
              this.broadcast(JSON.stringify({
                type: 'token',
                text: data.response,
                isFinal: false
              }));
            }
          } catch (e) {
            // Ignore incomplete JSON chunks, they will be handled in the next read
          }
        }
      }
    }

    // Append final message to state and save
    messages.push({ role: 'assistant', content: fullResponse });
    this.setState({ messages });

    // Signal completion
    this.broadcast(JSON.stringify({
      type: 'token',
      text: '',
      isFinal: true
    }));
  }
}
