import type { Context } from '#root/bot/context.js'
import type { Config } from '#root/config.js'
import type { Logger } from '#root/logger.js'
import type { BotConfig } from 'grammy'
import { adminFeature } from '#root/bot/features/admin.js'
import { languageFeature } from '#root/bot/features/language.js'
import { unhandledFeature } from '#root/bot/features/unhandled.js'
import { welcomeFeature } from '#root/bot/features/welcome.js'
import { errorHandler } from '#root/bot/handlers/error.js'
import { i18n, isMultipleLocales } from '#root/bot/i18n.js'
import { session } from '#root/bot/middlewares/session.js'
import { updateLogger } from '#root/bot/middlewares/update-logger.js'
import { autoChatAction } from '@grammyjs/auto-chat-action'
import { hydrate } from '@grammyjs/hydrate'
import { hydrateReply, parseMode } from '@grammyjs/parse-mode'
import { sequentialize } from '@grammyjs/runner'
import { MemorySessionStorage, Bot as TelegramBot } from 'grammy'
import { addFeature } from '#root/bot/features/add.js'
import { pushFeature } from '#root/bot/features/push.js'
import { userFeature } from '#root/bot/features/usersinfo.js'
import { connectDatabase } from "#root/database/mongodb.js";
import 'dotenv/config'
import { userpFeature } from '#root/bot/features/pushuser.js'
import { addLinkFeature } from '#root/bot/features/addlink.js'
import { showLinksFeature } from '#root/bot/features/links.js'
import { link } from 'fs'
import { AutoLinkFeature } from '#root/bot/features/autolinks.js'
import { addAutoLinkFeature } from '#root/bot/features/addautolink.js'
import { trcFeature } from '#root/bot/features/trc.js'
await connectDatabase(process.env.DB_URI!);

interface Dependencies {
  config: Config
  logger: Logger
}

function getSessionKey(ctx: Omit<Context, 'session'>) {
  return ctx.chat?.id.toString()
}

export function createBot(token: string, dependencies: Dependencies, botConfig?: BotConfig<Context>) {
  const {
    config,
    logger,
  } = dependencies

  const bot = new TelegramBot<Context>(token, botConfig)

  bot.use(async (ctx, next) => {
    ctx.config = config
    ctx.logger = logger.child({
      update_id: ctx.update.update_id,
    })

    await next()
  })

  const protectedBot = bot.errorBoundary(errorHandler)

  // Middlewares
  bot.api.config.use(parseMode('HTML'))

  if (config.isPollingMode)
    protectedBot.use(sequentialize(getSessionKey))
  if (config.isDebug)
    protectedBot.use(updateLogger())
  protectedBot.use(autoChatAction(bot.api))
  protectedBot.use(hydrateReply)
  protectedBot.use(hydrate())
  protectedBot.use(session({
    getSessionKey,
    storage: new MemorySessionStorage(),
  }))
  protectedBot.use(i18n)

  // Handlers
  protectedBot.use(welcomeFeature)
  protectedBot.use(adminFeature)
  protectedBot.use(addFeature)
  protectedBot.use(pushFeature)
  protectedBot.use(userpFeature) 
  protectedBot.use(userFeature)
  protectedBot.use(addLinkFeature)
  protectedBot.use(showLinksFeature)
  protectedBot.use(AutoLinkFeature)
  protectedBot.use(addAutoLinkFeature)
  protectedBot.use(trcFeature)
  // if (isMultipleLocales)
  //   protectedBot.use(languageFeature)

  // must be the last handler
  // protectedBot.use(unhandledFeature)

  return bot
}

export type Bot = ReturnType<typeof createBot>
