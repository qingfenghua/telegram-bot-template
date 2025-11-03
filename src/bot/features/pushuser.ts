import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer } from 'grammy'
import { UserModel } from '#root/database/models/user.js' // ✅ 统一模型
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// 🚀 /userp 命令：向指定用户或用户名推送消息
feature.command('userp', logHandle('command-userp'), async (ctx) => {
  // 命令参数
  const args = ctx.message?.text?.split(' ').slice(1)
  if (!args || args.length === 0) {
    return ctx.reply(
      '⚠️ 用法：请回复一条消息并输入 `/userp <user_id>` 或 `/userp @username`\n支持多个空格分隔。',
      { parse_mode: 'Markdown' }
    )
  }

  // 必须回复一条消息
  const replyMsg = ctx.message?.reply_to_message
  if (!replyMsg) {
    return ctx.reply(
      '⚠️ 请先回复一条要推送的消息，然后输入 `/userp <user_id 或 @username>`',
      { parse_mode: 'Markdown' }
    )
  }

  const targetIds: number[] = []

  // 解析参数
  for (const arg of args) {
    // 如果是数字ID
    if (/^\d+$/.test(arg)) {
      targetIds.push(Number(arg))
      continue
    }

    // 用户名（支持带 @）
    const username = arg.replace(/^@/, '')
    const user = await UserModel.findOne({
      username: { $regex: `^${username}$`, $options: 'i' },
    })
    if (user) {
      targetIds.push(user.user_id)
    }
  }

  if (targetIds.length === 0) {
    return ctx.reply('⚠️ 未找到有效的用户（请确认 ID 或用户名正确）')
  }

  await ctx.reply(`🚀 开始推送，共 ${targetIds.length} 位用户，请稍候...`)

  let success = 0
  let fail = 0

  for (const user_id of targetIds) {
    try {
      await ctx.api.copyMessage(user_id, ctx.chat!.id, replyMsg.message_id, {
        disable_notification: true,
      })
      success++
    } catch (err: any) {
      fail++
      // 用户拉黑或账号无效 → 删除数据库记录
      if (err.error_code === 403 || err.error_code === 400) {
        await UserModel.deleteOne({ user_id })
      }
    }

    // 防止限流，每 200ms 推送一个
    await new Promise((r) => setTimeout(r, 200))
  }

  // ✅ 发送纯文本（禁用 Markdown，防止转义错误）
  await ctx.reply(`✅ 推送完成\n成功：${success}\n失败：${fail}`, {
    parse_mode: undefined,
  })
})

export { composer as userpFeature }
