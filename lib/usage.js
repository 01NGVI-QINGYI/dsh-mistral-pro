/**
 * Subscription usage for a Mistral account.
 *
 * Mistral exposes plan allowances on the admin site behind a browser session
 * (`ory_session_*` cookie), not behind the API key. The service therefore
 * accepts an optional Cookie header stored as a credential, asks the same
 * endpoints the admin console uses, and extracts every allowance it can
 * recognize instead of trusting one undocumented response shape.
 */
import { attributionHeaders } from '@deepseek-ai/dsh-llm'
import { resolveAccountKey, resolveAdminCookie } from './accounts.js'

const REQUEST_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 30000

/** Read one numeric field, accepting numeric strings. */
function num(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

/**
 * Walk an admin response and collect every object that looks like an allowance.
 * @param value - decoded JSON.
 * @returns recognized allowances in discovery order.
 */
export function collectAllowances(value) {
  const found = []
  const seen = new Set()
  const visit = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...path, String(index)]))
      return
    }
    if (node === null || typeof node !== 'object') return
    const used = num(node.used ?? node.usage ?? node.consumed ?? node.used_amount ?? node.usedAmount)
    const total = num(
      node.total ??
        node.limit ??
        node.included ??
        node.quota ??
        node.allowance ??
        node.total_amount ??
        node.totalAmount ??
        node.max,
    )
    const percent = num(node.percent ?? node.percentage ?? node.used_percent ?? node.usedPercent)
    if (percent !== undefined || (used !== undefined && total !== undefined && total > 0)) {
      const label = firstString(node.name, node.label, node.title, node.plan, node.kind, node.type) ?? 'Allowance'
      const computed = percent ?? (total !== undefined && total > 0 ? (used / total) * 100 : undefined)
      const signature = `${label}|${used}|${total}|${Math.round(computed ?? -1)}`
      if (!seen.has(signature)) {
        seen.add(signature)
        found.push({
          id: path.join('-') || 'allowance',
          label,
          used,
          total,
          percent: computed === undefined ? undefined : Math.max(0, Math.min(100, computed)),
          unit: firstString(node.unit, node.currency, node.currency_code) ?? 'USD',
          resetsAt: firstString(
            node.reset_at,
            node.resetAt,
            node.renewal_date,
            node.renewalDate,
            node.period_end,
            node.periodEnd,
            node.ends_at,
            node.endsAt,
            node.expires_at,
          ),
        })
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (child !== null && typeof child === 'object') visit(child, [...path, key])
    }
  }
  visit(value, [])
  return found
}

/** Find the first credit balance in an admin response. */
export function collectCredits(value) {
  let result
  const visit = (node) => {
    if (result !== undefined || node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const balance = num(node.balance ?? node.credits ?? node.available ?? node.remaining_credits ?? node.remainingCredits)
    if (balance !== undefined) {
      result = {
        balance,
        currency: firstString(node.currency, node.currency_code, node.unit) ?? 'USD',
      }
      return
    }
    for (const child of Object.values(node)) visit(child)
  }
  visit(value)
  return result
}

/** Find a month-to-date spend amount in a billing response. */
export function collectSpend(value) {
  let result
  const visit = (node) => {
    if (result !== undefined || node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const amount = num(node.total_spent ?? node.totalSpent ?? node.total_amount ?? node.totalAmount ?? node.amount_paid ?? node.amountPaid)
    if (amount !== undefined) {
      result = { amount, currency: firstString(node.currency, node.currency_code, node.unit) ?? 'USD' }
      return
    }
    for (const child of Object.values(node)) visit(child)
  }
  visit(value)
  return result
}

function csrfFromCookie(cookie) {
  const match = /(?:^|;\s*)csrftoken=([^;]+)/.exec(cookie)
  return match?.[1]
}

async function adminGet(url, cookie, signal) {
  const headers = {
    ...attributionHeaders(),
    accept: 'application/json',
    cookie,
  }
  const csrf = csrfFromCookie(cookie)
  if (csrf !== undefined) headers['x-csrftoken'] = csrf
  const response = await fetch(url, { headers, redirect: 'manual', signal })
  if (response.status === 0 || response.status === 302 || response.status === 303) {
    const location = response.headers.get('location') ?? ''
    if (location.includes('auth.mistral.ai') || location.includes('/login')) {
      throw new UsageError('SESSION_EXPIRED', 'The Mistral admin session expired; paste a fresh Cookie header.')
    }
  }
  if (!response.ok) {
    throw new UsageError('ADMIN_HTTP', `admin.mistral.ai answered ${response.status} for ${new URL(url).pathname}`)
  }
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new UsageError('ADMIN_SHAPE', `admin.mistral.ai returned non-JSON for ${new URL(url).pathname}`)
  }
}

export class UsageError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'UsageError'
    this.code = code
  }
}

