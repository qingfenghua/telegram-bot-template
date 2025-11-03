import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer } from 'grammy'
import { UserModel } from '#root/database/models/user.js'
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// 🚀 /push 命令：广播消息给所有用户（所有用户都可用）
feature.command('push', logHandle('command-push'), async (ctx) => {
  const replyMsg = ctx.message?.reply_to_message
  if (!replyMsg) {
    return ctx.reply('⚠️ 请先回复一条要推送的消息，然后输入 /push')
  }

  // 从数据库中读取所有用户
  const users = await UserModel.find({}, { user_id: 1 })
  if (!users.length) {
    return ctx.reply('⚠️ 暂无用户记录。')
  }

  await ctx.reply(`📢 广播开始，共 ${users.length} 位用户，请稍候...`)

  let success = 0
  let fail = 0

  for (const u of users) {
    try {
      // 使用 copyMessage 可以保留原始格式（文字/媒体/贴文都行）
      await ctx.api.copyMessage(u.user_id, ctx.chat!.id, replyMsg.message_id, {
        disable_notification: true,
      })
      success++
    } catch (err: any) {
      fail++
      // 用户拉黑或账号无效 → 删除数据库记录
      if (err.error_code === 403 || err.error_code === 400) {
        await UserModel.deleteOne({ user_id: u.user_id })
      }
    }

    // 防止限流：每 200ms 推一个
    await new Promise((r) => setTimeout(r, 200))
  }

  await ctx.reply(
    `✅ 广播完成\n成功：${success}\n失败：${fail}`,
    { parse_mode: undefined } // 禁止 Markdown 解析，防止符号报错
  )
})

export { composer as pushFeature }
