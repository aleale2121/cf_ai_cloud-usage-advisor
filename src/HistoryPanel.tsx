import { useState, useEffect } from "react";
import { Button } from "@/components/button/Button";
import { MessageSquare, Trash2 } from "lucide-react";

type Thread = {
  threadId: string;
  title: string;
  createdAt: string;
  msgCount?: number;
};
type ThreadsResponse = { threads?: Thread[] };

export function HistoryPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);

  async function loadThreads() {
    try {
      const r = await fetch("/api/chat/list");
      if (!r.ok) return;
      const d = (await r.json()) as ThreadsResponse;
      setThreads(d.threads ?? []);
    } catch (error) {
      console.error("Failed to load threads:", error);
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);

  async function handleDelete(threadId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
      setThreads((prev) => prev.filter((t) => t.threadId !== threadId));
    } catch (error) {
      console.error("Failed to delete thread:", error);
      alert("Failed to delete conversation. Please try again.");
    }
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      {threads.length === 0 ? (
        // Empty state for history panel
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
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
        // Conversation History List
        <div className="space-y-3">
          {threads.map((t) => (
            <div
              key={t.threadId}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-lg text-slate-900 dark:text-white truncate mb-1">
                    {t.title || "Untitled Conversation"}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {new Date(t.createdAt).toLocaleString()} • {t.msgCount ?? 0}{" "}
                    messages
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(t.threadId)}
                      className="text-sm px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
