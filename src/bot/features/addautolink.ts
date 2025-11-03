import type { Context } from '#root/bot/context.js'
import { Composer } from 'grammy'
import { logHandle } from '#root/bot/helpers/logging.js'
import { AutoLinkModel } from '#root/database/models/AutoLinkModel.js'
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// 🚀 /addautolink <Telegram链接> [描述]
feature.command('addautolink', logHandle('command-addautolink'), async (ctx) => {
  const args = ctx.message?.text?.split(' ').slice(1)
  if (!args || args.length === 0) {
    return ctx.reply(
      '⚠️ 用法：`/addautolink <Telegram链接> [描述]`\n\n例如：\n`/addautolink https://t.me/mygroup 这是一个测试群`',
      { parse_mode: 'Markdown' }
    )
  }

  const link = args[0].trim()
  const description = args.slice(1).join(' ') || ''
  const regex = /^https?:\/\/t\.me\/([A-Za-z0-9_+]{3,})$/
  const match = link.match(regex)

  if (!match) {
    return ctx.reply('❌ 无效的 Telegram 链接，请确保格式为 `https://t.me/...`')
  }

  const handle = match[1]
  const isInvite = handle.startsWith('+') || link.includes('joinchat')
  const user = ctx.from!
  const exists = await AutoLinkModel.findOne({ url: link })
  if (exists) return ctx.reply('⚠️ 该链接已在自动收录中。')

  let chatMeta: any = {}
  let membersCount: number | null = null
  let botStatus = 'unknown'
  let isAdmin = false

  try {
    if (!isInvite) {
      // ✅ 获取公开频道或超级群组信息
      const chat = await ctx.api.getChat(`@${handle}`)
      chatMeta = {
        id: chat.id,
        title: chat.title,
        username: chat.username,
        description: chat.description || '',
        type: chat.type, // 'channel' | 'supergroup' | ...
      }

      // ✅ 获取成员数量
      try {
        membersCount = await ctx.api.getChatMemberCount(chat.id)
      } catch {
        membersCount = null
      }

      // ✅ 检查机器人状态
      try {
        const bot = await ctx.api.getMe()
        const member = await ctx.api.getChatMember(chat.id, bot.id)
        botStatus = member.status
        isAdmin = ['administrator', 'creator'].includes(member.status)
      } catch {
        botStatus = 'unknown'
        isAdmin = false
      }
    } else {
      // 邀请链接类型（私有群）
      chatMeta = { title: '未知群组', type: 'private_group' }
    }
  } catch (err) {
    console.warn('⚠️ 无法访问该链接:', err)
    return ctx.reply('❌ 无法访问该链接，可能是私有群组或链接错误。')
  }

  // ✅ 归一化类型（supergroup → group）
  const rawType = chatMeta.type || (isInvite ? 'private_group' : 'unknown')
  const normalizedType = rawType === 'supergroup' ? 'group' : rawType

  // ✅ 写入数据库（自动收录集合）
  await AutoLinkModel.create({
    title: chatMeta.title || handle,
    url: link,
    type: normalizedType,
    chat_type_raw: chatMeta.type || null,
    description: description || chatMeta.description || '',
    language: 'unknown',
    members_count: membersCount,
    submitted_by: user.id,
    submitted_username: user.username,
    status: 'approved',
    bot_member_status: botStatus,
    is_bot_admin: isAdmin,
  })

  // ✅ 反馈消息
  const emoji = normalizedType === 'channel' ? '📢' : '👥'
  return ctx.reply(
    `${emoji} <b>${chatMeta.title || handle}</b>\n` +
      `🔗 <a href="${link}">${link}</a>\n` +
      `👤 成员数：${membersCount ?? '未知'}\n` +
      `🤖 机器人状态：${botStatus}${isAdmin ? '（管理员）' : ''}\n\n` +
      `✅ 已成功添加至自动收录列表！`,
    {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
    }
  )
})

export { composer as addAutoLinkFeature }
