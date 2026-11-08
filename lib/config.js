/**
 * Configuration surface of dsh-mistral-pro.
 *
 * Every user-editable field is volatile: the Loader keeps the reference and the
 * plugin re-reads it per operation, so editing accounts, models, usage or
 * advanced settings never restarts the plugin and never interrupts a stream.
 */
import z from '@deepseek-ai/schemastery'

/** Provider route this plugin owns in the `llm` service. */
export const PROVIDER_ID = 'mistral-pro'
/** Display name shown by model selectors and the settings page. */
export const DISPLAY_NAME = 'Mistral Pro'
/** OpenAI-compatible endpoint of Mistral's inference API. */
export const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1'
/** Default credential reference for the first account. */
export const DEFAULT_API_KEY_ENV = 'MISTRAL_API_KEY'
/** Admin site that exposes subscription allowances to a browser session. */
export const DEFAULT_ADMIN_BASE_URL = 'https://admin.mistral.ai'
/** Default credential reference for the admin session cookie. */
export const DEFAULT_ADMIN_COOKIE_ENV = 'MISTRAL_ADMIN_COOKIE'

const AccountSchema = z.object({
  name: z.string().description('Account label shown by the settings page.'),
  apiKeyEnv: z
    .string()
    .role('credential-ref')
    .default(DEFAULT_API_KEY_ENV)
    .description('Environment-variable name the API key is stored under.'),
  baseURL: z
    .string()
    .default('')
    .description('Optional per-account endpoint override; empty uses the default base URL.'),
  enabled: z.boolean().default(true).description('Disabled accounts are skipped by failover.'),
})

const ModelOverrideSchema = z.object({
  visible: z.boolean().default(true).description('Show this model in the model selector.'),
  contextWindow: z.number().min(1).description('Context window override in tokens.'),
  maxTokens: z.number().min(1).description('Maximum output tokens override.'),
  reasoningEffort: z.string().description('Default reasoning effort for this model.'),
})

const UsageSchema = z.object({
  display: z
    .union([z.const('auto'), z.const('always'), z.const('off')])
    .default('auto')
    .description('When the composer usage pill is visible.'),
  refreshSeconds: z.number().min(15).max(3600).default(60).description('Usage refresh interval.'),
  adminCookieEnv: z
    .string()
    .role('credential-ref')
    .default(DEFAULT_ADMIN_COOKIE_ENV)
    .description('Credential reference holding a Cookie header for admin.mistral.ai.'),
  adminBaseURL: z.string().default(DEFAULT_ADMIN_BASE_URL).description('Admin site origin.'),
  showCredits: z.boolean().default(true).description('Show the prepaid credit balance.'),
})

const AdvancedSchema = z.object({
  failover: z.boolean().default(true).description('Try the next account before any text is produced.'),
  cooldownSeconds: z.number().min(0).max(3600).default(300).description('How long a failed account is skipped.'),
  requestTimeoutMs: z.number().min(1000).default(600000).description('Whole-request deadline.'),
  streamIdleTimeoutMs: z.number().min(1000).default(300000).description('Maximum silence between stream chunks.'),
  modelsRefreshMinutes: z.number().min(1).max(1440).default(60).description('Live catalog refresh interval.'),
  maxTokensCap: z.number().min(1).default(65536).description('Default output cap when a model declares more.'),
  proxy: z.string().default('').description('HTTP/HTTPS/SOCKS5 proxy for inference and usage requests.'),
})

/** Live plugin configuration. */
export const Config = z.object({
  baseURL: z.string().default(DEFAULT_BASE_URL).description('OpenAI-compatible endpoint of the provider.').volatile(),
  accounts: z.array(AccountSchema).default([]).description('Ordered accounts; the first enabled account is primary.').volatile(),
  models: z.dict(ModelOverrideSchema).default({}).description('Per-model visibility and capacity overrides.').volatile(),
  usage: UsageSchema.default({}).description('Subscription usage display.').volatile(),
  advanced: AdvancedSchema.default({}).description('Transport, failover and catalog settings.').volatile(),
})

/** Read one live field, tolerating both plain and `.volatile()` projections. */
export function liveValue(config, key, fallback) {
  const raw = config?.[key]
  if (raw !== null && typeof raw === 'object' && typeof raw.get === 'function') {
    const value = raw.get()
    return value === undefined || value === null ? fallback : value
  }
  return raw === undefined || raw === null ? fallback : raw
}

