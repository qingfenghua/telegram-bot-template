import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Composer, InlineKeyboard } from 'grammy'
import { UserModel } from '#root/database/models/user.js' // ✅ 统一使用定义好的模型
import { renderLinksPage } from '#root/bot/features/links.js' // ✅ 引入渲染函数
import { renderAutoLinksPage } from '#root/bot/features/autolinks.js' // ✅ 引入渲染函数

const composer = new Composer<Context>()
const feature = composer

// 🚀 /start 命令
feature.command('start', logHandle('command-start'), async (ctx) => {
  const user = ctx.from
  if (!user) return

  try {
    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const existingUser = await UserModel.findOne({ user_id: user.id })

    if (!existingUser) {
      // 🆕 新用户
      await UserModel.create({
        user_id: user.id,
        username: user.username,
        first_name: user.first_name,
        language: user.language_code || 'zh',
        lastActive: new Date(),
        messagesToday: 1,
      })
    } else {
      // 👤 老用户
      const lastActiveStr = existingUser.lastActive?.toISOString().slice(0, 10)
      const newMessagesToday =
        lastActiveStr === todayStr
          ? (existingUser.messagesToday || 0) + 1
          : 1

      await UserModel.updateOne(
        { user_id: user.id },
        {
          $set: {
            username: user.username,
            first_name: user.first_name,
            language: user.language_code || 'zh',
            lastActive: new Date(),
            messagesToday: newMessagesToday,
          },
        }
      )
    }
  } catch (err) {
    console.error('❌ 用户保存失败:', err)
  }

  // 🧭 自定义菜单
  const keyboard = new InlineKeyboard()
    .text('📥 收录商家：频道/群组', 'Category')
    .text('⭐️ 抵押商家：频道/群组', 'LinkShow')
    .row()
    .url('🌐 官方频道', 'https://t.me/EncryptionARK_Channel')
    .url('💬 服务主群', 'https://t.me/ARK_Certification')
    .row()
    .text('🔗 提交收录', 'Link')
    .text('💴 提交抵押', 'Mortgage')
    .row()
    .text('⁉️ 帮助', 'Tutorial')
    .text('📝 加入我们', 'Feedback')
    .url('👨🏻‍💻 人工客服', 'https://t.me/Ark_Amy')

  await ctx.reply(
    '⛵️这是 <b>ARK-加密方舟🔐</b> 机器人\n提供一系列去中心化交易服务及 Telegram 产品导航。\n\n👉 <a href="https://t.me/setlanguage/zh-hans-beta">点击安装简体中文</a>',
    {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
      reply_markup: keyboard,
    }
  )
})

// 🧭 按钮回调 - 收录链接
feature.callbackQuery('Link', async (ctx) => {
  const newKeyboard = new InlineKeyboard().text('🏠', 'home')
  await ctx.editMessageText(`⛵️ 请按照这个格式提交收录链接：<b>/add https://example.com</b>\n
     1️⃣ 提交的链接会交给社区成员审核，审核通过后会在收录区展示。
     2️⃣ 请确保提交的链接是可靠的，且符合 ARK 相关的产品或服务。
     3️⃣ 请勿提交重复或无效的链接。`, {
    reply_markup: newKeyboard,
  })
})

// 🧭 按钮回调 - 帮助
feature.callbackQuery('Tutorial', async (ctx) => {
  const newKeyboard = new InlineKeyboard().text('🏠', 'home')
  await ctx.editMessageText(`⛵️ <b>使用帮助</b>\n
<code>/start</code> 以启动机器人。
<code>/add</code> 提交收录链接。
后续会陆续添加更多功能。`, {
    reply_markup: newKeyboard,
  })
})

// 🧭 按钮回调 - 反馈建议
feature.callbackQuery('Feedback', async (ctx) => {
  const newKeyboard = new InlineKeyboard().text('🏠', 'home')
  await ctx.editMessageText(`🚨 加密圈太乱？被骗太多？
那你一定要来 Ark 社区 —— 区块链认证与防骗平台！

我们正在做的事很简单：
✅ 给项目方上“认证标识”
✅ 给用户提供“风险预警”
✅ 让骗子无处遁形，让交易更安心。

👥 我们正在招募：

区块链爱好者

安全审查志愿者

内容推广官

一起守护链圈的安全与信任。
🌐 加入我们 👉 [https://t.me/ARK_Certification]`, {
    reply_markup: newKeyboard,
    //@ts-ignore
    disable_web_page_preview: true,
  })
})

// 🧭 按钮回调 - 提交抵押
feature.callbackQuery('Mortgage', async (ctx) => {
  const newKeyboard = new InlineKeyboard().text('🏠', 'home')
  await ctx.editMessageText(`⛵️ 请按照这个格式提交抵押链接：<b>/add https://example.com</b>\n
1️⃣ 想要抵押的商家先联系管理员 @joojoowin 加入抵押区。
2️⃣ 将押金发送到指定钱包地址后，我们会将商家的链接上架到抵押区。
3️⃣ 抵押期限3个月，期满后返回商家的钱包地址，商家可以决定是否继续抵押，不抵押后链接会下架。
     具体细节可在这里查看：https://t.me/EncryptionARK_Channel/11 `, {
    reply_markup: newKeyboard,
    //@ts-ignore
    disable_web_page_preview: true,
  })
})

// 🧭 按钮回调 - 收录商家展示链接
feature.callbackQuery('Category', async (ctx) => {
  try {
    const { text, keyboard } = await renderLinksPage(1)

    await ctx.editMessageText( text, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
    })
  } catch (err) {
    console.error('展示链接失败', err)
    await ctx.answerCallbackQuery({ text: '❌ 无法展示链接，请稍后重试。' })
  }
})

// 🧭 按钮回调 - 抵押商家展示链接
feature.callbackQuery('LinkShow', async (ctx) => {
  try {
    const { text, keyboard } = await renderAutoLinksPage(1)

    await ctx.editMessageText( text, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
    })
  } catch (err) {
    console.error('展示链接失败', err)
    await ctx.answerCallbackQuery({ text: '❌ 无法展示链接，请稍后重试。' })
  }
})

// 🧭 按钮回调 - 返回主页
feature.callbackQuery('home', async (ctx) => {
  const keyboard = new InlineKeyboard()
     .text('📥 收录商家：频道/群组', 'Category')
    .text('⭐️ 抵押商家：频道/群组', 'LinkShow')
    .row()
    .url('🌐 官方频道', 'https://t.me/EncryptionARK_Channel')
    .url('💬 服务主群', 'https://t.me/ARK_Certification')
    .row()
    .text('🔗 提交收录', 'Link')
    .text('💴 提交抵押', 'Mortgage')
    .row()
    .text('⁉️ 帮助', 'Tutorial')
    .text('📝 加入我们', 'Feedback')
    .url('👨🏻‍💻 人工客服', 'https://t.me/Ark_Amy')

  await ctx.reply(
    `⛵️这是 <b>ARK-加密方舟🔐</b> 机器人\n提供一系列去中心化交易服务及 Telegram 产品导航。\n\n
    👉 <a href="https://t.me/setlanguage/zh-hans-beta">点击安装简体中文</a>`,
    {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
      reply_markup: keyboard,
    }
  )
})

export { composer as welcomeFeature }
