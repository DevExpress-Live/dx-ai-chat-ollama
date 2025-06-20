// In‐memory store of ChatTypes.Message objects
const store = [];

// DevExtreme CustomStore backed by store
const customStore = new DevExpress.data.CustomStore({
  key: "id",
  load: () => Promise.resolve([...store]),
  insert: (message) => {
    store.push(message);
    return Promise.resolve(message);
  },
  update: (key, values) => {
    const idx = store.findIndex((m) => m.id === key);
    Object.assign(store[idx], values);
    return Promise.resolve();
  },
});

// DataSource for the dxChat widget
const dataSource = new DevExpress.data.DataSource({
  store: customStore,
  paginate: false,
});

// Convert a stored message to Ollama format
function dataItemToMessage(item) {
  if (!item.author || !item.author.id) {
    throw new Error("Missing author in message");
  }
  return {
    role: item.author.id, // "user" or "assistant"
    content: item.text || "",
  };
}

// Build the history + system prompt, trimmed to last N
function getMessageHistory() {
  const maxMessages = 10;
  const items = dataSource.items().map(dataItemToMessage);
  return [
    {
      role: "system",
      content: "Respond in plain text only. Do not use Markdown formatting.",
    },
    ...items.slice(-maxMessages),
  ];
}

// Call Ollama streaming endpoint
async function getAIResponse(messages) {
  //
  // replace with your Ollama host URL
  //
  const resp = await fetch("http://OLLAMA_HOST:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama3.2", messages, stream: true }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error("Ollama connection failed");
  }
  const data = await resp.json();
  const content = data.message.content ?? '';
  if (!content) {
    throw new Error('No content in response');
  }
  return content;
}

// Initialize the DevExtreme Chat widget
$(() => {
  $("#chat").dxChat({
    dataSource,
    user: { id: "user", name: "You" },
    height: 700,
    showAvatar: false,
    showDayHeaders: false,
    reloadOnChange: false,

    // Intercept the default insert:
    onMessageEntered: function (e) {
      fetchAIResponse(e.message);
    },
  });
});

// Helper to insert a ChatTypes.Message
function insertMessage(msg) {
  dataSource.store().insert({
    id: Date.now(),
    timestamp: new Date(),
    author: { id: msg.author.id, name: msg.author.name || "You" },
    text: msg.text,
  });
}

// Send history + new user message, then insert assistant reply
async function fetchAIResponse(message) {
  try {
    const history = getMessageHistory().concat(dataItemToMessage(message));
    const aiText = await getAIResponse(history);
    insertMessage({
      id: Date.now(),
      timestamp: new Date(),
      author: { id: "assistant", name: "Virtual Assistant" },
      text: aiText,
    });
    dataSource.reload();
  } catch (err) {
    insertMessage({
      id: Date.now(),
      timestamp: new Date(),
      author: { id: "assistant", name: "Virtual Assistant" },
      text: "Error: could not reach AI server.",
    });
    dataSource.reload();
    console.error(err);
  }
}
