import {
  createThread,
  deleteThread,
  getLatestThread,
  getThreadMessagesWithFiles,
  listThreads
} from "../../db/d1";
import { getFileDownloadUrl } from "../../storage/file-storage";
import { processChatMessage } from "./processor";

export async function chatRoutes(
  request: Request,
  env: Env,
  userId: string
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/chat/new" && request.method === "POST") {
    console.log("Creating brand NEW chat thread");
    try {
      const threadId = await createThread(env, userId);
      return Response.json({ threadId, success: true });
    } catch (error) {
      console.error("Failed to create new thread:", error);
      return Response.json(
        { error: "Failed to create new chat" },
        { status: 500 }
      );
    }
  }

  // Main chat endpoint
  if (url.pathname === "/api/chat" && request.method === "POST") {
    return await handleChatMessage(request, env, userId);
  }

  // History endpoint
  if (url.pathname === "/api/chat/history" && request.method === "GET") {
    console.log("Chat history request");

    const threadId =
      url.searchParams.get("threadId") || (await getLatestThread(env, userId));

    if (!threadId) return Response.json({ messages: [] });

    const messagesWithFiles = await getThreadMessagesWithFiles(
      env,
      userId,
      threadId
    );
    if (messagesWithFiles.length === 0) return Response.json({ messages: [] });

    const messages = await Promise.all(
      messagesWithFiles.map(async (msg) => ({
        role: msg.role,
        text: msg.content,
        messageId: msg.messageId,
        timestamp: msg.createdAt,
        files: await Promise.all(
          msg.files.map(async (f) => ({
            ...f,
            downloadUrl: await getFileDownloadUrl(env, f.r2Key)
          }))
        )
      }))
    );

    return Response.json({ messages, threadId });
  }

  // Thread list
  if (url.pathname === "/api/chat/list" && request.method === "GET") {
    const threads = await listThreads(env, userId);
    return Response.json({ threads });
  }

  // Messages for thread
  if (
    url.pathname.startsWith("/api/chat/threads/") &&
    url.pathname.endsWith("/messages") &&
    request.method === "GET"
  ) {
    return await handleGetThreadMessages(request, env, userId);
  }

  // Delete thread
  if (
    url.pathname.startsWith("/api/chat/threads/") &&
    request.method === "DELETE"
  ) {
    const threadId = url.pathname.split("/").pop()!;
    await deleteThread(env, userId, threadId);
    return Response.json({ success: true });
  }

  return null;
}

async function handleChatMessage(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const {
      message = "",
      fileIds = [],
      sessionId = "",
      threadId: providedThreadId
    } = (await request.json()) as {
      message?: string;
      fileIds?: number[];
      sessionId?: string;
      threadId?: string;
    };

    let threadId = providedThreadId || (await getLatestThread(env, userId));

    const hasContent = message.trim().length > 0 || fileIds.length > 0;

    if (!threadId && hasContent) {
      threadId = await createThread(env, userId);
    } else if (!threadId) {
      return Response.json({
        reply:
          "Please enter a message or upload files to start a conversation.",
        threadId: null
      });
    }

    const finalSessionId = sessionId || crypto.randomUUID();

    return await processChatMessage(
      env,
      userId,
      threadId,
      message,
      fileIds,
      finalSessionId
    );
  } catch (e) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleGetThreadMessages(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const threadId = request.url.split("/").slice(-2)[0];

  const messagesWithFiles = await getThreadMessagesWithFiles(
    env,
    userId,
    threadId
  );

  const messages = await Promise.all(
    messagesWithFiles.map(async (msg) => ({
      role: msg.role,
      text: msg.content,
      messageId: msg.messageId,
      timestamp: msg.createdAt,
      files: await Promise.all(
        msg.files.map(async (f) => ({
          ...f,
          downloadUrl: await getFileDownloadUrl(env, f.r2Key)
        }))
      )
    }))
  );

  return Response.json({ messages });
}
