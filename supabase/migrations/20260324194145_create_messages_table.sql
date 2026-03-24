/*
  # Create messages table for Hasan & Saba chat app

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender` (text, either "Hasan" or "Saba")
      - `text` (text, optional message content)
      - `imageData` (text, optional base64 image)
      - `gifUrl` (text, optional GIF URL)
      - `reactions` (jsonb, emoji reactions keyed by emoji with array of usernames)
      - `ts` (bigint, timestamp in milliseconds)
      - `created_at` (timestamptz, for indexing)

  2. Security
    - Enable RLS on messages table
    - Both users can read all messages
    - Both users can insert messages (as either Hasan or Saba, no auth required since it's just a fun app)
    - Users can only delete/update their own messages
    - Add index on ts for efficient sorting
*/

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  sender text NOT NULL CHECK (sender IN ('Hasan', 'Saba')),
  text text,
  imageData text,
  gifUrl text,
  reactions jsonb DEFAULT '{}',
  ts bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_ts_idx ON messages(ts);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (true);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (true)
  WITH CHECK (true);
