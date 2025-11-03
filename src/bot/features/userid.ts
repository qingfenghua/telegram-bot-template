import { Composer } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'

const composer = new Composer<Context>()
const feature = composer.chatType('private')

/**
 * 根据 Telegram ID 粗略推测注册年份
 */
function estimateRegisterDate(id: number): string {
  if (!id || id < 100000) return '未知'
  if (id < 100000000) return '~ 2014-2016'
  if (id < 200000000) return '~ 2016-2017'
  if (id < 500000000) return '~ 2018-2020'
  if (id < 800000000) return '~ 2021-2022'
  if (id < 1000000000) return '~ 2023-2024'
  return '~ 2024-2025'
}

feature.command('userid', logHandle('command-userid'), async (ctx) => {
  const args = ctx.message?.text?.split(' ').slice(1)
  const username = args?.[0]?.replace('@', '').trim()

  if (!username) {
    return ctx.reply(
      '⚠️ 用法：`/userid @用户名`\n\n例如：`/userid @telegram`',
      { parse_mode: 'Markdown' }
    )
  }

  try {
    // ✅ 获取目标信息
    const chat = await ctx.api.getChat(username)

    const id = chat.id
    const type = chat.type
    const title = chat.title || chat.first_name || chat.username || '未知'
    const estimatedDate = estimateRegisterDate(Math.abs(id))

    const text = [
      `所查对象：@${username}`,
      ``,
      `📛 名称：${title}`,
      `🆔 UID：<code>${id}</code> (${String(id).length} 位)`,
      `📅 注册时间：${estimatedDate}`,
      `🧭 类型：${type}`,
      ``,
      `检测时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    ].join('\n')

    await ctx.reply(text, {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
    })
  } catch (err: any) {
    console.error('❌ 获取用户信息失败:', err.response?.data || err.message)
    return ctx.reply('❌ 查询失败，可能用户名无效或用户隐私设置不允许访问。')
  }
})

export { composer as userIdFeature }
