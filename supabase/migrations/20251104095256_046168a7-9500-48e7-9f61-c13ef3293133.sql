-- Add DELETE policy for chat_messages table to allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON chat_messages FOR DELETE
USING (auth.uid() = user_id);