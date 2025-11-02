import { routeAgentRequest, type Schedule } from "agents";
import { getSchedulePrompt } from "agents/schedule";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { google } from "@ai-sdk/google";
import { processToolCalls, cleanupMessages } from "./utils";
import {
  createThread,
  getLatestThread,
  saveMessage,
  saveAnalysis,
  getThreadMessages,
  listThreads,
  getFullThreadText,
  deleteThread,
  getLatestAnalysis
} from "./d1";
import { analyzeCostsWithGemini } from "./optimizer";

const model = google("gemini-2.5-flash");

// type SimpleMsg = { role: "system" | "user" | "assistant"; content: string };
type AiRunOut = { response?: string };

async function isRelevant(env: Env, text: string): Promise<boolean> {
  if (!text || !text.trim()) return false;
  const res = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "You answer strictly with YES or NO." },
      { role: "user", content: `Is this about cloud cost optimization and/or cloud infrastructure? ${text}` }
    ],
    temperature: 0.2,
    max_tokens: 10
  });
  const answer = (res as AiRunOut)?.response?.trim().toUpperCase() || "";
  return answer.startsWith("Y");
}

/** Realtime chat Agent (kept if you also use tools + human-in-the-loop later) */
export class Chat extends AIChatAgent<Env> {
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    const tools: ToolSet = {}; // none for now
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const cleaned = cleanupMessages(this.messages);
        const processed = await processToolCalls({
          messages: cleaned,
          dataStream: writer,
          tools,
          executions: {}
        });

        const result = streamText({
          system: `You are a helpful FinOps assistant. ${getSchedulePrompt({ date: new Date() })}`,
          messages: convertToModelMessages(processed),
          model,
          tools,
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<typeof tools>,
          stopWhen: stepCountIs(10)
        });

