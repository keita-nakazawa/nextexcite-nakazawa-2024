import OpenAI from "openai";

// tools用のEnumを定義
export enum ToolType {
  CodeInterpreter = "code_interpreter",
  FileSearch = "file_search",
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,  // TODO: なんとかして削除したい
});

export const createAssistant = async (name: string, instructions: string, model: string = "gpt-4o-mini") => {
  try {
    return await openai.beta.assistants.create({
      name,
      instructions,
      model,
      tools: [{ type: ToolType.CodeInterpreter }, { type: ToolType.FileSearch }],
    });
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw error;
  }
};

export const createThread = async () => {
  try {
    return await openai.beta.threads.create();
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

export const addMessage = async (threadId: string, content: string, fileIds: string[] = []) => {
  try {
    return await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content,
      attachments: fileIds.length > 0 ? fileIds.map((id) => ({ file_id: id, tools: [{ type: ToolType.CodeInterpreter }, { type: ToolType.FileSearch }] })) : [],
    });
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

export const runAssistant = async (assistantId: string, threadId: string) => {
  try {
    return await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
};

export const getRunStatus = async (threadId: string, runId: string) => {
  try {
    return await openai.beta.threads.runs.retrieve(threadId, runId);
  } catch (error) {
    console.error("Error getting run status:", error);
    throw error;
  }
};

export const getMessages = async (threadId: string) => {
  try {
    const response = await openai.beta.threads.messages.list(threadId);
    return response.data;
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
};

export const uploadFile = async (file: File) => {
  try {
    return await openai.files.create({
      file,
      purpose: "assistants",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export default openai;