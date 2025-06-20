import React, { useCallback, useState } from "react";
import Chat, { type ChatTypes } from "devextreme-react/chat";
import { user, assistant } from "./data";
import { dataSource, useApi } from "./useApi";

const App: React.FC = () => {
  const { alerts, insertMessage, fetchAIResponse } = useApi();

  const [typingUsers, setTypingUsers] = useState<ChatTypes.User[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processAIRequest = useCallback(
    async (message: ChatTypes.Message) => {
      setIsProcessing(true);
      setTypingUsers([assistant]);
      await fetchAIResponse(message);
      setTypingUsers([]);
      setIsProcessing(false);
    },
    [fetchAIResponse]
  );

  const onMessageEntered = useCallback(
    async ({ message }: ChatTypes.MessageEnteredEvent) => {
      if (!message) return;
      insertMessage({ id: Date.now(), ...message });
      if (!alerts.length) {
        await processAIRequest(message);
      }
    },
    [insertMessage, alerts.length, processAIRequest]
  );

  return (
    <div style={{ margin: "20px" }}>
      <Chat
        className={isProcessing ? "dx-chat-disabled" : ""}
        dataSource={dataSource}
        showAvatar={false}
        user={user}
        height={600}
        onMessageEntered={onMessageEntered}
        alerts={alerts}
        typingUsers={typingUsers}
        reloadOnChange={false}
      />
    </div>
  );
};

export default App;
