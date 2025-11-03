import mongoose from "mongoose";

export async function connectDatabase(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log("✅ 已成功连接 MongoDB 数据库");
  } catch (error) {
    console.error("❌ MongoDB 连接失败：", error);
    process.exit(1);
  }
}
