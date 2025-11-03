import type { Context } from '#root/bot/context.js'
import { Composer } from 'grammy'
import { UserModel } from '#root/database/models/user.js' // ✅ 统一导入 UserModel
import { isAdmin } from '#root/bot/filters/is-admin.js'

const composer = new Composer<Context>()
const feature = composer
  .filter(isAdmin)

// ⏳ 内存限流（每用户 5 秒）
const userCooldown: Record<number, number> = {}
const COOLDOWN = 5000 // ms

// 📈 每次用户发送消息都更新 lastActive 和 messagesToday
feature.on('message', async (ctx, next) => {
  const user_id = ctx.from?.id
  if (!user_id) return

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD

  const user = await UserModel.findOne({ user_id })

  if (!user) {
    // 新用户
    await UserModel.create({
      user_id,
      username: ctx.from?.username,
      first_name: ctx.from?.first_name,
      language: ctx.from?.language_code || 'zh',
      lastActive: now,
      messagesToday: 1,
    })
  } else {
    // 老用户：判断是否是新的一天
    const lastActiveStr = user.lastActive.toISOString().slice(0, 10)
    if (lastActiveStr !== todayStr) {
      user.messagesToday = 1
    } else {
      user.messagesToday += 1
    }
    user.lastActive = now
    await user.save()
  }

  await next()
})

// 🚀 /user 命令：查看统计（所有用户可用）
feature.command('user', async (ctx) => {
  const user_id = ctx.from?.id
  if (!user_id) return

  // ⏳ 限制调用频率
  const last = userCooldown[user_id] || 0
  if (Date.now() - last < COOLDOWN) {
    return ctx.reply(
      `⏳ 操作太频繁，请 ${(COOLDOWN - (Date.now() - last)) / 1000} 秒后再试`
    )
  }
  userCooldown[user_id] = Date.now()

  // 📊 统计数据
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const totalUsers = await UserModel.countDocuments()
  const todayActiveUsers = await UserModel.countDocuments({
    lastActive: { $gte: startOfDay },
  })
  const todayMessagesAggregate = await UserModel.aggregate([
    { $match: { lastActive: { $gte: startOfDay } } },
    { $group: { _id: null, total: { $sum: '$messagesToday' } } },
  ])
  const todayMessages = todayMessagesAggregate[0]?.total || 0

  await ctx.reply(
    `📊 用户统计：
👥 总用户数：${totalUsers}
🔥 今日活跃用户：${todayActiveUsers}
💬 今日消息总数：${todayMessages}`
  )
})

export { composer as userFeature }
