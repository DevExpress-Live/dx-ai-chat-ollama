import { Component, signal } from '@angular/core';
import { DxChatModule } from 'devextreme-angular';
import CustomStore from 'devextreme/data/custom_store';
import DataSource from 'devextreme/data/data_source';

type User = { id: string; name?: string };

type Alert = { message: string };

type Message = {
  id: number;
  timestamp?: Date;
  author: User;
  text: string;
};

type OllamaMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const user: User = { id: 'user' };
const assistant: User = { id: 'assistant', name: 'Virtual Assistant' };

const store: Message[] = [];
const customStore = new CustomStore({
  key: 'id',
  load: () => Promise.resolve([...store]),
  insert: (message: Message) => {
    store.push(message);
    return Promise.resolve(message);
  },
});

const dataSource = new DataSource({
  store: customStore,
  paginate: false,
});

function dataItemToMessage(item: Message): OllamaMessage {
  if (!item.author?.id) throw new Error('Missing author id in message');
  return {
    role: item.author.id as 'user' | 'assistant',
    content: item.text ?? '',
  };
}

function getMessageHistory(): OllamaMessage[] {
  const items = dataSource.items().map(dataItemToMessage);
  // limit to the last 10 messages
  const maxMessages = 10;
  // adds system message to messages
  return [
    {
      role: 'system',
      content: 'Respond in plain text only. Do not use Markdown formatting.',
    },
    ...items.slice(-maxMessages),
  ];
}

async function getAIResponse(messages: OllamaMessage[]) {
  //
  // replace with your endpoint and ollama model
  //
  const response = await fetch('http://OLLAMA_HOST:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages,
      stream: false,
    }),
  });

  if (!response.ok || !response.body)
    throw new Error('Failed to connect to Ollama');

  if (!response.ok || !response.body)
    throw new Error('Failed to connect to Ollama');

  const data = await response.json();
  const content = data.message?.content ?? '';
  if (!content)
    throw new Error('No content in response');

  return content;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DxChatModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})

export class AppComponent {
  user = user;
  dataSource = dataSource;
  typingUsers = signal<User[]>([]);
  isProcessing = false;
  alerts = signal<Alert[]>([]);

  insertMessage(data: Message) {
    this.dataSource.store().push([{ type: 'insert', data }]);
  }

  async fetchAIResponse(message: Message) {
    const messages = [...getMessageHistory(), dataItemToMessage(message)];
    try {
      const aiResponse = await getAIResponse(messages);
      this.insertMessage({
        id: Date.now(),
        timestamp: new Date(),
        author: assistant,
        text: aiResponse,
      });
    } catch {
      this.alerts.set([{ message: 'Failed to connect to AI server.' }]);
    }
  }

  async processAIRequest(message: Message) {
    this.isProcessing = true;
    this.typingUsers.set([assistant]);
    await this.fetchAIResponse(message);
    this.typingUsers.set([]);
    this.isProcessing = false;
  }

  async onMessageEntered(e: any) {
    const message = e.message;
    if (!message) return;
    this.insertMessage({ id: Date.now(), ...message });
    if (this.alerts().length === 0) {
      await this.processAIRequest(message);
    }
  }
}
