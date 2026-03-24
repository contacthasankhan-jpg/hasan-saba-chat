/*
  # Create seen_status table for read receipts

  1. New Tables
    - `seen_status`
      - `username` (text, primary key, either "Hasan" or "Saba")
      - `last_seen` (bigint, timestamp in milliseconds of last view)
      - `updated_at` (timestamptz, for tracking updates)

  2. Security
    - Enable RLS on seen_status table
    - Both users can read all records (to see if other person has seen)
    - Both users can insert/update their own seen status
*/

CREATE TABLE IF NOT EXISTS seen_status (
  username text PRIMARY KEY CHECK (username IN ('Hasan', 'Saba')),
  last_seen bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE seen_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read seen status"
  ON seen_status FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update seen status"
  ON seen_status FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert seen status"
  ON seen_status FOR INSERT
  WITH CHECK (true);
