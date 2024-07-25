import { addMessage, createAssistant, createThread, getMessages, getRunStatus, runAssistant, uploadFile } from "@/services/openaiService";
import { Assistant } from "openai/resources/beta/assistants.mjs";
import { Message, TextContentBlock } from "openai/resources/beta/threads/messages.mjs";
import { FileObject } from "openai/resources/files.mjs";
import React, { useEffect, useState } from "react";

const ChatInterface: React.FC = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [files, setFiles] = useState<FileObject[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createInitialAssistant();
    createNewThread();
  }, []);

  const createInitialAssistant = async () => {
    try {
      const newAssistant = await createAssistant("Default Assistant", "");
      setAssistants([newAssistant]);
      setSelectedAssistant(newAssistant);
    } catch (error) {
      setError("Failed to create initial assistant");
    }
  };

  const createNewThread = async () => {
    try {
      const thread = await createThread();
      setThreadId(thread.id);
    } catch (error) {
      setError("Failed to create a new thread");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !threadId || !selectedAssistant) return;

    setIsLoading(true);
    setError(null);

    try {
      const newMessage = await addMessage(threadId, inputMessage, files.map(file => file.id));
      setMessages([...messages, newMessage]);
      setInputMessage("");
      setFiles([]);

      const run = await runAssistant(selectedAssistant.id, threadId);
      await pollRunStatus(threadId, run.id);

      const newMessages = await getMessages(threadId);
      setMessages(newMessages.reverse());
    } catch (error) {
      setError("Failed to send message or get response");
    } finally {
      setIsLoading(false);
    }
  };

  const pollRunStatus = async (threadId: string, runId: string) => {
    let status = "queued";
    while (status !== "completed" && status !== "failed") {
      const run = await getRunStatus(threadId, runId);
      status = run.status;
      if (status === "failed") {
        throw new Error("Run failed");
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const uploadedFile = await uploadFile(file);
      setFiles([...files, uploadedFile]);
    } catch (error) {
      setError("Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssistant = async () => {
    const name = prompt("Enter assistant name:");
    const instructions = prompt("Enter assistant instructions:");
    if (name && instructions) {
      try {
        const newAssistant = await createAssistant(name, instructions);
        setAssistants([...assistants, newAssistant]);
        setSelectedAssistant(newAssistant);
      } catch (error) {
        setError("Failed to create new assistant");
      }
    }
  };

  return (
    <div className="chat-interface">
      <div className="assistant-selection">
        <select
          value={selectedAssistant?.id || ""}
          onChange={(e) => setSelectedAssistant(assistants.find(a => a.id === e.target.value) || null)}
        >
          {assistants.map(assistant => (
            <option key={assistant.id} value={assistant.id}>{assistant.name}</option>
          ))}
        </select>
        <button onClick={handleCreateAssistant}>Create New Assistant</button>
      </div>
      <div className="message-list">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.attachments?.map(attachment => `${attachment.file_id}¥n`)}
            {(message.content[0] as TextContentBlock).text.value}
          </div>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="input-area">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} disabled={isLoading}>Send</button>
        <input type="file" onChange={handleFileUpload} disabled={isLoading} />
      </div>
      {isLoading && <div className="loading">Loading...</div>}
    </div>
  );
};

export default ChatInterface;