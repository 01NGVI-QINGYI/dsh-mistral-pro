/**
 * dsh-mistral-pro — a Mistral subscription provider for DeepSeek Harness.
 *
 * The Host half registers one `llm` route backed by Mistral's OpenAI-compatible
 * chat completions API, keeps a live model catalog, resolves keys through the
 * credential seam, fails over between accounts before any output is produced,
 * and serves the usage/settings data the browser half reads.
 */
import { attributionHeaders } from '@deepseek-ai/dsh-llm'
import { Config, DISPLAY_NAME, PROVIDER_ID, readConfig } from './lib/config.js'
import { resolveCatalog, isVisible } from './lib/catalog.js'
import { AccountPool, resolveAccountKey } from './lib/accounts.js'
import { MistralProAdapter } from './lib/adapter.js'
import { createUsageService } from './lib/usage.js'

export { Config }
export const name = 'dsh-mistral-pro'
export const inject = ['llm']

const ROUTE_PREFIX = '/plugins/dsh-mistral-pro'
const LOG_TAG = '[dsh-mistral-pro]'

/** JSON response helper shared by every route. */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Register the provider, catalog, usage service and browser routes.
 * @param ctx - plugin context.
 * @param config - live plugin configuration.
 */
export function apply(ctx, config) {
  const read = () => readConfig(config)
  const pool = new AccountPool()
  const discovered = { ids: [], models: [] }
  const adapter = new MistralProAdapter({ ctx, readConfig: read, pool, discovered })
  const usage = createUsageService({ ctx, readConfig: read })

  const settingsNs = ctx.fiber?.entry?.options?.id ?? name

  ctx.llm.registerConfigurableProviders([
    {
      provider: PROVIDER_ID,
      displayName: DISPLAY_NAME,
      settingsNs,
      settingsPath: [],
    },
  ])

  ctx.llm.registerAdapter([PROVIDER_ID], adapter)

  ctx.llm.registerModelDiscovery(settingsNs, async (request) => {
    const baseURL = typeof request.baseURL === 'string' && request.baseURL !== '' ? request.baseURL : read().baseURL
    const apiKey = typeof request.apiKey === 'string' ? request.apiKey : undefined
    if (apiKey === undefined) return []
    const response = await fetch(`${baseURL.replace(/\/+$/, '')}/models`, {
      headers: { ...attributionHeaders(), authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return []
    const payload = await response.json()
    const entries = Array.isArray(payload?.data) ? payload.data : []
    return entries
      .filter((entry) => typeof entry?.id === 'string')
      .map((entry) => ({
        id: entry.id,
        name: typeof entry.name === 'string' ? entry.name : entry.id,
      }))
  })

  // The plugin ships its own settings page; the generic schema form would show
  // raw account arrays instead of the account cards.
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  /** Refresh the live catalog from the first usable account. */
  const refreshCatalog = async () => {
    const current = read()
    const account = pool.attemptOrder(current)[0] ?? current.accounts[0]
    if (account === undefined) return
    let apiKey
    try {
      apiKey = await resolveAccountKey(ctx, account)
    } catch {
      return
    }
    try {
      const response = await fetch(`${account.baseURL}/models`, {
        headers: { ...attributionHeaders(), authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) return
      const payload = await response.json()
      const models = (Array.isArray(payload?.data) ? payload.data : [])
        .filter((entry) => entry?.capabilities?.completion_chat === true)
        .map((entry) => ({
          id: entry.id,
          name: typeof entry.name === 'string' && entry.name !== '' ? entry.name : entry.id,
          aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
          contextWindow: Number.isFinite(entry.max_context_length) ? entry.max_context_length : undefined,
          vision: entry.capabilities?.vision === true,
          reasoning: entry.capabilities?.reasoning === true,
        }))
        .filter((entry) => typeof entry.id === 'string' && entry.id !== '')
      if (models.length === 0) return
      const changed = JSON.stringify(models) !== JSON.stringify(discovered.models)
      if (changed) {
        discovered.models = models
        discovered.ids = models.map((model) => model.id)
        ctx.emit('llm/models-updated', PROVIDER_ID)
      }
    } catch (error) {
      ctx.logger?.warn?.(`${LOG_TAG} model listing failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  ctx.effect(() => {
    const minutes = read().advanced.modelsRefreshMinutes
    const timer = setInterval(() => void refreshCatalog(), minutes * 60000)
    // Never keep a short-lived host (or a test process) alive for a catalog poll.
    timer.unref?.()
    void refreshCatalog()
    return () => clearInterval(timer)
  })

  ctx.on('loader/volatile-update', () => {
    usage.invalidate()
    void refreshCatalog()
  })

  ctx.inject(['webServer'], (child) => {
    const route = (path, handler) =>
      child.effect(() =>
        child.webServer.register({
          kind: 'prefix',
          path: `${ROUTE_PREFIX}${path}`,
          resource: handler,
        }),
      )

    /** Account facts safe for the browser: refs and presence, never key values. */
    const accountFacts = async (current) => {
      const credentials = ctx.get('credentials')
      const facts = []
      for (const account of current.accounts) {
        let configured = false
        try {
          if (credentials !== undefined) {
            const info = await credentials.describe(account.apiKeyEnv)
            configured = info.configured
          } else {
            configured = (process.env[account.apiKeyEnv] ?? '') !== ''
          }
        } catch {
          configured = false
        }
        facts.push({
          name: account.name,
          apiKeyEnv: account.apiKeyEnv,
          baseURL: account.baseURL,
          enabled: account.enabled,
          configured,
          coolingUntil: pool.coolingUntil(account.name) ?? null,
          primary: pool.promoted === account.name,
        })
      }
      return facts
    }

    route('/health', async () => {
      const current = read()
      const clientModules = ctx.get('clientModules')
      return json({
        ok: true,
        provider: PROVIDER_ID,
        displayName: DISPLAY_NAME,
        settingsNs,
        accounts: await accountFacts(current),
        models: resolveCatalog(current, discovered.models).length,
        discovered: discovered.ids.length,
        providers: ctx.llm.listProviders().map((provider) => provider.id),
        clientPath: clientModules?.clientPath?.(name) ?? null,
      })
    })

    route('/settings', async () => {
      const settings = ctx.get('settings')
      if (settings === undefined) return json({ ok: false, error: 'settings service unavailable' })
      const described = settings.describe({ redactSecrets: true })
      const view = described.find((entry) => entry.ns === settingsNs)
      return json({
        ok: view !== undefined,
        ns: settingsNs,
        revision: view?.revision ?? null,
        value: view?.value ?? null,
        schemaKeys: view?.schema === undefined ? null : Object.keys(view.schema ?? {}),
      })
    })

    route('/refresh', async () => {
      await refreshCatalog()
      return json({ ok: true, discovered: discovered.ids.length })
    })

    route('/client', async () => {
      const clientModules = ctx.get('clientModules')
      const graph = clientModules?.graph?.()
      if (graph === undefined) return json({ ok: false, error: 'client modules unavailable' })
      return json({
        ok: true,
        clientPath: clientModules.clientPath?.(name) ?? null,
        batches: (graph.batches ?? []).map((batch) => ({
          phase: batch.phase,
          url: batch.url,
          modules: (batch.modules ?? []).map((module) => module.id ?? module.name ?? String(module)),
        })),
      })
    })

    route('/models', async () => {
      const current = read()
      const models = resolveCatalog(current, discovered.models).map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        visible: isVisible(model, current),
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        input: model.input,
        reasoningEfforts: model.reasoning.map((effort) => effort.id),
        defaultReasoning: model.defaultReasoning,
        deprecated: model.deprecated === true,
      }))
      return json({ ok: true, models })
    })

    route('/usage', async (request) => {
      const url = new URL(request.url)
      const account = url.searchParams.get('account') ?? undefined
      const force = url.searchParams.get('force') === '1'
      try {
        return json(await usage.fetchUsage(account, { force }))
      } catch (error) {
        return json({
          ok: false,
          fetchedAt: Date.now(),
          error: { code: 'USAGE_FAILED', message: error instanceof Error ? error.message : String(error) },
        })
      }
    })

    route('/test', async (request) => {
      const url = new URL(request.url)
      const current = read()
      const name = url.searchParams.get('account') ?? current.accounts[0]?.name
      const account = current.accounts.find((entry) => entry.name === name)
      if (account === undefined) return json({ ok: false, error: { code: 'NO_ACCOUNT', message: 'Unknown account.' } })
      try {
        const apiKey = await resolveAccountKey(ctx, account)
        const response = await fetch(`${account.baseURL}/models`, {
          headers: { ...attributionHeaders(), authorization: `Bearer ${apiKey}`, accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          return json({ ok: false, error: { code: 'PROVIDER_HTTP', message: `Provider answered ${response.status}.` } })
        }
        const payload = await response.json()
        const count = Array.isArray(payload?.data) ? payload.data.length : 0
        return json({ ok: true, count })
      } catch (error) {
        return json({
          ok: false,
          error: {
            code: error?.code ?? 'TEST_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    route('/meta', async () => {
      const current = read()
      return json({
        ok: true,
        provider: PROVIDER_ID,
        settingsNs,
        baseURL: current.baseURL,
        usage: {
          display: current.usage.display,
          refreshSeconds: current.usage.refreshSeconds,
          adminCookieEnv: current.usage.adminCookieEnv,
          showCredits: current.usage.showCredits,
        },
        advanced: current.advanced,
        accounts: await accountFacts(current),
      })
    })
  })

  ctx.logger?.info?.(`${LOG_TAG} registered provider "${PROVIDER_ID}"`)
}

