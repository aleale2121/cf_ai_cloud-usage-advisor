DROP INDEX IF EXISTS idx_files_session;
DROP INDEX IF EXISTS idx_files_analysis;
DROP INDEX IF EXISTS idx_files_message;
DROP INDEX IF EXISTS idx_files_user_thread;
DROP INDEX IF EXISTS idx_analyses_user_created;
DROP INDEX IF EXISTS idx_msg_messageId;
DROP INDEX IF EXISTS idx_msg_thread_created;
DROP INDEX IF EXISTS idx_conv_user_created;

DROP TABLE IF EXISTS uploaded_files;
DROP TABLE IF EXISTS analyses;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
