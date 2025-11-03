// src/database/models/LinkModel.ts
import mongoose from "mongoose";

const autoLinkSchema = new mongoose.Schema({
  title: { type: String },
  url: { type: String, required: true, unique: true },
  type: { type: String, enum: ["group", "channel"], required: true },
  description: { type: String },
  language: { type: String, default: "unknown" },
  members_count: { type: Number, default: null },
  submitted_by: { type: Number, required: true },
  submitted_username: { type: String },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  bot_member_status: {
    type: String,
    enum: ["administrator", "member", "left", "kicked", "restricted", "unknown"],
    default: "unknown",
  },
  is_bot_admin: { type: Boolean, default: false },

  created_at: { type: Date, default: Date.now },
});

// ✅ 指定集合名 autolink
export const AutoLinkModel =
  mongoose.models.AutoLinkModel ||
  mongoose.model("AutoLinkModel", autoLinkSchema, "autolink")
