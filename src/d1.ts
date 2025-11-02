export interface Thread {
  threadId: string;
  title: string;
  createdAt: string;
  msgCount?: number;
}

export interface MessageRow {
  role: string;
  content: string;
  relevant?: number;
}

export async function createThread(env: Env, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO conversations (threadId, userId, title, createdAt)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(id, userId, "New Conversation")
    .run();
  return id;
}

export async function getLatestThread(
  env: Env,
  userId: string
): Promise<string | null> {
  const { results } = await env.DB.prepare(
    `SELECT threadId FROM conversations
     WHERE userId = ?
     ORDER BY datetime(createdAt) DESC
     LIMIT 1`
  )
    .bind(userId)
    .all();

  const row = results?.[0] as { threadId?: string } | undefined;
  return row?.threadId ?? null;
}

export async function saveMessage(
  env: Env,
  userId: string,
  threadId: string,
  role: "user" | "assistant",
  content: string,
  relevant: boolean,
  analysisId?: number | null
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO messages (userId, threadId, role, content, relevant, analysisId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(userId, threadId, role, content, relevant ? 1 : 0, analysisId ?? null)
    .run();
}

export async function getThreadMessages(
  env: Env,
  userId: string,
  threadId: string
) {
  const { results } = await env.DB.prepare(
    `SELECT role, content, relevant FROM messages
     WHERE userId = ? AND threadId = ?
     ORDER BY datetime(createdAt) ASC`
  )
    .bind(userId, threadId)
    .all();

  const rows = (results as unknown as MessageRow[]) ?? [];
  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    relevant: !!r.relevant
  }));
}

export async function saveAnalysis(
  env: Env,
  userId: string,
  threadId: string | null,
  plan: string,
  metrics: string,
  comment: string,
  result: string
): Promise<number> {
  const { meta } = await env.DB.prepare(
    `INSERT INTO analyses (userId, threadId, plan, metrics, comment, result, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(userId, threadId, plan, metrics, comment, result)
    .run();

  // meta.last_row_id is returned by D1 for inserts
  const insertedId = (meta as { last_row_id?: number }).last_row_id ?? 0;
  return insertedId;
}

export async function listThreads(env: Env, userId: string): Promise<Thread[]> {
  const { results } = await env.DB.prepare(
    `SELECT c.threadId, c.title, c.createdAt,
       (SELECT COUNT(*) FROM messages m WHERE m.threadId = c.threadId) AS msgCount
     FROM conversations c
     WHERE c.userId = ?
     ORDER BY datetime(c.createdAt) DESC`
  )
    .bind(userId)
    .all();

  return ((results as any[]) ?? []).map((r) => ({
    threadId: r.threadId,
    title: r.title,
    createdAt: r.createdAt,
    msgCount: Number(r.msgCount ?? 0)
  }));
}

export async function getLatestAnalysis(
  env: Env,
  userId: string,
  threadId: string
) {
  const { results } = await env.DB.prepare(
    `SELECT id, result, createdAt FROM analyses
     WHERE userId = ? AND threadId = ?
     ORDER BY datetime(createdAt) DESC
     LIMIT 1`
  )
    .bind(userId, threadId)
    .all();

  return (
    (results?.[0] as { id: number; result: string; createdAt: string }) || null
  );
}

export async function getFullThreadText(
  env: Env,
  userId: string,
  threadId: string
): Promise<string> {
  const { results } = await env.DB.prepare(
    `SELECT role, content FROM messages
     WHERE userId = ? AND threadId = ?
     ORDER BY datetime(createdAt) ASC`
  )
    .bind(userId, threadId)
    .all();

  const rows =
    (results as { role: string; content: string }[] | undefined) ?? [];
  if (!rows.length) return "No messages.";
  return rows.map((r) => `${r.role}: ${r.content}`).join("\n");
}

export async function deleteThread(
  env: Env,
  userId: string,
  threadId: string
): Promise<void> {
  // Optional: enforce userId if you want to ensure only owner can delete
  await env.DB.prepare(`DELETE FROM messages WHERE threadId = ?`)
    .bind(threadId)
    .run();
  await env.DB.prepare(`DELETE FROM analyses WHERE threadId = ?`)
    .bind(threadId)
    .run();
  await env.DB.prepare(
    `DELETE FROM conversations WHERE threadId = ? AND userId = ?`
  )
    .bind(threadId, userId)
    .run();
}