/** Accept only an http(s) base URL without a query or fragment. */
export function assertBaseURL(raw, field = 'baseURL') {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${field} must be an absolute http(s) URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${field} must use http or https`)
  }
  if (url.search !== '' || url.hash !== '') {
    throw new Error(`${field} must not carry a query or fragment`)
  }
  return url.toString().replace(/\/+$/, '')
}

function normalizeAccount(raw, index, fallbackBaseURL) {
  const name = typeof raw?.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : `account-${index + 1}`
  const apiKeyEnv =
    typeof raw?.apiKeyEnv === 'string' && raw.apiKeyEnv.trim() !== '' ? raw.apiKeyEnv.trim() : DEFAULT_API_KEY_ENV
  const override = typeof raw?.baseURL === 'string' ? raw.baseURL.trim() : ''
  return {
    name,
    apiKeyEnv,
    baseURL: override === '' ? fallbackBaseURL : assertBaseURL(override, `accounts[${index}].baseURL`),
    enabled: raw?.enabled !== false,
  }
}

/**
 * Resolve the complete, validated configuration for one operation.
 * @param config - live or plain plugin configuration.
 * @returns detached configuration with defaults materialized.
 */
export function readConfig(config) {
  const baseURL = assertBaseURL(liveValue(config, 'baseURL', DEFAULT_BASE_URL))
  const rawAccounts = liveValue(config, 'accounts', [])
  const accounts = Array.isArray(rawAccounts) && rawAccounts.length > 0
    ? rawAccounts.map((account, index) => normalizeAccount(account, index, baseURL))
    : [{ name: 'default', apiKeyEnv: DEFAULT_API_KEY_ENV, baseURL, enabled: true }]

  const rawModels = liveValue(config, 'models', {})
  const models = {}
  if (rawModels !== null && typeof rawModels === 'object' && !Array.isArray(rawModels)) {
    for (const [id, value] of Object.entries(rawModels)) {
      if (id.trim() === '' || value === null || typeof value !== 'object') continue
      models[id.trim()] = {
        visible: value.visible !== false,
        contextWindow: Number.isFinite(value.contextWindow) && value.contextWindow > 0 ? Math.floor(value.contextWindow) : undefined,
        maxTokens: Number.isFinite(value.maxTokens) && value.maxTokens > 0 ? Math.floor(value.maxTokens) : undefined,
        reasoningEffort: typeof value.reasoningEffort === 'string' ? value.reasoningEffort : undefined,
      }
    }
  }

  const rawUsage = liveValue(config, 'usage', {})
  const usage = {
    display: ['auto', 'always', 'off'].includes(rawUsage?.display) ? rawUsage.display : 'auto',
    refreshSeconds: clampNumber(rawUsage?.refreshSeconds, 15, 3600, 60),
    adminCookieEnv:
      typeof rawUsage?.adminCookieEnv === 'string' && rawUsage.adminCookieEnv.trim() !== ''
        ? rawUsage.adminCookieEnv.trim()
        : DEFAULT_ADMIN_COOKIE_ENV,
    adminBaseURL: assertBaseURL(rawUsage?.adminBaseURL ?? DEFAULT_ADMIN_BASE_URL, 'usage.adminBaseURL'),
    showCredits: rawUsage?.showCredits !== false,
  }

  const rawAdvanced = liveValue(config, 'advanced', {})
  const advanced = {
    failover: rawAdvanced?.failover !== false,
    cooldownSeconds: clampNumber(rawAdvanced?.cooldownSeconds, 0, 3600, 300),
    requestTimeoutMs: clampNumber(rawAdvanced?.requestTimeoutMs, 1000, 2147483647, 600000),
    streamIdleTimeoutMs: clampNumber(rawAdvanced?.streamIdleTimeoutMs, 1000, 2147483647, 300000),
    modelsRefreshMinutes: clampNumber(rawAdvanced?.modelsRefreshMinutes, 1, 1440, 60),
    maxTokensCap: clampNumber(rawAdvanced?.maxTokensCap, 1, 2147483647, 65536),
    proxy: typeof rawAdvanced?.proxy === 'string' ? rawAdvanced.proxy.trim() : '',
  }

  return { baseURL, accounts, models, usage, advanced }
}

function clampNumber(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}
