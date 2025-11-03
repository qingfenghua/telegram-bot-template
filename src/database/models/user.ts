import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String },
  first_name: { type: String },
  language: { type: String, default: "zh" },
  created_at: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  messagesToday: { type: Number, default: 0 }
});

export const UserModel = mongoose.model("User", userSchema);
