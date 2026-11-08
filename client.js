/**
 * dsh-mistral-pro browser half.
 *
 * Two contributions: a settings page that manages subscription accounts,
 * models, usage display and transport settings, and a composer usage pill that
 * reads the Host's usage route. All data crosses the same-origin plugin route
 * or the generated settings/credentials Remote namespaces; the API key never
 * reaches the browser.
 */
window.__ModuleLoader__.load({
  id: 'dsh-mistral-pro',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback } = React

    const NS = 'mistral-pro'
    const API = '/plugins/dsh-mistral-pro'

    const EN = {
      sectionTitle: 'Mistral Pro',
      sectionSubtitle: 'Mistral subscription accounts, models and usage',
      accountsTitle: 'Accounts',
      accountsHint:
        'Requests try accounts from top to bottom. A key that fails authentication, rate limiting or quota is skipped before any text is produced.',
      accountsEmpty: 'No account yet. Add one to start using Mistral models.',
      addAccount: 'Add account',
      nameLabel: 'Account name',
      namePlaceholder: 'e.g. work',
      keyRefLabel: 'Credential reference',
      keyRefHint: 'Environment-variable name the key is stored under, e.g. MISTRAL_API_KEY.',
      baseURLLabel: 'Base URL',
      baseURLHint: 'Leave empty to use the provider default.',
      enabledLabel: 'Enabled',
      configured: 'Key configured',
      missing: 'No key',
      setKey: 'Set key',
      replaceKey: 'Replace key',
      clearKey: 'Clear key',
      remove: 'Remove',
      moveUp: 'Up',
      moveDown: 'Down',
      test: 'Test',
      testing: 'Testing…',
      testOk: 'Reachable · {count} models',
      testFailed: 'Failed: {message}',
      keySaved: 'Key stored.',
      keyCleared: 'Key cleared.',
      saveAccounts: 'Save accounts',
      saveModels: 'Save models',
      configure: 'Configure',
      collapse: 'Collapse',
      saveKeyEnable: 'Save & enable',
      cookieFallbackHint: 'Optional: an admin-site cookie is only needed when the key cannot read billing.',
      saveUsage: 'Save usage settings',
      saved: 'Saved.',
      saveFailed: 'Could not save: {message}',
      modelsTitle: 'Models',
      modelsHint: 'Hidden models disappear from the model selector. Capacity overrides apply to the next request.',
      refreshModels: 'Refresh from Mistral',
      refreshing: 'Refreshing…',
      visible: 'Visible',
      contextWindow: 'Context window',
      maxTokens: 'Max output',
      reasoning: 'Default effort',
      restoreDefaults: 'Restore defaults',
      modelsEmpty: 'No models discovered yet. Add an account, then refresh.',
      usageTitle: 'Subscription usage',
      usageHint:
        'Usage is read with the API key from /v1/billing/budget. If the key lacks the usage permission, add an admin-site cookie as a fallback.',
      cookieRef: 'Cookie credential reference',
      cookieSet: 'Cookie configured',
      cookieMissing: 'No cookie',
      setCookie: 'Set cookie',
      clearCookie: 'Clear cookie',
      displayLabel: 'Pill visibility',
      displayAuto: 'Always (setup hint when unconfigured)',
      displayAlways: 'Always',
      displayOff: 'Hidden',
      refreshSeconds: 'Refresh interval (seconds)',
      showCredits: 'Show credit balance',
      noCookie: 'Add an admin cookie to show subscription usage.',
      monthly: 'Included monthly usage',
      credits: 'Credits',
      spend: 'API spend this month',
      updated: 'Updated {when}',
      refresh: 'Refresh',
      advancedTitle: 'Advanced',
      failover: 'Automatic account failover',
      cooldown: 'Failed-account cooldown (seconds)',
      requestTimeout: 'Request timeout (ms)',
      streamIdle: 'Stream idle timeout (ms)',
      modelsRefresh: 'Model catalog refresh (minutes)',
      maxTokensCap: 'Default output cap (tokens)',
      proxy: 'Proxy URL (http/https/socks5)',
      saveAdvanced: 'Save advanced settings',
      advancedSaved: 'Advanced settings saved.',
      pillTitle: 'Mistral Pro usage',
      panelClose: 'Close',
      panelSetup: 'Open Settings → Mistral Pro to add an account and an API key.',
      panelNoData: 'No usage data yet.',
      pillNoAccount: 'No Mistral account configured',
      pillSetup: 'Open settings',
      pillError: 'Usage unavailable',
      pillRetry: 'Retry',
      loading: 'Loading…',
      timeNow: 'now',
      timeMinutesAgo: '{n} min ago',
      timeMinutesShort: '{n} min',
      timeHours: '{n} h',
      timeDays: '{n} d',
      searchModels: 'Search models',
      onlyVisible: 'Only visible',
      panelCookieTitle: 'The API key could not read usage',
      panelCookieBody: 'The billing endpoints refused this key; it may lack the usage permission. An admin-site cookie can read the same numbers.',
      panelCookieSteps: 'Sign in to admin.mistral.ai, copy the Cookie header from any request, and paste it under Settings → Mistral Pro → Advanced.',
      panelOpenAdmin: 'Open Mistral Admin',
      windowVibe: 'Vibe budget',
      windowApi: 'API budget',
      windowBudget: 'Monthly budget',
    }

    const ZH = {
      sectionTitle: 'Mistral Pro',
      sectionSubtitle: 'Mistral 订阅账号、模型与额度',
      accountsTitle: '账号',
      accountsHint: '请求按从上到下的顺序尝试。鉴权失败、限流或额度耗尽的 Key 会在开始输出文字前被跳过。',
      accountsEmpty: '还没有账号，添加一个即可使用 Mistral 模型。',
      addAccount: '添加账号',
      nameLabel: '账号名称',
      namePlaceholder: '例如：工作号',
      keyRefLabel: '凭据引用',
      keyRefHint: '保存 Key 的环境变量名，例如 MISTRAL_API_KEY。',
      baseURLLabel: '接口地址',
      baseURLHint: '留空使用默认地址。',
      enabledLabel: '启用',
      configured: '已配置 Key',
      missing: '未配置 Key',
      setKey: '设置 Key',
      replaceKey: '更换 Key',
      clearKey: '清除 Key',
      remove: '删除',
      moveUp: '上移',
      moveDown: '下移',
      test: '测试',
      testing: '测试中…',
      testOk: '连接成功 · {count} 个模型',
      testFailed: '失败：{message}',
      keySaved: 'Key 已保存。',
      keyCleared: 'Key 已清除。',
      saveAccounts: '保存账号',
      saveModels: '保存模型',
      configure: '设置',
      collapse: '收起',
      saveKeyEnable: '保存并启用',
      cookieFallbackHint: '可选：只有 Key 读不到账单时，才需要配置管理站点 Cookie。',
      saveUsage: '保存额度设置',
      saved: '已保存。',
      saveFailed: '保存失败：{message}',
      modelsTitle: '模型',
      modelsHint: '隐藏的模型不会出现在模型选择器中。容量覆盖从下一次请求开始生效。',
      refreshModels: '从 Mistral 刷新',
      refreshing: '刷新中…',
      visible: '显示',
      contextWindow: '上下文窗口',
      maxTokens: '最大输出',
      reasoning: '默认思考强度',
      restoreDefaults: '恢复默认',
      modelsEmpty: '还没有发现模型。先添加账号，然后刷新。',
      usageTitle: '订阅额度',
      usageHint:
        '额度由 API Key 直接读取（/v1/billing/budget）。如果这个 Key 没有 usage 权限，再配置管理站点的 Cookie 作为兜底。',
      cookieRef: 'Cookie 凭据引用',
      cookieSet: '已配置 Cookie',
      cookieMissing: '未配置 Cookie',
      setCookie: '设置 Cookie',
      clearCookie: '清除 Cookie',
      displayLabel: '胶囊显示',
      displayAuto: '始终显示（未配置时提示设置）',
      displayAlways: '常驻',
      displayOff: '隐藏',
      refreshSeconds: '刷新间隔（秒）',
      showCredits: '显示余额',
      noCookie: '配置管理站点 Cookie 后可显示订阅额度。',
      monthly: '月度包含额度',
      credits: '余额',
      spend: '本月 API 消费',
      updated: '{when}更新',
      refresh: '刷新',
      advancedTitle: '高级设置',
      failover: '自动切换备用账号',
      cooldown: '失败账号冷却（秒）',
      requestTimeout: '请求超时（毫秒）',
      streamIdle: '流空闲超时（毫秒）',
      modelsRefresh: '模型目录刷新（分钟）',
      maxTokensCap: '默认输出上限（token）',
      proxy: '代理地址（http/https/socks5）',
      saveAdvanced: '保存高级设置',
      advancedSaved: '高级设置已保存。',
      pillTitle: 'Mistral Pro 额度',
      panelClose: '关闭',
      panelSetup: '打开 设置 → Mistral Pro 添加账号与 API Key。',
      panelNoData: '暂无用量数据。',
      pillNoAccount: '尚未配置 Mistral 账号',
      pillSetup: '打开设置',
      pillError: '额度不可用',
      pillRetry: '重试',
      loading: '加载中…',
      timeNow: '刚刚',
      timeMinutesAgo: '{n} 分钟前',
      timeMinutesShort: '{n} 分钟',
      timeHours: '{n} 小时',
      timeDays: '{n} 天',
      searchModels: '搜索模型',
      onlyVisible: '只看已启用',
      panelCookieTitle: 'API Key 读取额度失败',
      panelCookieBody: '账单接口拒绝了这个 Key，可能是缺少 usage 权限。也可以用管理站点 Cookie 读取同样的数据。',
      panelCookieSteps: '登录 admin.mistral.ai，从任意请求复制 Cookie 头，粘贴到 设置 → Mistral Pro → 高级设置。',
      panelOpenAdmin: '打开 Mistral Admin',
      windowVibe: 'Vibe 额度',
      windowApi: 'API 额度',
      windowBudget: '月度预算',
    }

    const JA = {
      sectionTitle: 'Mistral Pro',
      sectionSubtitle: 'Mistral サブスクリプションのアカウント・モデル・使用量',
      accountsTitle: 'アカウント',
      accountsHint:
        'リクエストは上から順に試されます。認証失敗・レート制限・枠の枯渇が起きたキーは、出力が始まる前にスキップされます。',
      accountsEmpty: 'アカウントがありません。追加すると Mistral モデルを使えます。',
      addAccount: 'アカウントを追加',
      nameLabel: 'アカウント名',
      namePlaceholder: '例: work',
      keyRefLabel: 'クレデンシャル参照',
      keyRefHint: 'キーの保存先となる環境変数名（例: MISTRAL_API_KEY）。',
      baseURLLabel: 'ベース URL',
      baseURLHint: '空欄なら既定のエンドポイントを使います。',
      enabledLabel: '有効',
      configured: 'キー設定済み',
      missing: 'キー未設定',
      setKey: 'キーを設定',
      replaceKey: 'キーを変更',
      clearKey: 'キーを削除',
      remove: '削除',
      moveUp: '上へ',
      moveDown: '下へ',
      test: 'テスト',
      testing: 'テスト中…',
      testOk: '接続 OK · {count} モデル',
      testFailed: '失敗: {message}',
      keySaved: 'キーを保存しました。',
      keyCleared: 'キーを削除しました。',
      saveAccounts: 'アカウントを保存',
      saved: '保存しました。',
      saveFailed: '保存できませんでした: {message}',
      modelsTitle: 'モデル',
      modelsHint: '非表示にしたモデルは選択リストから消えます。容量の上書きは次のリクエストから反映されます。',
      refreshModels: 'Mistral から更新',
      refreshing: '更新中…',
      visible: '表示',
      contextWindow: 'コンテキスト',
      maxTokens: '最大出力',
      reasoning: '既定の推論強度',
      restoreDefaults: '既定に戻す',
      modelsEmpty: 'モデルがまだありません。アカウントを追加して更新してください。',
      usageTitle: 'サブスクリプション使用量',
      usageHint:
        '使用量は API キーで /v1/billing/budget から取得します。キーに usage 権限がない場合は、管理サイトの Cookie をフォールバックとして設定してください。',
      cookieRef: 'Cookie クレデンシャル参照',
      cookieSet: 'Cookie 設定済み',
      cookieMissing: 'Cookie 未設定',
      setCookie: 'Cookie を設定',
      clearCookie: 'Cookie を削除',
      displayLabel: 'ボタンの表示',
      displayAuto: '常に表示（未設定時は設定を案内）',
      displayAlways: '常に表示',
      displayOff: '非表示',
      refreshSeconds: '更新間隔（秒）',
      showCredits: '残高を表示',
      noCookie: '管理サイトの Cookie を設定すると使用量を表示できます。',
      monthly: '月次の使用枠',
      credits: '残高',
      spend: '今月の API 利用額',
      updated: '最終更新: {when}',
      refresh: '更新',
      advancedTitle: '詳細設定',
      failover: 'アカウントの自動フェイルオーバー',
      cooldown: '失敗アカウントのクールダウン（秒）',
      requestTimeout: 'リクエストタイムアウト（ms）',
      streamIdle: 'ストリームのアイドルタイムアウト（ms）',
      modelsRefresh: 'モデルカタログの更新間隔（分）',
      maxTokensCap: '既定の出力上限（トークン）',
      proxy: 'プロキシ URL（http/https/socks5）',
      saveAdvanced: '詳細設定を保存',
      advancedSaved: '詳細設定を保存しました。',
      saveModels: 'モデルを保存',
      configure: '設定',
      collapse: '閉じる',
      saveKeyEnable: '保存して有効化',
      cookieFallbackHint: '任意: キーで請求を読めない場合のみ、管理サイトの Cookie が必要です。',
      saveUsage: '使用量設定を保存',
      pillTitle: 'Mistral Pro 使用量',
      panelClose: '閉じる',
      panelSetup: '設定 → Mistral Pro でアカウントと API キーを追加してください。',
      panelNoData: '使用量データはまだありません。',
      pillNoAccount: 'Mistral アカウントが未設定です',
      pillSetup: '設定を開く',
      pillError: '使用量を取得できません',
      pillRetry: '再試行',
      loading: '読み込み中…',
      timeNow: 'たった今',
      timeMinutesAgo: '{n} 分前',
      timeMinutesShort: '{n} 分',
      timeHours: '{n} 時間',
      timeDays: '{n} 日',
      searchModels: 'モデルを検索',
      onlyVisible: '表示中のみ',
      panelCookieTitle: 'API キーでは使用量を取得できませんでした',
      panelCookieBody: '請求エンドポイントがこのキーを拒否しました。usage 権限がない可能性があります。管理サイトの Cookie でも同じ数値を取得できます。',
      panelCookieSteps: 'admin.mistral.ai にログインし、任意のリクエストから Cookie ヘッダーをコピーして Settings → Mistral Pro → Advanced に貼り付けてください。',
      panelOpenAdmin: 'Mistral Admin を開く',
      windowVibe: 'Vibe 使用枠',
      windowApi: 'API 使用枠',
      windowBudget: '月次予算',
    }

    const S = {
      card: {
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 12,
        minWidth: 0,
        boxSizing: 'border-box',
      },
      title: { color: 'var(--dsw-alias-label-primary)', fontSize: 14, fontWeight: 600, margin: 0 },
      hint: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.5, margin: '4px 0 0' },
      label: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, display: 'block', marginBottom: 4 },
      input: {
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: 13,
        width: '100%',
        boxSizing: 'border-box',
      },
      row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      button: {
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 12,
        cursor: 'pointer',
      },
      primary: {
        background: 'var(--dsw-alias-label-primary)',
        color: 'var(--dsw-alias-bg-base)',
        border: '1px solid var(--dsw-alias-label-primary)',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      },
      ok: { color: 'var(--dsw-alias-state-success-primary)', fontSize: 12 },
      warn: { color: 'var(--dsw-alias-state-warn-primary)', fontSize: 12 },
      error: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 12 },
      bar: { height: 6, borderRadius: 3, background: 'var(--dsw-alias-bg-layer-2)', overflow: 'hidden', marginTop: 6 },
    }

    async function callRemote(ctx, namespace, method, ...args) {
      const result = await ctx.remote[namespace][method](...args)
      if (result === null || typeof result !== 'object' || result.ok !== true) {
        const failure = result?.error
        throw new Error(failure?.message ?? `${namespace}.${method} failed`)
      }
      return result.value
    }

    async function getJSON(path) {
      const response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    function fill(template, params) {
      return template.replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ''))
    }

    function money(value, unit) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      const symbol = unit === 'USD' || unit === undefined ? '$' : unit === 'EUR' ? '€' : ''
      return `${symbol}${value.toFixed(2)}${symbol === '' ? ` ${unit}` : ''}`
    }

    function when(iso, t) {
      if (typeof iso !== 'string' || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const delta = date.getTime() - Date.now()
      const days = Math.round(delta / 86400000)
      if (days > 1) return fill(t('timeDays'), { n: days })
      const hours = Math.round(delta / 3600000)
      if (hours >= 1) return fill(t('timeHours'), { n: hours })
      const minutes = Math.max(0, Math.round(delta / 60000))
      return fill(t('timeMinutesShort'), { n: minutes })
    }

    function updated(ts, t) {
      if (typeof ts !== 'number') return ''
      const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000))
      return minutes <= 0 ? t('timeNow') : fill(t('timeMinutesAgo'), { n: minutes })
    }

    function Field({ label, hint, children }) {
      return h('div', { style: { marginBottom: 10 } }, h('span', { style: S.label }, label), children, hint ? h('p', { style: S.hint }, hint) : null)
    }

    function Notice({ notice }) {
      if (notice === null || notice === undefined) return null
      return h('p', { style: notice.kind === 'error' ? S.error : S.ok }, notice.text)
    }

    function serializeAccounts(accounts) {
      return accounts.map((account) => ({
        name: account.name.trim() === '' ? 'default' : account.name.trim(),
        apiKeyEnv: account.apiKeyEnv.trim() === '' ? 'MISTRAL_API_KEY' : account.apiKeyEnv.trim(),
        baseURL: '',
        enabled: account.enabled !== false,
      }))
    }

    // ── Settings page ────────────────────────────────────────────────────────

    function SettingsSection({ ctx, t }) {
      const [state, setState] = useState({ status: 'loading', meta: null, value: null, revision: undefined, creds: {}, models: [], error: null })
      const [draft, setDraft] = useState(null)
      const [notice, setNotice] = useState(null)
      const [busy, setBusy] = useState(false)
      const [keyDraft, setKeyDraft] = useState({})
      const [cookieDraft, setCookieDraft] = useState('')
      const [testing, setTesting] = useState({})
      const [modelQuery, setModelQuery] = useState('')
      const [onlyVisible, setOnlyVisible] = useState(false)
      const [expandedModel, setExpandedModel] = useState(null)

      const load = useCallback(async () => {
        try {
          const meta = await getJSON('/meta')
          const described = await callRemote(ctx, 'settings', 'describe')
          const view = described.namespaces.find((entry) => entry.ns === meta.settingsNs)
          const value = view?.value ?? {}
          const refs = new Set([meta.usage.adminCookieEnv, 'MISTRAL_API_KEY'])
          for (const account of value.accounts ?? []) if (account?.apiKeyEnv) refs.add(account.apiKeyEnv)
          const creds = await callRemote(ctx, 'credentials', 'describe', Array.from(refs))
          const models = ((await getJSON('/models')).models ?? []).map((model) => ({
            ...model,
            originalContextWindow: model.contextWindow,
            originalMaxTokens: model.maxTokens,
            originalReasoning: model.defaultReasoning ?? '',
            reasoningEffort: model.defaultReasoning ?? '',
          }))
          setState({ status: 'ready', meta, value, revision: view?.revision, creds, models, error: null })
          setDraft({
            accounts: (value.accounts && value.accounts.length > 0 ? value.accounts : [{ name: 'default', apiKeyEnv: 'MISTRAL_API_KEY', baseURL: '', enabled: true }]).map((account) => ({
              name: account.name ?? '',
              apiKeyEnv: account.apiKeyEnv ?? 'MISTRAL_API_KEY',
              baseURL: account.baseURL && account.baseURL !== meta.baseURL ? account.baseURL : '',
              enabled: account.enabled !== false,
            })),
            usage: {
              display: value.usage?.display ?? meta.usage.display ?? 'auto',
              refreshSeconds: value.usage?.refreshSeconds ?? meta.usage.refreshSeconds ?? 60,
              adminCookieEnv: value.usage?.adminCookieEnv ?? meta.usage.adminCookieEnv ?? 'MISTRAL_ADMIN_COOKIE',
              showCredits: value.usage?.showCredits !== false,
            },
            advanced: { ...meta.advanced, ...(value.advanced ?? {}) },
          })
        } catch (error) {
          setState((current) => ({ ...current, status: 'error', error: String(error?.message ?? error) }))
        }
      }, [ctx])

      useEffect(() => {
        void load()
      }, [load])

      const update = useCallback(
        async (patch, successText) => {
          if (state.meta === null) return
          setBusy(true)
          setNotice(null)
          try {
            await callRemote(ctx, 'settings', 'update', state.meta.settingsNs, patch, state.revision)
            setNotice({ kind: 'ok', text: successText ?? t('saved') })
            await load()
          } catch (error) {
            setNotice({ kind: 'error', text: fill(t('saveFailed'), { message: String(error?.message ?? error) }) })
          } finally {
            setBusy(false)
          }
        },
        [ctx, load, state.meta, state.revision, t],
      )

      const setKey = useCallback(
        async (ref, nextAccounts) => {
          const value = keyDraft[ref]
          if (typeof value !== 'string' || value.trim() === '') return
          setBusy(true)
          try {
            await callRemote(ctx, 'credentials', 'set', ref, value.trim())
            if (Array.isArray(nextAccounts) && state.meta !== null) {
              await callRemote(ctx, 'settings', 'update', state.meta.settingsNs, { accounts: serializeAccounts(nextAccounts) }, state.revision)
            }
            setKeyDraft((current) => ({ ...current, [ref]: '' }))
            setNotice({ kind: 'ok', text: t('keySaved') })
            await load()
          } catch (error) {
            setNotice({ kind: 'error', text: fill(t('saveFailed'), { message: String(error?.message ?? error) }) })
          } finally {
            setBusy(false)
          }
        },
        [ctx, keyDraft, load, state.meta, state.revision, t],
      )

      const clearKey = useCallback(
        async (ref) => {
          setBusy(true)
          try {
            await callRemote(ctx, 'credentials', 'unset', ref)
            setNotice({ kind: 'ok', text: t('keyCleared') })
            await load()
          } catch (error) {
            setNotice({ kind: 'error', text: fill(t('saveFailed'), { message: String(error?.message ?? error) }) })
          } finally {
            setBusy(false)
          }
        },
        [ctx, load, t],
      )

      const testAccount = useCallback(
        async (name) => {
          setTesting((current) => ({ ...current, [name]: true }))
          try {
            const result = await getJSON(`/test?account=${encodeURIComponent(name)}`)
            if (result.ok) setNotice({ kind: 'ok', text: fill(t('testOk'), { count: result.count }) })
            else setNotice({ kind: 'error', text: fill(t('testFailed'), { message: result.error?.message ?? 'unknown' }) })
          } catch (error) {
            setNotice({ kind: 'error', text: fill(t('testFailed'), { message: String(error?.message ?? error) }) })
          } finally {
            setTesting((current) => ({ ...current, [name]: false }))
          }
        },
        [t],
      )

      if (state.status === 'loading') return h('p', { style: S.hint }, t('loading'))
      if (state.status === 'error') return h('p', { style: S.error }, state.error)
      if (draft === null) return h('p', { style: S.hint }, t('loading'))

      const accounts = draft.accounts
      const setAccounts = (next) => setDraft({ ...draft, accounts: next })
      const setUsage = (next) => setDraft({ ...draft, usage: { ...draft.usage, ...next } })
      const setAdvanced = (next) => setDraft({ ...draft, advanced: { ...draft.advanced, ...next } })

      const saveAccounts = () => update({ accounts: serializeAccounts(accounts) }, t('saved'))

      const saveModels = () => {
        const models = {}
        for (const model of state.models) {
          const override = {}
          if (model.visible === false) override.visible = false
          if (model.contextWindow !== model.originalContextWindow) override.contextWindow = model.contextWindow
          if (model.maxTokens !== model.originalMaxTokens) override.maxTokens = model.maxTokens
          if (model.reasoningEffort && model.reasoningEffort !== model.originalReasoning) override.reasoningEffort = model.reasoningEffort
          if (Object.keys(override).length > 0) models[model.id] = override
        }
        return update({ models }, t('saved'))
      }

      const saveUsage = () => update({ usage: draft.usage }, t('saved'))
      const saveAdvanced = () => update({ advanced: draft.advanced, usage: draft.usage }, t('advancedSaved'))

      const setModel = (id, patch) =>
        setState((current) => ({
          ...current,
          models: current.models.map((model) => (model.id === id ? { ...model, ...patch } : model)),
        }))

      return h(
        'div',
        { style: { paddingBottom: 24, width: '100%', minWidth: 0, boxSizing: 'border-box' } },
        h('h2', { style: { ...S.title, fontSize: 18, marginBottom: 2 } }, t('sectionTitle')),
        h('p', { style: { ...S.hint, marginBottom: 14 } }, t('sectionSubtitle')),
        h(Notice, { notice }),

        // Accounts
        h(
          'section',
          { style: S.card },
          h('h3', { style: S.title }, t('accountsTitle')),
          h('p', { style: S.hint }, t('accountsHint')),
          accounts.length === 0 ? h('p', { style: S.hint }, t('accountsEmpty')) : null,
          accounts.map((account, index) =>
            h(
              'div',
              { key: `${account.name}-${index}`, style: { ...S.card, background: 'var(--dsw-alias-bg-layer-2)', marginTop: 10 } },
              h(Field, { label: t('nameLabel') }, h('input', {
                style: S.input,
                value: account.name,
                placeholder: t('namePlaceholder'),
                onChange: (event) => setAccounts(accounts.map((entry, position) => (position === index ? { ...entry, name: event.target.value } : entry))),
                onBlur: () => void saveAccounts(),
              })),
              h(
                'div',
                { style: { ...S.row, marginTop: 4 } },
                h('label', { style: { ...S.row, gap: 4 } }, h('input', {
                  type: 'checkbox',
                  checked: account.enabled !== false,
                  onChange: (event) => setAccounts(accounts.map((entry, position) => (position === index ? { ...entry, enabled: event.target.checked } : entry))),
                }), t('enabledLabel')),
                h('span', { style: state.creds[account.apiKeyEnv]?.configured ? S.ok : S.warn }, state.creds[account.apiKeyEnv]?.configured ? t('configured') : t('missing')),
              ),
              h(
                'div',
                { style: { ...S.row, marginTop: 8 } },
                h('input', {
                  style: { ...S.input, flex: '1 1 180px', width: 'auto', minWidth: 0 },
                  type: 'password',
                  placeholder: t('setKey'),
                  value: keyDraft[account.apiKeyEnv] ?? '',
                  onChange: (event) => setKeyDraft((current) => ({ ...current, [account.apiKeyEnv]: event.target.value })),
                }),
                h('button', {
                  style: S.primary,
                  disabled: busy,
                  onClick: () =>
                    void setKey(
                      account.apiKeyEnv,
                      accounts.map((entry, position) => (position === index ? { ...entry, enabled: true } : entry)),
                    ),
                }, t('saveKeyEnable')),
                h('button', { style: S.button, disabled: busy, onClick: () => void clearKey(account.apiKeyEnv) }, t('clearKey')),
              ),
              h(
                'div',
                { style: { ...S.row, marginTop: 8 } },
                h('button', { style: S.button, disabled: testing[account.name] === true, onClick: () => void testAccount(account.name) }, testing[account.name] ? t('testing') : t('test')),
                h('button', {
                  style: S.button,
                  disabled: index === 0,
                  onClick: () => {
                    const next = [...accounts]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    setAccounts(next)
                  },
                }, '↑'),
                h('button', {
                  style: S.button,
                  disabled: index === accounts.length - 1,
                  onClick: () => {
                    const next = [...accounts]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    setAccounts(next)
                  },
                }, '↓'),
                h('button', { style: S.button, onClick: () => setAccounts(accounts.filter((_, position) => position !== index)) }, t('remove')),
              ),
            ),
          ),
          h(
            'div',
            { style: { ...S.row, marginTop: 10 } },
            h('button', {
              style: S.button,
              onClick: () =>
                setAccounts([
                  ...accounts,
                  { name: `account-${accounts.length + 1}`, apiKeyEnv: accounts.length === 0 ? 'MISTRAL_API_KEY' : `MISTRAL_API_KEY_${accounts.length + 1}`, baseURL: '', enabled: true },
                ]),
            }, t('addAccount')),
          ),
        ),

        // Models
        h(
          'section',
          { style: S.card },
          h('h3', { style: S.title }, t('modelsTitle')),
          h('p', { style: S.hint }, t('modelsHint')),
          h(
            'div',
            { style: { ...S.row, margin: '8px 0' } },
            h('button', {
              style: S.button,
              onClick: async () => {
                setBusy(true)
                try {
                  await getJSON('/refresh')
                  await load()
                } finally {
                  setBusy(false)
                }
              },
            }, t('refreshModels')),
            h('button', { style: S.primary, disabled: busy, onClick: () => void saveModels() }, t('saveModels')),
          ),
          state.models.length === 0
            ? h('p', { style: S.hint }, t('modelsEmpty'))
            : h(
                'div',
                { style: { minWidth: 0 } },
                h(
                  'div',
                  { style: { ...S.row, margin: '4px 0 8px' } },
                  h('input', {
                    style: { ...S.input, flex: '1 1 160px', width: 'auto' },
                    placeholder: t('searchModels'),
                    value: modelQuery,
                    onChange: (event) => setModelQuery(event.target.value),
                  }),
                  h('label', { style: { ...S.row, gap: 4 } }, h('input', {
                    type: 'checkbox',
                    checked: onlyVisible,
                    onChange: (event) => setOnlyVisible(event.target.checked),
                  }), t('onlyVisible')),
                ),
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 } },
                  state.models
                    .filter((model) => {
                      if (onlyVisible && model.visible === false) return false
                      const query = modelQuery.trim().toLowerCase()
                      if (query === '') return true
                      return model.name.toLowerCase().includes(query) || model.id.toLowerCase().includes(query)
                    })
                    .map((model) =>
                      h(
                        'div',
                        { key: model.id, style: { borderBottom: '1px solid var(--dsw-alias-border-l1)', minWidth: 0 } },
                        h(
                          'div',
                          { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', minWidth: 0 } },
                          h('input', {
                            type: 'checkbox',
                            checked: model.visible !== false,
                            onChange: (event) => setModel(model.id, { visible: event.target.checked }),
                          }),
                          h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, model.name),
                          h('span', { style: { ...S.hint, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 60px' } }, model.id),
                          h('button', {
                            style: { ...S.button, flex: '0 0 auto' },
                            onClick: () => setExpandedModel(expandedModel === model.id ? null : model.id),
                          }, expandedModel === model.id ? t('collapse') : t('configure')),
                        ),
                        expandedModel === model.id
                          ? h(
                              'div',
                              { style: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 0 10px 26px' } },
                              h('div', { style: { flex: '1 1 120px', minWidth: 0 } },
                                h('span', { style: S.label }, t('contextWindow')),
                                h('input', { style: S.input, type: 'number', value: model.contextWindow, onChange: (event) => setModel(model.id, { contextWindow: Number(event.target.value) }) }),
                              ),
                              h('div', { style: { flex: '1 1 120px', minWidth: 0 } },
                                h('span', { style: S.label }, t('maxTokens')),
                                h('input', { style: S.input, type: 'number', value: model.maxTokens, onChange: (event) => setModel(model.id, { maxTokens: Number(event.target.value) }) }),
                              ),
                              h('div', { style: { flex: '1 1 120px', minWidth: 0 } },
                                h('span', { style: S.label }, t('reasoning')),
                                model.reasoningEfforts.length === 0
                                  ? h('div', { style: { ...S.hint, margin: 0, paddingTop: 6 } }, '—')
                                  : h(
                                      'select',
                                      { style: S.input, value: model.reasoningEffort ?? '', onChange: (event) => setModel(model.id, { reasoningEffort: event.target.value }) },
                                      h('option', { value: '' }, 'default'),
                                      model.reasoningEfforts.map((effort) => h('option', { key: effort, value: effort }, effort)),
                                    ),
                              ),
                            )
                          : null,
                      ),
                    ),
                ),
              ),
        ),



        // Advanced
        h(
          'details',
          { style: S.card },
          h('summary', { style: { ...S.title, cursor: 'pointer' } }, t('advancedTitle')),
          h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 8 } },
            h(Field, { label: t('failover') }, h('input', {
              type: 'checkbox',
              checked: draft.advanced.failover !== false,
              onChange: (event) => setAdvanced({ failover: event.target.checked }),
            })),
            h(Field, { label: t('cooldown') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.advanced.cooldownSeconds,
              onChange: (event) => setAdvanced({ cooldownSeconds: Number(event.target.value) }),
            })),
            h(Field, { label: t('requestTimeout') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.advanced.requestTimeoutMs,
              onChange: (event) => setAdvanced({ requestTimeoutMs: Number(event.target.value) }),
            })),
            h(Field, { label: t('streamIdle') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.advanced.streamIdleTimeoutMs,
              onChange: (event) => setAdvanced({ streamIdleTimeoutMs: Number(event.target.value) }),
            })),
            h(Field, { label: t('modelsRefresh') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.advanced.modelsRefreshMinutes,
              onChange: (event) => setAdvanced({ modelsRefreshMinutes: Number(event.target.value) }),
            })),
            h(Field, { label: t('maxTokensCap') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.advanced.maxTokensCap,
              onChange: (event) => setAdvanced({ maxTokensCap: Number(event.target.value) }),
            })),
            h(Field, { label: t('displayLabel') },
              h('select', {
                style: S.input,
                value: draft.usage.display,
                onChange: (event) => setUsage({ display: event.target.value }),
              },
                h('option', { value: 'auto' }, t('displayAuto')),
                h('option', { value: 'always' }, t('displayAlways')),
                h('option', { value: 'off' }, t('displayOff')),
              ),
            ),
            h(Field, { label: t('refreshSeconds') }, h('input', {
              style: S.input,
              type: 'number',
              value: draft.usage.refreshSeconds,
              onChange: (event) => setUsage({ refreshSeconds: Number(event.target.value) }),
            })),
            h(Field, { label: t('proxy') }, h('input', {
              style: S.input,
              value: draft.advanced.proxy ?? '',
              placeholder: 'socks5://127.0.0.1:1080',
              onChange: (event) => setAdvanced({ proxy: event.target.value }),
            })),
          ),
          h('p', { style: { ...S.hint, marginTop: 12 } }, t('cookieFallbackHint')),
          h(
            'div',
            { style: { ...S.row } },
            h('span', { style: state.creds[draft.usage.adminCookieEnv]?.configured ? S.ok : S.warn }, state.creds[draft.usage.adminCookieEnv]?.configured ? t('cookieSet') : t('cookieMissing')),
            h('input', {
              style: { ...S.input, flex: '1 1 160px', width: 'auto' },
              value: draft.usage.adminCookieEnv,
              onChange: (event) => setUsage({ adminCookieEnv: event.target.value }),
            }),
            h('input', {
              style: { ...S.input, flex: '1 1 200px', width: 'auto' },
              type: 'password',
              placeholder: 'ory_session_…=…; csrftoken=…',
              value: cookieDraft,
              onChange: (event) => setCookieDraft(event.target.value),
            }),
            h('button', {
              style: S.button,
              disabled: busy || cookieDraft.trim() === '',
              onClick: async () => {
                setBusy(true)
                try {
                  await callRemote(ctx, 'credentials', 'set', draft.usage.adminCookieEnv, cookieDraft.trim())
                  setCookieDraft('')
                  setNotice({ kind: 'ok', text: t('keySaved') })
                  await load()
                } catch (error) {
                  setNotice({ kind: 'error', text: fill(t('saveFailed'), { message: String(error?.message ?? error) }) })
                } finally {
                  setBusy(false)
                }
              },
            }, t('setCookie')),
            h('button', {
              style: S.button,
              disabled: busy,
              onClick: async () => {
                setBusy(true)
                try {
                  await callRemote(ctx, 'credentials', 'unset', draft.usage.adminCookieEnv)
                  await load()
                } finally {
                  setBusy(false)
                }
              },
            }, t('clearCookie')),
          ),
          h('button', { style: S.primary, disabled: busy, onClick: () => void saveAdvanced() }, t('saveAdvanced')),
        ),
      )
    }

    // ── Composer usage button + overlay panel ───────────────────────────────

    const panel = {
      open: false,
      listeners: new Set(),
      set(open) {
        if (panel.open === open) return
        panel.open = open
        for (const listener of panel.listeners) listener()
      },
      toggle() {
        panel.set(!panel.open)
      },
    }

    function usePanelOpen() {
      const [open, setOpen] = useState(panel.open)
      useEffect(() => {
        const listener = () => setOpen(panel.open)
        panel.listeners.add(listener)
        return () => panel.listeners.delete(listener)
      }, [])
      return open
    }

    const pillStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 26,
      padding: '0 10px',
      background: 'var(--dsw-alias-bg-layer-1)',
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: 999,
      fontSize: 12,
      lineHeight: '24px',
      color: 'var(--dsw-alias-label-secondary)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }

    function dot(color) {
      return { width: 7, height: 7, borderRadius: 4, background: color, display: 'inline-block', flex: '0 0 auto' }
    }

    function primaryWindow(windows) {
      if (!Array.isArray(windows) || windows.length === 0) return undefined
      return windows.find((window) => /vibe|monthly|plan|included/i.test(String(window.label ?? ''))) ?? windows[0]
    }

    function toneFor(percent, failed, configured) {
      if (failed) return configured ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-state-idle-primary)'
      if (percent === undefined) return 'var(--dsw-alias-state-idle-primary)'
      if (percent >= 90) return 'var(--dsw-alias-state-error-primary)'
      if (percent >= 70) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-success-primary)'
    }

    function UsageButton({ ctx, t }) {
      const [meta, setMeta] = useState(null)
      const [usage, setUsage] = useState(null)
      const [error, setError] = useState(null)

      useEffect(() => {
        let cancelled = false
        void getJSON('/meta')
          .then((value) => {
            if (!cancelled) setMeta(value)
          })
          .catch(() => {})
        return () => {
          cancelled = true
        }
      }, [])

      const display = meta?.usage?.display ?? 'auto'
      const visible = display !== 'off'

      useEffect(() => {
        if (!visible) return undefined
        let cancelled = false
        const tick = async () => {
          try {
            const value = await getJSON('/usage')
            if (!cancelled) {
              setUsage(value)
              setError(null)
            }
          } catch (caught) {
            if (!cancelled) setError(String(caught?.message ?? caught))
          }
        }
        void tick()
        const seconds = Math.max(15, meta?.usage?.refreshSeconds ?? 60)
        const timer = setInterval(() => {
          if (!document.hidden) void tick()
        }, seconds * 1000)
        const onVisibility = () => {
          if (!document.hidden) void tick()
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          cancelled = true
          clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }, [visible, meta?.usage?.refreshSeconds])

      if (!visible) return null

      const primary = primaryWindow(usage?.windows)
      const percent = primary?.percent
      const configured = meta?.accounts?.some((account) => account.configured === true) === true
      const failed = error !== null || usage?.ok === false
      const label = percent === undefined ? 'Mistral' : `Mistral ${Math.round(percent)}%`

      return h(
        'button',
        {
          type: 'button',
          style: pillStyle,
          title: t('pillTitle'),
          onClick: () => panel.toggle(),
        },
        h('span', { style: dot(toneFor(percent, failed, configured)) }),
        h('span', null, label),
      )
    }

    function UsagePanel({ ctx, t }) {
      const open = usePanelOpen()
      const [usage, setUsage] = useState(null)
      const [error, setError] = useState(null)
      const [meta, setMeta] = useState(null)
      const [busy, setBusy] = useState(false)

      useEffect(() => {
        if (!open) return undefined
        let cancelled = false
        void getJSON('/meta')
          .then((value) => {
            if (!cancelled) setMeta(value)
          })
          .catch(() => {})
        void getJSON('/usage?force=1')
          .then((value) => {
            if (!cancelled) {
              setUsage(value)
              setError(null)
            }
          })
          .catch((caught) => {
            if (!cancelled) setError(String(caught?.message ?? caught))
          })
        const onKey = (event) => {
          if (event.key === 'Escape') panel.set(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
          cancelled = true
          window.removeEventListener('keydown', onKey)
        }
      }, [open])

      if (!open) return null

      const refresh = async () => {
        setBusy(true)
        try {
          setUsage(await getJSON('/usage?force=1'))
          setError(null)
        } catch (caught) {
          setError(String(caught?.message ?? caught))
        } finally {
          setBusy(false)
        }
      }

      const windows = usage?.windows ?? []
      const configured = meta?.accounts?.some((account) => account.configured === true) === true

      return h(
        'div',
        {
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          },
          onClick: () => panel.set(false),
        },
        h(
          'div',
          {
            style: {
              width: 'min(440px, 92vw)',
              maxHeight: '76vh',
              overflow: 'auto',
              background: 'var(--dsw-alias-bg-layer-1)',
              border: '1px solid var(--dsw-alias-border-l2)',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 18px 48px rgba(0, 0, 0, 0.28)',
            },
            onClick: (event) => event.stopPropagation(),
          },
          h(
            'div',
            { style: { ...S.row, justifyContent: 'space-between', marginBottom: 6 } },
            h('strong', { style: { ...S.title, fontSize: 15 } }, t('pillTitle')),
            h('button', { style: S.button, onClick: () => panel.set(false) }, t('panelClose')),
          ),
          h(
            'div',
            { style: { ...S.row, justifyContent: 'space-between' } },
            h('span', { style: S.hint }, usage?.account ?? meta?.accounts?.[0]?.name ?? ''),
            h('span', { style: S.hint }, usage?.plan ?? ''),
          ),

          error !== null ? h('p', { style: S.error }, error) : null,
          usage?.ok === false && !configured ? h('p', { style: S.hint }, t('panelSetup')) : null,
          usage?.ok === false && configured && (usage?.error?.code === 'NO_USAGE' || usage?.error?.code === 'NO_COOKIE')
            ? h(
                'div',
                { style: { marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)' } },
                h('div', { style: { ...S.title, fontSize: 13, marginBottom: 4 } }, t('panelCookieTitle')),
                h('p', { style: S.hint }, t('panelCookieBody')),
                h('p', { style: S.hint }, t('panelCookieSteps')),
                h(
                  'a',
                  {
                    href: 'https://admin.mistral.ai/organization/usage',
                    target: '_blank',
                    rel: 'noreferrer',
                    style: { color: 'var(--dsw-alias-brand-primary)', fontSize: 12 },
                  },
                  t('panelOpenAdmin'),
                ),
              )
            : null,
          usage?.ok === false && usage?.error?.code !== 'NO_USAGE' && usage?.error?.code !== 'NO_COOKIE'
            ? h('p', { style: S.hint }, usage?.error?.message ?? t('pillError'))
            : null,

          windows.length === 0 && usage?.ok === true ? h('p', { style: S.hint }, t('panelNoData')) : null,

          windows.map((window) =>
            h(
              'div',
              { key: window.id, style: { marginTop: 12 } },
              h(
                'div',
                { style: { ...S.row, justifyContent: 'space-between' } },
                h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 12 } }, window.labelKey ? t(window.labelKey) : window.label),
                h('span', { style: S.hint }, window.percent === undefined ? '' : `${Math.round(window.percent)}%`),
              ),
              h(
                'div',
                { style: S.bar },
                h('div', {
                  style: {
                    width: `${Math.max(0, Math.min(100, window.percent ?? 0))}%`,
                    height: '100%',
                    background:
                      (window.percent ?? 0) >= 90
                        ? 'var(--dsw-alias-state-error-primary)'
                        : 'var(--dsw-alias-brand-primary)',
                  },
                }),
              ),
              h(
                'div',
                { style: { ...S.row, justifyContent: 'space-between', marginTop: 2 } },
                h(
                  'span',
                  { style: S.hint },
                  window.total !== undefined
                    ? `${money(window.used, window.unit)} / ${money(window.total, window.unit)}`
                    : '',
                ),
                h('span', { style: S.hint }, window.resetsAt ? when(window.resetsAt, t) : ''),
              ),
            ),
          ),

          usage?.credits
            ? h('p', { style: { ...S.hint, marginTop: 12 } }, `${t('credits')}: ${money(usage.credits.balance, usage.credits.currency)}`)
            : null,
          usage?.spend
            ? h('p', { style: S.hint }, `${t('spend')}: ${money(usage.spend.amount, usage.spend.currency)}`)
            : null,

          h(
            'div',
            { style: { ...S.row, justifyContent: 'space-between', marginTop: 14 } },
            h('span', { style: S.hint }, usage?.fetchedAt ? fill(t('updated'), { when: updated(usage.fetchedAt, t) }) : ''),
            h('button', { style: S.button, disabled: busy, onClick: () => void refresh() }, t('refresh')),
          ),
        ),
      )
    }

    return {
      // `remote` is a Cordis service: reading ctx.remote without declaring it
      // throws "cannot get property \"remote\" without inject".
      inject: ['slots', 'locale', 'remote', 'remote.settings', 'remote.credentials'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'en', EN))
        ctx.effect(() => ctx.locale.register(NS, 'zh', ZH))
        ctx.effect(() => ctx.locale.register(NS, 'ja', JA))
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: NS, order: 22, label: () => t('sectionTitle') },
            (props) => h(SettingsSection, { ...props, ctx, t }),
          ),
        )

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            { name: 'conversation.input.right', id: `${NS}-usage`, order: 1001 },
            (props) => h(UsageButton, { ...props, ctx, t }),
          ),
        )

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: `${NS}-usage-panel`, order: 100 },
            (props) => h(UsagePanel, { ...props, ctx, t }),
          ),
        )
      },
    }
  },
})
