import { useCallback, useState } from "react";
import { type ChatTypes } from "devextreme-react/chat";
import CustomStore from "devextreme/data/custom_store";
import DataSource from "devextreme/data/data_source";
import { assistant } from "./data";

type OllamaMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const store: ChatTypes.Message[] = [];

const customStore = new CustomStore({
  key: "id",
  load: () => Promise.resolve([...store]),
  insert: (message: ChatTypes.Message) => {
    store.push(message);
    return Promise.resolve(message);
  },
});

export const dataSource = new DataSource({
  store: customStore,
  paginate: false,
});

const dataItemToMessage = (item: ChatTypes.Message): OllamaMessage => {
  if (!item.author?.id) {
    throw new Error("Missing author id in message");
  }

  return {
    role: item.author.id as "user" | "assistant",
    content: item.text ?? "",
  };
};

const getMessageHistory = (): OllamaMessage[] => {
  const items = dataSource.items().map(dataItemToMessage);
  // limit to the last 10 messages
  const maxMessages = 10;
  // adds system message to messages
  return [
    {
      role: "system",
      content: "Respond in plain text only. Do not use Markdown formatting.",
    },
    ...items.slice(-maxMessages),
  ];
};

const getAIResponse = async (messages: OllamaMessage[]) => {
  //
  // replace with your endpoint and ollama model
  //
  const response = await fetch("http://OLLAMA_HOST:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to connect to Ollama");
  }

  // convert response body to a readable stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        result += json.message?.content ?? "";
      } catch (err) {
        console.warn("Invalid chunk:", line);
        console.error(err);
      }
    }
  }
  // return the full response text
  return result;
};

export const useApi = () => {
  const [alerts, setAlerts] = useState<ChatTypes.Alert[]>([]);

  const insertMessage = useCallback((data: ChatTypes.Message) => {
    dataSource.store().push([{ type: "insert", data }]);
  }, []);

  const fetchAIResponse = useCallback(
    async (message: ChatTypes.Message) => {
      const messages = [...getMessageHistory(), dataItemToMessage(message)];
      try {
        const aiResponse = await getAIResponse(messages);
        insertMessage({
          id: Date.now(),
          timestamp: new Date(),
          author: assistant,
          text: aiResponse,
        });
      } catch (err) {
        setAlerts([{ message: "Failed to connect to AI server." }]);
        console.error(err);
      }
    },
    [insertMessage]
  );

  return {
    alerts,
    insertMessage,
    fetchAIResponse,
  };
};
