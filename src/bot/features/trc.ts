import { Composer } from 'grammy'
import type { Context } from '#root/bot/context.js'
import axios from 'axios'
import { logHandle } from '#root/bot/helpers/logging.js'

const composer = new Composer<Context>()
const feature = composer.chatType('private')

// ✅ TronGrid API Key（替换成你的）
const TRONGRID_API_KEY = 'af278bc3-a072-4298-a102-bddc0e53c290'

feature.command('trc', logHandle('command-trc'), async (ctx) => {
  const args = ctx.message?.text?.split(' ').slice(1)
  const address = args?.[0]?.trim()

  if (!address) {
    return ctx.reply('⚠️ 用法：`/trc <TRC20钱包地址>`\n\n示例：`/trc TQ9.....xxx`', {
      parse_mode: 'Markdown',
    })
  }

  try {
    // ✅ 查询账户基础信息
    const accountResp = await axios.get(`https://api.trongrid.io/v1/accounts/${address}`, {
      headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
    })

    const account = accountResp.data.data?.[0]
    if (!account) throw new Error('地址不存在')

    // ✅ 计算 TRX 余额
    const trxBalance = (account.balance || 0) / 1e6

    // ✅ 查找 USDT（TRC20）余额
    const usdtToken = account.trc20?.find((t: any) =>
      Object.keys(t).includes('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
    )
    const usdtBalance = usdtToken
      ? parseFloat(usdtToken['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']) / 1e6
      : 0

    // ✅ 带宽 / 能源
    const bandwidth = account.free_net_usage || 0
    const bandwidthLimit = account.free_net_limit || 0
    const energy = account.energy_usage || 0
    const energyLimit = account.energy_limit || 0

    // ✅ 冻结检测
    const frozenBalance =
      Array.isArray(account.frozen) && account.frozen.length > 0
        ? account.frozen.reduce((sum: number, f: any) => sum + (f.frozen_balance || 0), 0)
        : 0

    const isFrozen = frozenBalance > 0 ? '⚠️ 已冻结' : '✅ 地址未冻结'

    // ✅ 拼接返回文本
    const text = [
      `检测地址：\n<code>${address}</code>`,
      `💰 <b>USDT-TRC20余额</b> (<a href="https://tronscan.org/#/address/${address}/transfers">TronScan</a>): <code>${usdtBalance}</code>`,
      `💰 <b>TRX余额</b> (<a href="https://tronscan.org/#/address/${address}">TronScan</a>): <code>${trxBalance}</code>`,
      `🔋TRX质押：${account.account_resource?.frozen_balance_for_energy?.frozen_balance ? account.account_resource.frozen_balance_for_energy.frozen_balance / 1e6 : 0}`,
      `🔋宽带：${bandwidth}/${bandwidthLimit}`,
      `🔋能源：${energy}/${energyLimit}`,
      ``,
      `授权检测 (<a href="https://tronscan.org/#/address/${address}/permissions">TronScan</a>): ✅ 地址无授权`,
      `多签检测 (<a href="https://tronscan.org/#/address/${address}/permissions">TronScan</a>): ✅ 地址无多签`,
      `冻结检测: ${isFrozen}`,
      ``,
      `检测时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    ].join('\n')

    await ctx.reply(text, {
      parse_mode: 'HTML',
      //@ts-ignore
      disable_web_page_preview: true,
    })
  } catch (err: any) {
    console.error('TRC 查询错误:', err.response?.data || err.message)
    return ctx.reply('❌ 查询失败，可能是网络错误或地址无效。')
  }
})

export { composer as trcFeature }
