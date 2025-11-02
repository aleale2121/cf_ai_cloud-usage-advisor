import { useState, useEffect } from "react";
import { Button } from "@/components/button/Button";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { MessageSquare } from "lucide-react";

type Thread = { threadId: string; title: string; createdAt: string; msgCount?: number };
type ThreadsResponse = { threads?: Thread[] };
type SummaryResponse = { summary?: string };

export function HistoryPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [summary, setSummary] = useState("");

  async function load() {
    const r = await fetch("/api/chat/list");
    if (!r.ok) return;
    const d = (await r.json()) as ThreadsResponse;
    setThreads(d.threads ?? []);
  }

  useEffect(() => { load(); }, []);

  async function handleSummarize(threadId: string) {
    const r = await fetch("/api/chat/summarize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId })
    });
    const d = (await r.json()) as SummaryResponse;
    setSummary(d.summary || "No summary.");
  }

  async function handleDelete(threadId: string) {
    await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
    setSummary("");
    load();
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {threads.length === 0 ? (
        // Empty state for history panel
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
            No Conversations Yet
          </h3>
          <p className="text-lg text-slate-500 dark:text-slate-500">
            Start a conversation to see your history here
          </p>
        </div>
      ) : (
        // History threads when there are conversations
        <>
          {threads.map(t => (
            <div 
              key={t.threadId} 
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xl text-slate-900 dark:text-white truncate mb-2">
                    {t.title || "Untitled Conversation"}
                  </div>
                  <div className="text-lg text-slate-500 dark:text-slate-400 mb-4">
                    {new Date(t.createdAt).toLocaleString()} • {t.msgCount ?? 0} messages
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => handleSummarize(t.threadId)}
                      className="text-lg px-5 py-3 border-slate-300 dark:border-slate-600 hover:border-orange-500 rounded-lg"
                    >
                      Summarize
                    </Button>
                    <Button 
                      size="lg" 
                      variant="destructive" 
                      onClick={() => handleDelete(t.threadId)}
                      className="text-lg px-5 py-3 bg-red-500 hover:bg-red-600 rounded-lg"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {summary && (
            <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Summary</div>
              <div className="text-lg text-slate-700 dark:text-slate-300">
                <MemoizedMarkdown content={summary} id="summary" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}