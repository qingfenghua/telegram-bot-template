// src/bot/features/show-links.ts
import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer, InlineKeyboard } from 'grammy'
import { LinkModel } from '#root/database/models/LinkModel.js'
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// 每页展示数量
const PAGE_SIZE = 2

/**
 * 根据页码渲染页面内容和键盘
 */
async function renderLinksPage(page: number) {
  if (page < 1) page = 1

  const filter = { status: 'approved' }
  const total = await LinkModel.countDocuments(filter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (page > totalPages) page = totalPages

  const links = await LinkModel.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean()

  // 组装文本和键盘
  let text = `📖 <b>收录商家展示区</b>\n\n`
      + `1️⃣这些收录的群组/频道都是由一些用户提交的，我们经过筛选后，将其加入到我们的收录列表中，供大家参考。\n
2️⃣由于这些收录的链接没有上押金，由人工采集而来，在我们没有售后保证，请谨慎使用。\n
3️⃣如果想找可靠的商家可以点击主页的抵押商家进行挑选\n\n\n`
 // ✅ 顶部广告招商位
  text += `🎯 <b>广告招商中</b>联系管理员申请置顶推广！\n\n`

  // ✅ 链接展示部分
  if (!links || links.length === 0) {
    text += '暂无收录的链接。\n\n'
  } else {
    for (let i = 0; i < links.length; i++) {
      const it = links[i] as any
      const emoji = it.type === 'channel' ? '📢' : '👥'
      const title = it.title || '未命名'
      text += `${i + 1}. ${emoji} <a href="${it.url}">${title}</a>\n`
    }
    text += '\n' // 链接和页码之间空一行
  }

  // ✅ 页码信息放在底部
  text += `第 ${page}/${totalPages} 页，共 ${total} 条`

  // ✅ 翻页按钮区（显示在文本下方）
  const keyboard = new InlineKeyboard()

  keyboard.text('🏠','home')

  // 首页按钮
  if (page > 1) keyboard.text('⏮️', 'links_page_1')

  // 上一页
  if (page > 1) keyboard.text('⬅️', `links_page_${page - 1}`)

  // 下一页
  if (page < totalPages) keyboard.text('➡️', `links_page_${page + 1}`)

  return { text, keyboard, page, totalPages, total }
}



/**
 * 命令：/links 或 /showlinks 显示第 1 页
 */
feature.command(['links'], logHandle('command-links'), async (ctx) => {
  try {
    const { text, keyboard } = await renderLinksPage(1)
    await ctx.reply(text, {
        // @ts-ignore
      disable_web_page_preview: true,
      reply_markup: keyboard,
    })
  } catch (err) {
    console.error('展示链接失败', err)
    await ctx.reply('❌ 展示链接时出错，请稍后再试。')
  }
})

/**
 * 回调处理分页按钮
 */
composer.callbackQuery(/^links_page_(\d+)$/, async (ctx) => {
  try {
    const page = Number(ctx.callbackQuery.data!.split('_').pop() || '1')
    const { text, keyboard } = await renderLinksPage(page)

    // 尝试编辑消息文本（优先）
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        // @ts-ignore
        disable_web_page_preview: true, // ✅ 这里确保翻页也不显示预览
        reply_markup: keyboard,
      })
      await ctx.answerCallbackQuery()
    } catch (e) {
      // 如果编辑失败（比如消息不是 bot 发送的），就发送新消息
      await ctx.reply(text, {
        parse_mode: 'HTML',
        // @ts-ignore
        disable_web_page_preview: true, // ✅ 这里也加上
        reply_markup: keyboard,
      })
      await ctx.answerCallbackQuery()
    }
  } catch (err) {
    console.error('分页处理失败', err)
    await ctx.answerCallbackQuery({ text: '处理分页失败' })
  }
})


export { composer as showLinksFeature, renderLinksPage }