        writer.merge(result.toUIMessageStream());
      }
    });
    return createUIMessageStreamResponse({ stream });
  }

  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: `Running scheduled task: ${description}` }],
        metadata: { createdAt: new Date() }
      }
    ]);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const userId = "guest";

    // Serve UI
    if (url.pathname === "/" || url.pathname.startsWith("/assets")) {
      return env.ASSETS.fetch(request);
    }

    // === Chat+Analysis entrypoint ===
    // if (url.pathname === "/api/chat" && request.method === "POST") {
    //   try {
    //     const { plan = "", metrics = "", message = "" } = (await request.json()) as {
    //       plan?: string; metrics?: string; message?: string;
    //     };

    //     let threadId = await getLatestThread(env, userId);
    //     if (!threadId) threadId = await createThread(env, userId);

    //     // Relevance gate: at least 1 of {plan, metrics, message} must be relevant
    //     const [rp, rm, rmsg] = await Promise.all([
    //       isRelevant(env, plan), isRelevant(env, metrics), isRelevant(env, message)
    //     ]);
    //     const relevant = Number(rp) + Number(rm) + Number(rmsg);

    //     await saveMessage(env, userId, threadId, "user", message || "[Uploaded Files]", rmsg);

    //     if (relevant === 0) {
    //       const reply = "Your inputs do not appear related to cloud cost optimization. Please provide a billing/plan file, usage metrics, or a FinOps question.";
    //       await saveMessage(env, userId, threadId, "assistant", reply, true);
    //       return Response.json({ reply, threadId });
    //     }

    //     // If any file provided, we run cost analysis using the message as comment
    //     if (plan || metrics) {
    //       const result = await analyzeCostsWithGemini(env, plan, metrics, message);
    //       await saveMessage(env, userId, threadId, "assistant", result, true);
    //       await saveAnalysis(env, userId, threadId, plan, metrics, message, result);
    //       return Response.json({ reply: result, threadId });
    //     }

    //     // Otherwise, normal chat (contextual)
    //     const prior = await getThreadMessages(env, userId, threadId);
    //     const msgs: SimpleMsg[] = [
    //       { role: "system", content: "You are Cloud FinOps Copilot." },
    //       ...prior.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    //       { role: "user", content: message }
    //     ];

    //     const out = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    //       messages: msgs,
    //       temperature: 0.5,
    //       max_tokens: 800
    //     });
    //     const reply = (out as AiRunOut)?.response || "…";
    //     await saveMessage(env, userId, threadId, "assistant", reply, true);
    //     return Response.json({ reply, threadId });
    //   } catch (e) {
    //     console.error("POST /api/chat failed:", e);
    //     return Response.json({ error: "Internal Server Error" }, { status: 500 });
    //   }
    // }
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { plan = "", metrics = "", message = "" } = (await request.json()) as {
          plan?: string; metrics?: string; message?: string;
        };
    
        const userId = "guest";
        let threadId = await getLatestThread(env, userId);
        if (!threadId) threadId = await createThread(env, userId);
    
        // --- Step 1: Fetch latest analysis for context ---
        const latestAnalysis = await getLatestAnalysis(env, userId, threadId);
    
        // --- Step 2: Check relevance ---
        const [rp, rm, rmsg] = await Promise.all([
          isRelevant(env, plan),
          isRelevant(env, metrics),
          isRelevant(env, message)
        ]);
        const relevant = Number(rp) + Number(rm) + Number(rmsg);
    
        // --- Step 3: Handle completely unrelated ---
        if (relevant === 0 && !latestAnalysis) {
          const reply =
            "Your message doesn't appear related to cloud cost optimization. Please provide billing, usage metrics, or a FinOps-related question.";
          return Response.json({ reply, threadId });
        }
    
        // --- Step 4: Build context for continuity ---
        let context = "";
        if (latestAnalysis) {
          const { results } = await env.DB.prepare(
            `SELECT role, content FROM messages
             WHERE threadId = ?
             ORDER BY datetime(createdAt) DESC LIMIT 5`
          )
            .bind(threadId)
            .all();
          const ctx = (results as any[]) ?? [];
          context = ctx.reverse().map((r) => `${r.role}: ${r.content}`).join("\n");
        }
    
        // --- Step 5: Prepare analysis comment ---
        const userText = message || "[Uploaded Files]";
        const analysisPrompt =
          relevant > 0
            ? `Continue analyzing cloud spend trends${
                latestAnalysis
                  ? " based on the previous context."
                  : " as a new analysis session."
              }\n\n${context}\n\nNew input:\n${userText}`
            : `Determine if this is unrelated to cloud cost optimization:\n${userText}`;
    
        // --- Step 6: Run analysis only if relevant ---
        if (relevant > 0) {
          const result = await analyzeCostsWithGemini(env, plan, metrics, analysisPrompt);
          const analysisId = await saveAnalysis(env, userId, threadId, plan, metrics, message, result);
    
          await saveMessage(env, userId, threadId, "user", message || "[Uploaded Files]", true, analysisId);
          await saveMessage(env, userId, threadId, "assistant", result, true, analysisId);
    
          return Response.json({ reply: result, threadId });
        }
    
        // --- Step 7: Handle unrelated continuation ---
        const reply = "This message doesn't seem related to the prior cloud analysis context.";
        await saveMessage(env, userId, threadId, "assistant", reply, false, latestAnalysis?.id ?? null);
        return Response.json({ reply, threadId });
      } catch (e) {
        console.error("POST /api/chat failed:", e);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
      }
    }

    // History for current thread (used on initial load)
    if (url.pathname === "/api/chat/history" && request.method === "GET") {
      const threadId = await getLatestThread(env, userId);
      if (!threadId) return Response.json({ messages: [] });
      const msgs = await getThreadMessages(env, userId, threadId);
      return Response.json({ messages: msgs.map(m => ({ role: m.role, text: m.content })) });
    }

    // List threads
    if (url.pathname === "/api/chat/list" && request.method === "GET") {
      const threads = await listThreads(env, userId);
      return Response.json({ threads });
    }

    // Summarize a thread
    if (url.pathname === "/api/chat/summarize" && request.method === "POST") {
      const { threadId } = (await request.json()) as { threadId?: string };
      if (!threadId) return Response.json({ error: "threadId is required" }, { status: 400 });

      const full = await getFullThreadText(env, userId, threadId);
      const out = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          { role: "system", content: "You summarize FinOps chats into crisp bullet points." },
          { role: "user", content: `Summarize key spend drivers and actions:\n${full}` }
        ],
        temperature: 0.4,
        max_tokens: 600
      });
      return Response.json({ summary: (out as AiRunOut)?.response ?? "" });
    }

    // Delete a thread
    if (url.pathname.startsWith("/api/chat/threads/") && request.method === "DELETE") {
      const threadId = url.pathname.split("/").pop()!;
      await deleteThread(env, userId, threadId);
      return Response.json({ success: true });
    }

    // Optional: dedicated analysis endpoint (your app doesn’t need it now)
    if (url.pathname === "/api/tools/analyzeCosts" && request.method === "POST") {
      try {
        const { plan = "", metrics = "", comment = "" } = await request.json() as any;
        const result = await analyzeCostsWithGemini(env, plan, metrics, comment);
        return Response.json({ suggestion: result });
      } catch (e) {
        console.error("analyzeCosts failed:", e);
        return Response.json({ error: "Analysis failed" }, { status: 500 });
      }
    }

    // Agent routes (if you keep AI Agents framework)
    const maybe = await routeAgentRequest(request, env);
    if (maybe) return maybe;

    // Fallback to static assets (404 otherwise)
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
