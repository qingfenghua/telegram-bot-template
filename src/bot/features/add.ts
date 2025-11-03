import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer } from 'grammy'
import { InlineKeyboard } from 'grammy';
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()

const feature = composer
  .chatType('private')
  .filter(isAdmin)

const ADMIN_GROUP_ID = -5004741482; // 👈 替换为你的目标群组 ID（负数）

feature.command("add", async (ctx) => {
  const text = ctx.message?.text?.trim() || "";
  const args = text.split(/\s+/); // 按任意空白字符分割
  const link = args[1]; // 第二个单词才是链接

  if (!link || !/^https?:\/\//.test(link)) {
    return await ctx.reply("❌ 请输入正确的链接，例如：/add https://example.com");
  }

  const user = ctx.from;
  const userName = user?.username
    ? `@${user.username}`
    : `${user.first_name || "匿名用户"}（ID: ${user.id}）`;

  const messageToGroup = `
📥 收录请求
━━━━━━━━━━━━━━
🔗 链接：${link}
👤 提交人：${userName}
🕓 时间：${new Date().toLocaleString("zh-CN")}
`;

  try {
    await ctx.api.sendMessage(-5004741482, messageToGroup, {
      // @ts-ignore
      disable_web_page_preview: true,
    });
    await ctx.reply("✅ 链接已提交，请等待管理员审核。");
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ 提交失败，请稍后再试。");
  }
});

export { composer as addFeature }