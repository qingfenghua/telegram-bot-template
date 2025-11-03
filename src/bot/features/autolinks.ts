import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer, InlineKeyboard } from 'grammy'
import { AutoLinkModel } from '#root/database/models/AutoLinkModel.js'
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// 每页展示数量
const PAGE_SIZE = 2

/**
 * 渲染自动收录商家展示页
 */
async function renderAutoLinksPage(page: number) {
  if (page < 1) page = 1

  const filter = { status: 'approved' }
  const total = await AutoLinkModel.countDocuments(filter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (page > totalPages) page = totalPages

  const links = await AutoLinkModel.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean()

  // ===== 文本部分 =====
  let text =
    `⭐️ <b>抵押商家展示区</b>\n\n` +
    `1️⃣ 这些收录的群组/频道是在我们平台抵押过的\n\n` +
    `2️⃣ 可以在我们官方频道和群组查看这些群组的抵押信息。\n\n` +
    `3️⃣ 如果在交易的过程中遇到问题可以联系我们客服，如果反应的情况属实，我们将从商家的押金中退回相应的金额。\n\n` +
    `4️⃣ 具体的规则会放在官方频道和群组公告中，请仔细查看。\n\n`

  // ✅ 顶部广告招商位
  text += `🎯 <b>广告招商中</b> | 联系管理员申请置顶推广！\n\n`

  // ✅ 链接展示
  if (!links || links.length === 0) {
    text += '暂无自动收录的商家链接。\n\n'
  } else {
    for (let i = 0; i < links.length; i++) {
      const it = links[i] as any
      const emoji = it.type === 'channel' ? '📢' : '👥'
      const title = it.title || '未命名'
      text += `${i + 1}. ${emoji} <a href="${it.url}">${title}</a>\n`
    }
    text += '\n'
  }

  // ✅ 页码信息放最底部
  text += `第 ${page}/${totalPages} 页，共 ${total} 条`

  // ===== 翻页按钮区 =====
  const keyboard = new InlineKeyboard()

  keyboard.text('🏠', 'home')

  // 首页按钮
  if (page > 1) keyboard.text('⏮️', 'autolinks_page_1')

  // 上一页按钮
  if (page > 1) keyboard.text('⬅️', `autolinks_page_${page - 1}`)

  // 下一页按钮
  if (page < totalPages) keyboard.text('➡️', `autolinks_page_${page + 1}`)

  return { text, keyboard, page, totalPages, total }
}

/**
 * 命令：/autolinks
 */
feature.command(['autolinks'], logHandle('command-autolinks'), async (ctx) => {
  try {
    const { text, keyboard } = await renderAutoLinksPage(1)
    await ctx.reply(text, {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
      reply_markup: keyboard,
    })
  } catch (err) {
    console.error('展示自动收录链接失败', err)
    await ctx.reply('❌ 展示自动收录链接时出错，请稍后再试。')
  }
})

/**
 * 回调处理分页按钮（独立命名空间 autolinks_page_X）
 */
composer.callbackQuery(/^autolinks_page_(\d+)$/, async (ctx) => {
  try {
    const page = Number(ctx.callbackQuery.data!.split('_').pop() || '1')
    const { text, keyboard } = await renderAutoLinksPage(page)

    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        //@ts-ignore
        disable_web_page_preview: true,
        reply_markup: keyboard,
      })
      await ctx.answerCallbackQuery()
    } catch {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        //@ts-ignore
        disable_web_page_preview: true,
        reply_markup: keyboard,
      })
      await ctx.answerCallbackQuery()
    }
  } catch (err) {
    console.error('自动收录分页处理失败', err)
    await ctx.answerCallbackQuery({ text: '分页处理失败' })
  }
})

export { composer as AutoLinkFeature, renderAutoLinksPage }
