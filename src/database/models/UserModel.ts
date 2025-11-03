import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String },
  first_name: { type: String },
  message_thread_id: { type: Number },
  topic_status: { type: String, enum: ["open", "closed"], default: "open" },
  last_group_message_id: { type: Number },
  last_user_message_id: { type: Number },
  banned: { type: Boolean, default: false }, // ✅ 新增字段
  created_at: { type: Date, default: Date.now },
});

// 第三个参数显式指定集合名
export const UserModel =
  mongoose.models.UserModel || mongoose.model("UserModel", userSchema, "userid");
