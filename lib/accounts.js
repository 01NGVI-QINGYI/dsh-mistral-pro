/**
 * Account ordering, credential resolution and failover cooldowns.
 *
 * The configuration order is the primary order. A successful fallback is
 * promoted in memory for the rest of the process lifetime, so a session that
 * lost its primary account keeps using the account that actually works without
 * rewriting the user's profile. Cooldowns are memory-only for the same reason.
 */
import { assertUsableApiKey, LlmError } from '@deepseek-ai/dsh-llm'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'

const PKG = 'dsh-mistral-pro'

/**
 * Resolve one account's API key through the credential seam.
 * @param ctx - plugin context (may or may not mount `credentials`).
 * @param account - normalized account.
 * @returns the usable key.
 * @throws LlmError MISSING_CREDENTIAL or INVALID_CREDENTIAL.
 */
export async function resolveAccountKey(ctx, account) {
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    const hit = await credentials.resolve(account.apiKeyEnv)
    if (hit !== undefined && hit.value.length > 0) {
      return assertUsableApiKey(hit.value, PKG, account.apiKeyEnv)
    }
  } else {
    const ambient = launchEnvironmentOf(ctx).get(account.apiKeyEnv)
    if (ambient !== undefined && ambient.value.length > 0) {
      return assertUsableApiKey(ambient.value, PKG, account.apiKeyEnv)
    }
  }
  throw new LlmError(
    `${PKG}: no API key for account "${account.name}"; store ${account.apiKeyEnv} through the credentials service (the Mistral Pro settings page writes it), or export it in the launching environment`,
    'MISSING_CREDENTIAL',
  )
}

/** Read the admin cookie used by the usage service; undefined when absent. */
export async function resolveAdminCookie(ctx, ref) {
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    const hit = await credentials.resolve(ref)
    if (hit !== undefined && hit.value.trim() !== '') return hit.value.trim()
    return undefined
  }
  const ambient = launchEnvironmentOf(ctx).get(ref)
  if (ambient !== undefined && ambient.value.trim() !== '') return ambient.value.trim()
  return undefined
}

/** Memory-only account health. */
export class AccountPool {
  constructor() {
    this.cooldowns = new Map()
    this.promoted = undefined
  }

  /** Try order: promoted account first, then configuration order. */
  ordered(config) {
    const enabled = config.accounts.filter((account) => account.enabled)
    if (this.promoted === undefined) return enabled
    const index = enabled.findIndex((account) => account.name === this.promoted)
    if (index <= 0) return enabled
    return [enabled[index], ...enabled.slice(0, index), ...enabled.slice(index + 1)]
  }

  /** Accounts to attempt for one request, cooling ones moved to the back. */
  attemptOrder(config) {
    const ordered = this.ordered(config)
    const now = Date.now()
    const ready = ordered.filter((account) => (this.cooldowns.get(account.name) ?? 0) <= now)
    const cooling = ordered.filter((account) => (this.cooldowns.get(account.name) ?? 0) > now)
    return [...ready, ...cooling]
  }

  coolingUntil(name) {
    const until = this.cooldowns.get(name)
    return until !== undefined && until > Date.now() ? until : undefined
  }

  markFailure(name, cooldownSeconds) {
    if (cooldownSeconds <= 0) return
    this.cooldowns.set(name, Date.now() + cooldownSeconds * 1000)
  }

  markSuccess(name) {
    this.cooldowns.delete(name)
    this.promoted = name
  }

  describe(config) {
    return this.ordered(config).map((account) => ({
      name: account.name,
      apiKeyEnv: account.apiKeyEnv,
      baseURL: account.baseURL,
      enabled: account.enabled,
      coolingUntil: this.coolingUntil(account.name) ?? null,
      primary: this.promoted === account.name,
    }))
  }
}
