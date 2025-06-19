<script setup>
import { ref, reactive } from "vue";
import DxChat from "devextreme-vue/chat";
import CustomStore from "devextreme/data/custom_store";
import DataSource from "devextreme/data/data_source";

// User/Assistant definitions
const user = { id: "user" };
const assistant = { id: "assistant", name: "Virtual Assistant" };

// Message store and data source
const store = reactive([]);
const customStore = new CustomStore({
  key: "id",
  load: () => Promise.resolve([...store]),
  insert: (message) => {
    store.push(message);
    return Promise.resolve(message);
  },
});

const dataSource = new DataSource({
  store: customStore,
  paginate: false,
});

// Alert, Typing, Processing states
const typingUsers = ref([]);
const isProcessing = ref(false);
const alerts = ref([]);

// AI chat logic
function dataItemToMessage(item) {
  return {
    role: item.author?.id,
    content: item.text ?? "",
  };
}

function getMessageHistory() {
  const items = dataSource.items().map(dataItemToMessage);
  const maxMessages = 10;
  return [
    {
      role: "system",
      content: "Respond in plain text only. Do not use Markdown formatting.",
    },
    ...items.slice(-maxMessages),
  ];
}

async function getAIResponse(messages) {
  //
  // Replace with your actual AI service endpoint
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

  if (!response.ok || !response.body)
    throw new Error("Failed to connect to Ollama");
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
        console.error("Error parsing AI response:", err);
      }
    }
  }
  return result;
}

function insertMessage(data) {
  dataSource.store().push([{ type: "insert", data }]);
}

async function fetchAIResponse(message) {
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
    console.error("AI response error:", err);
    alerts.value = [{ message: "Failed to connect to AI server." }];
  }
}

async function processAIRequest(message) {
  isProcessing.value = true;
  typingUsers.value = [assistant];
  await fetchAIResponse(message);
  typingUsers.value = [];
  isProcessing.value = false;
}

// onMessageEntered handler
async function onMessageEntered(e) {
  const message = e.message;
  if (!message) return;
  insertMessage({ id: Date.now(), ...message });
  if (!alerts.value.length) {
    await processAIRequest(message);
  }
}
</script>

<template>
  <div style="margin: 20px">
    <DxChat
      :class="{ 'dx-chat-disabled': isProcessing }"
      :data-source="dataSource"
      :user="user"
      :height="600"
      :alerts="alerts"
      :typing-users="typingUsers"
      :reload-on-change="false"
      @message-entered="onMessageEntered"
    />
  </div>
</template>

<style scoped>
.dx-chat-disabled {
  opacity: 0.8;
}
</style>