/** Read one JSON endpoint with a bearer key. */
async function apiGet(url, apiKey, signal) {
  const response = await fetch(url, {
    headers: { ...attributionHeaders(), authorization: `Bearer ${apiKey}`, accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new UsageError('BILLING_HTTP', `api.mistral.ai answered ${response.status} for ${new URL(url).pathname}`)
  }
  return response.json()
}

/**
 * Read the plan and the monthly budgets from the API-key billing endpoints.
 * `/billing/subscription` names the plan; `/billing/budget` reports the Vibe
 * and API allowances as a percentage of their initial size.
 */
async function fetchApiBilling(ctx, account) {
  const apiKey = await resolveAccountKey(ctx, account)
  const base = account.baseURL.replace(/\/+$/, '')
  const [subscription, budget] = await Promise.all([
    apiGet(`${base}/billing/subscription`, apiKey),
    apiGet(`${base}/billing/budget`, apiKey),
  ])

  const plan = firstString(subscription?.plan_name, subscription?.plan, subscription?.planName)
  const windows = []
  const push = (entry, id, labelKey, label) => {
    if (entry === null || typeof entry !== 'object') return
    const percent = num(entry.usage_percentage ?? entry.usagePercentage)
    const total = num(entry.initial_budget ?? entry.initialBudget ?? entry.budget)
    if (percent === undefined && total === undefined) return
    const unit = firstString(entry.currency) ?? 'USD'
    const used = percent !== undefined && total !== undefined ? (percent / 100) * total : undefined
    windows.push({
      id,
      label,
      labelKey,
      used,
      total,
      percent: percent === undefined ? undefined : Math.max(0, Math.min(100, percent)),
      unit,
      resetsAt: firstString(entry.reset_at, entry.resetAt),
    })
  }
  push(budget?.vibe_budget, 'vibe', 'windowVibe', 'Vibe budget')
  push(budget?.api_budget, 'api', 'windowApi', 'API budget')
  if (windows.length === 0) push(budget, 'budget', 'windowBudget', 'Monthly budget')

  return {
    ok: true,
    account: account.name,
    fetchedAt: Date.now(),
    plan,
    currency: windows[0]?.unit ?? 'USD',
    windows,
    source: 'api-key',
  }
}

/**
 * Create the per-plugin usage service.
 * @param options.ctx - plugin context.
 * @param options.readConfig - current normalized configuration.
 */
export function createUsageService({ ctx, readConfig }) {
  const cache = new Map()

  async function fetchUsage(accountName, { force = false } = {}) {
    const config = readConfig()
    const account = config.accounts.find((entry) => entry.name === accountName) ?? config.accounts[0]
    if (account === undefined) {
      return { ok: false, error: { code: 'NO_ACCOUNT', message: 'No Mistral account is configured.' } }
    }
    const key = `${account.name}|${config.usage.adminCookieEnv}|${config.usage.adminBaseURL}`
    const cached = cache.get(key)
    if (!force && cached !== undefined && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

    // 1. API-key billing: plan, budget, credits, month-to-date spend.
    let apiError
    try {
      const value = await fetchApiBilling(ctx, account)
      cache.set(key, { at: Date.now(), value })
      return value
    } catch (error) {
      apiError = error
    }

    // 2. Admin cookie: Vibe-specific allowance windows.
    const cookie = await resolveAdminCookie(ctx, config.usage.adminCookieEnv)
    if (cookie === undefined) {
      const value = {
        ok: false,
        account: account.name,
        fetchedAt: Date.now(),
        error: {
          code: 'NO_USAGE',
          message:
            apiError instanceof Error
              ? `API-key billing failed (${apiError.message}); configure ${config.usage.adminCookieEnv} for the admin view.`
              : `Configure ${config.usage.adminCookieEnv} for the admin view.`,
        },
      }
      cache.set(key, { at: Date.now(), value })
      return value
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('usage timeout')), REQUEST_TIMEOUT_MS)
    const month = new Date()
    const usageURL = `${config.usage.adminBaseURL}/api/billing/v2/usage?month=${month.getUTCMonth() + 1}&year=${month.getUTCFullYear()}`
    const sources = {}
    const warnings = []
    let subscription
    let billing
    let credits
    try {
      const results = await Promise.allSettled([
        adminGet(`${config.usage.adminBaseURL}/subscription`, cookie, controller.signal),
        adminGet(usageURL, cookie, controller.signal),
        adminGet(`${config.usage.adminBaseURL}/api/billing/credits`, cookie, controller.signal),
      ])
      if (results[0].status === 'fulfilled') subscription = results[0].value
      else {
        sources.subscription = results[0].reason?.code ?? 'ERROR'
        warnings.push(results[0].reason?.message ?? 'subscription unavailable')
      }
      if (results[1].status === 'fulfilled') billing = results[1].value
      else {
        sources.usage = results[1].reason?.code ?? 'ERROR'
        warnings.push(results[1].reason?.message ?? 'billing usage unavailable')
      }
      if (results[2].status === 'fulfilled') credits = results[2].value
      else sources.credits = results[2].reason?.code ?? 'ERROR'
    } finally {
      clearTimeout(timer)
    }

    if (subscription === undefined && billing === undefined && credits === undefined) {
      const value = {
        ok: false,
        account: account.name,
        fetchedAt: Date.now(),
        error: { code: 'ADMIN_UNAVAILABLE', message: warnings[0] ?? 'Mistral admin usage is unavailable.' },
      }
      cache.set(key, { at: Date.now(), value })
      return value
    }

    const windows = []
    if (subscription !== undefined) windows.push(...collectAllowances(subscription))
    if (billing !== undefined) windows.push(...collectAllowances(billing))
    const value = {
      ok: true,
      account: account.name,
      fetchedAt: Date.now(),
      plan: firstString(subscription?.plan, subscription?.plan_name, subscription?.subscription?.plan),
      windows: dedupeWindows(windows),
      credits: config.usage.showCredits && credits !== undefined ? collectCredits(credits) : undefined,
      spend: billing !== undefined ? collectSpend(billing) : undefined,
      sources,
      warnings: warnings.length === 0 ? undefined : warnings,
    }
    cache.set(key, { at: Date.now(), value })
    return value
  }

  function invalidate() {
    cache.clear()
  }

  return { fetchUsage, invalidate }
}

function dedupeWindows(windows) {
  const seen = new Set()
  const out = []
  for (const window of windows) {
    const signature = `${window.label}|${window.used}|${window.total}|${window.percent}`
    if (seen.has(signature)) continue
    seen.add(signature)
    out.push(window)
  }
  return out
}
