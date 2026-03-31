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
  initialState = { messages: [] };

  @callable()
  async sendMessage(userMessage: string): Promise<string> {
    // Access state directly from this.state
    const messages = [...this.state.messages];
    
    // Append the new user message
    messages.push({ role: 'user', content: userMessage });
    
    // Call Workers AI with the Llama 3.3 model and the full conversation history
    const response = await this.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      {
        messages: messages
      }
    );
    
    const aiMessage = response.response || '';
    
    // Append the AI's response
    messages.push({ role: 'assistant', content: aiMessage });
    
    // Save the updated state using this.setState (shallow merge)
    this.setState({ messages });
    
    return aiMessage;
  }
}
