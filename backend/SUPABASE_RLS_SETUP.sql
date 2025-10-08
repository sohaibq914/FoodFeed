-- Supabase Row Level Security (RLS) Policies for Messages Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor

-- Allow users to insert their own messages
CREATE POLICY "Users can insert their own messages"
ON messages
FOR INSERT
WITH CHECK (true);

-- Allow users to read messages where they are sender or receiver
CREATE POLICY "Users can read their own messages"
ON messages
FOR SELECT
USING (
  auth.uid()::text = sender_id OR 
  auth.uid()::text = receiver_id
);

-- Allow users to update their own messages (optional)
CREATE POLICY "Users can update their own messages"
ON messages
FOR UPDATE
USING (auth.uid()::text = sender_id)
WITH CHECK (auth.uid()::text = sender_id);

-- Allow users to delete their own messages (optional)
CREATE POLICY "Users can delete their own messages"
ON messages
FOR DELETE
USING (auth.uid()::text = sender_id);

