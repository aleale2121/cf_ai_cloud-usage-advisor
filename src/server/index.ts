import { routeAgentRequest } from "agents";
import { Chat } from "./ai/chat-agent";
import { aiRoutes } from "./api/ai/routes";
import { chatRoutes } from "./api/chat/routes";
import { fileRoutes } from "./api/files/routes";
import { getOrSetSessionId } from "./session/cookie";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ✅ Get session + cookie header if a new session was generated
    const { sessionId, setCookie } = getOrSetSessionId(request);
    const userId = sessionId;

    console.log("Session ID ==>");
    console.log(sessionId);

    console.log(
      `${request.method} ${url.pathname} - Starting request processing`
    );

    let response: Response | null = null;

    // Serve static assets
    if (url.pathname === "/" || url.pathname.startsWith("/assets")) {
      response = await env.ASSETS.fetch(request);
    } else {
      // API: Chat
      response = await chatRoutes(request, env, userId);
      if (!response) {
        // API: Files
        response = await fileRoutes(request, env, userId);
      }
      if (!response) {
        // API: AI tools
        response = await aiRoutes(request, env, userId);
      }
      if (!response) {
        // Agent routes
        console.log("Checking agent routes...");
        response = await routeAgentRequest(request, env);
      }
      if (!response) {
        // Fallback static assets
        console.log("Falling back to static assets");
        response = await env.ASSETS.fetch(request);
      }
    }

    // ✅ If a new session was created, attach Set-Cookie to response
    if (setCookie && response instanceof Response) {
      response.headers.append("Set-Cookie", setCookie);
    }

    return response;
  }
} satisfies ExportedHandler<Env>;

export { Chat };
