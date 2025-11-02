-- Conversations (threads)
CREATE TABLE IF NOT EXISTS conversations (
  threadId TEXT PRIMARY KEY,
  userId   TEXT NOT NULL,
  title    TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Messages in a thread
CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  userId     TEXT NOT NULL,
  threadId   TEXT NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  relevant   INTEGER NOT NULL DEFAULT 0,
  analysisId INTEGER,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (threadId) REFERENCES conversations(threadId)
);

-- Persisted cost analyses (final result blob)
CREATE TABLE IF NOT EXISTS analyses (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    TEXT NOT NULL,
  threadId  TEXT,
  plan      TEXT NOT NULL,
  metrics   TEXT NOT NULL,
  comment   TEXT,
  result    TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (threadId) REFERENCES conversations(threadId)
);

CREATE INDEX IF NOT EXISTS idx_conv_user_created
ON conversations (userId, datetime(createdAt) DESC);

CREATE INDEX IF NOT EXISTS idx_msg_thread_created
ON messages (threadId, datetime(createdAt) ASC);

CREATE INDEX IF NOT EXISTS idx_analyses_user_created
ON analyses (userId, datetime(createdAt) DESC);
