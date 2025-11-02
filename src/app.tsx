import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/file-upload/file-upload";
import { Textarea } from "@/components/textarea/Textarea";
import { Button } from "@/components/button/Button";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { Loader2, History, Upload, MessageCircle } from "lucide-react";
import { HistoryPanel } from "./HistoryPanel";

/* ---------- Interfaces ---------- */
interface ChatResponse {
  reply: string;
  threadId?: string;
}
interface HistoryResponse {
  messages: { role: "user" | "assistant"; text: string }[];
}

/* ---------- Component ---------- */
export default function App() {
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [metricsFile, setMetricsFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  /* ---------- Check if send button should be enabled ---------- */
  const isSendEnabled = message.trim().length > 0 || planFile || metricsFile;

  /* ---------- Send Message ---------- */
  async function handleSend() {
    if (!isSendEnabled) return;

    const planText = planFile ? await planFile.text() : "";
    const metricsText = metricsFile ? await metricsFile.text() : "";

    setLoading(true);
    setChat((c) => [
      ...c,
      { role: "user", text: message || "[Uploaded Files]" }
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planText, metrics: metricsText, message })
      });

      const data: ChatResponse = await res.json();
      if (data.reply) {
        setChat((c) => [...c, { role: "assistant", text: data.reply }]);
      } else {
        setChat((c) => [
          ...c,
          { role: "assistant", text: "⚠️ Unexpected server response." }
        ]);
      }
    } catch (error) {
      console.error(error);
      setChat((c) => [
        ...c,
        { role: "assistant", text: "❌ Error: failed to reach server." }
      ]);
    }

    // Clear files and message after send
    setMessage("");
    setPlanFile(null);
    setMetricsFile(null);
    setLoading(false);
  }

  /* ---------- Load Chat History on Mount ---------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/chat/history");
        const d: HistoryResponse = await r.json();
        if (d.messages) setChat(d.messages);
      } catch {
        console.warn("No history found or endpoint missing.");
      }
    })();
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  return (
    <main className="h-screen w-full flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* === Sidebar (History) - Now on LEFT === */}
        <aside
          className={`w-[800px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block ${
            showSidebar
              ? "translate-x-0"
              : "-translate-x-full absolute inset-y-0 left-0"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-2xl text-slate-900 dark:text-white">
                Conversation History
              </h2>
              <Button
                variant="outline"
                size="lg"
                className="lg:hidden border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                onClick={() => setShowSidebar(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HistoryPanel />
            </div>
          </div>
        </aside>

        {/* === Main Chat Area - Now on RIGHT === */}
        <section className="flex-1 flex flex-col border-x border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">☁️</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Cloud FinOps Copilot
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  AI-powered cloud cost optimization
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="lg:hidden flex items-center gap-3 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setShowSidebar((s) => !s)}
            >
              <History className="h-5 w-5" />
              {showSidebar ? "Hide" : "History"}
            </Button>
          </div>

          {/* Messages Area - Scrollable */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50 dark:bg-slate-800/30 .chat-scrollbar"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#7b7e81 #111e2b"
            }}
          >
            {chat.length === 0 ? (
              // Empty state for chat
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                  <MessageCircle className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  Welcome to Cloud FinOps Copilot
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-6">
                  I'm your AI assistant for cloud cost optimization. I can help
                  you analyze your cloud spending, identify cost-saving
                  opportunities, and optimize your cloud resources.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <Upload className="h-6 w-6 text-blue-500" />
                    <h4 className="text-xl font-medium text-slate-700 dark:text-slate-300">
                      Get Started
                    </h4>
                  </div>
                  <ul className="text-left text-slate-600 dark:text-slate-400 space-y-2 text-lg">
                    <li>
                      • Upload your <strong>Plan/Billing File</strong> to
                      analyze current costs
                    </li>
                    <li>
                      • Upload your <strong>Usage Metrics File</strong> for
                      resource optimization
                    </li>
                    <li>• Ask questions about cost optimization strategies</li>
                    <li>• Get recommendations for reducing cloud spending</li>
                  </ul>
                </div>
              </div>
            ) : (
              // Chat messages when there are conversations
              <>
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[97%] rounded-lg p-4 ${
                        m.role === "user"
                          ? "bg-blue-500 text-gray-100"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-lg leading-relaxed">
                        <MemoizedMarkdown content={m.text} id={`msg-${i}`} />
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[95%] rounded-lg p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <div className="italic text-slate-500 dark:text-slate-400 text-lg">
                          Analyzing your query...
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fixed Input Area at Bottom */}
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {/* File Uploads */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <p className="font-semibold mb-3 text-xl text-slate-700 dark:text-slate-300">
                    Plan / Billing File
                  </p>
                  <FileUpload
                    onFileSelect={setPlanFile}
                    selectedFile={planFile}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold mb-3 text-xl text-slate-700 dark:text-slate-300">
                    Usage Metrics File
                  </p>
                  <FileUpload
                    onFileSelect={setMetricsFile}
                    selectedFile={metricsFile}
                  />
                </div>
              </div>
            </div>

            {/* Input Controls */}
            <div className="p-6">
              <div className="flex gap-4 items-stretch">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about cloud costs, upload billing files, or analyze your cloud spending..."
                  className="flex-1 min-h-[120px] max-h-[240px] resize-none text-xl p-5 border border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-lg bg-white dark:bg-slate-800 transition-colors duration-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!isSendEnabled || loading}
                  className={`
                    w-36 px-6 text-2xl shrink-0 rounded-lg border-2 
                    font-bold flex items-center justify-center min-h-[120px]
                    transition-colors duration-200
                    ${
                      !isSendEnabled || loading
                        ? "bg-slate-300 border-slate-300 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400"
                        : "!bg-blue-700 !border-blue-700 text-white hover:!bg-blue-800 hover:!border-blue-800"
                    }
                  `}
                >
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <span className="whitespace-nowrap">Send</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
