import mongoose from "mongoose";

const userMessageSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  user_message_id: { type: Number, required: true },
  group_message_id: { type: Number, required: true },
  message_thread_id: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

export const UserMessageModel = mongoose.models.UserMessage || mongoose.model("UserMessage", userMessageSchema);
