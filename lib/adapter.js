/**
 * OpenAI-compatible streaming adapter for Mistral's inference API.
 *
 * One stream is one provider attempt per account: the adapter walks the
 * configured account order, and only a failure that happens before any visible
 * content reaches the user may move to the next account. Once text, reasoning
 * or a tool call has been emitted the attempt is committed, so a mid-stream
 * provider error surfaces as a terminal failure instead of spliced output.
 */
import {
  LlmAdapter,
  LlmError,
  attributionHeaders,
  isContextWindowExceededError,
  isQuotaExceededError,
} from '@deepseek-ai/dsh-llm'
import { DISPLAY_NAME } from './config.js'
import { listModels as catalogListModels, resolveModelInfo, outputCap } from './catalog.js'
import { resolveAccountKey } from './accounts.js'

const PKG = 'dsh-mistral-pro'
const MAX_ERROR_BODY = 4096

/** Failures that justify trying the next account before any output. */
const FAILOVER_CODES = new Set(['AUTH', 'RATE_LIMIT', 'QUOTA', 'MISSING_CREDENTIAL', 'INVALID_CREDENTIAL'])

export class MistralProAdapter extends LlmAdapter {
  /**
   * @param options.ctx - plugin context, used for credentials and attachments.
   * @param options.readConfig - returns the current normalized configuration.
   * @param options.pool - account ordering and cooldown state.
   * @param options.discovered - live model ids discovered from the provider.
   */
  constructor({ ctx, readConfig, pool, discovered }) {
    super()
    this.ctx = ctx
    this.readConfig = readConfig
    this.pool = pool
    this.discovered = discovered
  }

  providerInfo(provider) {
    return { id: provider, name: DISPLAY_NAME }
  }

  providerRetryPolicy() {
    return {
      mode: 'normal',
      maxRetries: 3,
      retryableCodes: ['RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT', 'EMPTY_RESPONSE'],
      backoff: { initialDelayMs: 800, maxDelayMs: 15000, jitterRatio: 0.2 },
    }
  }

  async listModels(provider) {
    return catalogListModels(this.readConfig(), this.discovered.models)
  }

  async resolveModel(provider, model) {
    return resolveModelInfo(model, this.readConfig(), this.discovered.models)
  }

  async prepareCall(provider, model, signal) {
    const info = await this.resolveModel(provider, model, signal)
    return { model: info, stream: (options) => this.stream(options) }
  }

  /**
   * Stream one model call, failing over between accounts until one produces output.
   * @param options - the `llm` service request.
   */
  async *stream(options) {
    const config = this.readConfig()
    const model = resolveModelInfo(options.model, config, this.discovered.models)
    const messages = await this.toMessages(options.messages, config)
    const body = this.buildBody(options, model, config, messages)
    const attempts = this.pool.attemptOrder(config)

    if (attempts.length === 0) {
      throw new LlmError(`${PKG}: no enabled Mistral account is configured`, 'MISSING_CREDENTIAL')
    }

    let lastError
    for (const account of attempts) {
      let apiKey
      try {
        apiKey = await resolveAccountKey(this.ctx, account)
      } catch (error) {
        lastError = error
        continue
      }
      // Visible output commits the attempt: only a failure before the first
      // emitted block may move to the next account.
      const state = { emitted: false }

      const controller = new AbortController()
      const onAbort = () => controller.abort(options.signal?.reason)
      if (options.signal !== undefined) {
        if (options.signal.aborted) throw options.signal.reason
        options.signal.addEventListener('abort', onAbort, { once: true })
      }
      const deadline = setTimeout(() => controller.abort(new Error('request timeout')), config.advanced.requestTimeoutMs)

      try {
        yield* this.streamWithAccount({ options, config, model, body, account, apiKey, controller, state })
        this.pool.markSuccess(account.name)
        return
      } catch (error) {
        const failover = !state.emitted && this.shouldFailover(error)
        if (failover) {
          this.pool.markFailure(account.name, config.advanced.cooldownSeconds)
          lastError = error
          continue
        }
        throw error
      } finally {
        clearTimeout(deadline)
        if (options.signal !== undefined) options.signal.removeEventListener('abort', onAbort)
      }
    }

    throw lastError ?? new LlmError(`${PKG}: every configured account failed`, 'AUTH')
  }

  shouldFailover(error) {
    if (!(error instanceof LlmError)) return false
    return FAILOVER_CODES.has(error.code)
  }

  buildBody(options, model, config, messages) {
    const body = {
      model: options.model,
      messages,
      stream: true,
    }
    const maxTokens = options.maxTokens ?? outputCap(model, config)
    if (Number.isFinite(maxTokens) && maxTokens > 0) {
      body.max_tokens = Math.min(Math.floor(maxTokens), model.maxTokens ?? maxTokens)
    }
    if (Number.isFinite(options.temperature)) body.temperature = options.temperature
    if (Array.isArray(options.stop) && options.stop.length > 0) body.stop = options.stop
    if (Array.isArray(options.tools) && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }))
      body.tool_choice = 'auto'
    }
    const effort = options.reasoningEffort
    if (typeof effort === 'string' && model.reasoning !== undefined) {
      const supported = model.reasoning.efforts.some((entry) => entry.id === effort)
      if (supported) body.reasoning_effort = effort
    }
    return body
  }

  async toMessages(messages, config) {
    const out = []
    for (const message of messages) {
      if (message.role === 'system' || message.role === 'developer') {
        out.push({ role: 'system', content: this.textOf(message.content) })
        continue
      }
      if (message.role === 'user') {
        out.push({ role: 'user', content: await this.userContent(message.content, config) })
        continue
      }
      if (message.role === 'assistant') {
        out.push(this.assistantMessage(message))
        continue
      }
      if (message.role === 'tool') {
        out.push({
          role: 'tool',
          tool_call_id: message.toolCallId,
          content: this.textOf(message.content),
        })
      }
    }
    return out
  }

  textOf(blocks) {
    return (blocks ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
  }

  async userContent(blocks, config) {
    const parts = []
    for (const block of blocks ?? []) {
      if (block.type === 'text') {
        parts.push({ type: 'text', text: block.text })
      } else if (block.type === 'image') {
        const url = await this.imageURL(block)
        if (url !== undefined) parts.push({ type: 'image_url', image_url: { url } })
        else parts.push({ type: 'text', text: '[image omitted: attachment service unavailable]' })
      } else if (block.type === 'file') {
        parts.push({ type: 'text', text: `[file: ${block.attachment?.name ?? 'attachment'}]` })
      }
    }
    if (parts.length === 1 && parts[0].type === 'text') return parts[0].text
    return parts
  }

  assistantMessage(message) {
    const reasoning = (message.content ?? [])
      .filter((block) => block.type === 'reasoning')
      .map((block) => block.text)
      .join('')
    const text = this.textOf(message.content)
    const toolCalls = (message.content ?? [])
      .filter((block) => block.type === 'tool-call')
      .map((block) => ({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: block.arguments },
      }))
    const content = []
    if (reasoning !== '') content.push({ type: 'thinking', thinking: [{ type: 'text', text: reasoning }] })
    if (text !== '') content.push({ type: 'text', text })
    const result = { role: 'assistant', content: content.length === 0 ? '' : content }
    if (toolCalls.length > 0) result.tool_calls = toolCalls
    return result
  }

  async imageURL(block) {
    const attachments = this.ctx.get('attachments')
    if (attachments === undefined) return undefined
    try {
      const stored = await attachments.readImage(block.attachment)
      const mediaType = stored.ref?.mediaType ?? block.attachment?.mediaType ?? 'image/png'
      const base64 = Buffer.from(stored.data).toString('base64')
      return `data:${mediaType};base64,${base64}`
    } catch {
      return undefined
    }
  }

  async *streamWithAccount({ options, config, model, body, account, apiKey, controller, state }) {
    const headers = {
      ...attributionHeaders(),
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      accept: 'text/event-stream',
    }
    let response
    try {
      response = await fetch(`${account.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        ...(await this.dispatcher(config)),
      })
    } catch (error) {
      if (options.signal?.aborted === true) throw options.signal.reason
      if (controller.signal.aborted) {
        throw new LlmError(`${PKG}: request to ${account.baseURL} timed out`, 'TIMEOUT', { cause: error })
      }
      throw new LlmError(`${PKG}: transport failure reaching ${account.baseURL}: ${errorMessage(error)}`, 'TRANSPORT', {
        cause: error,
      })
    }

    if (!response.ok) {
      const text = await safeText(response)
      const failure = classifyHttpFailure(response.status, text, response.headers.get('x-request-id') ?? undefined)
      throw failure
    }

    const reader = response.body?.getReader()
    if (reader === undefined) {
      throw new LlmError(`${PKG}: provider returned an empty response body`, 'EMPTY_RESPONSE', { status: response.status })
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let reasoning = ''
    let text = ''
    let reasoningIndex = -1
    let textIndex = -1
    const toolBlocks = new Map()
    const toolState = new Map()
    let nextIndex = 0
    let finishReason
    let usage
    let idleTimer

    const armIdle = () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => controller.abort(new Error('stream idle timeout')), config.advanced.streamIdleTimeoutMs)
    }

    try {
      armIdle()
      let finished = false
      for (;;) {
        if (finished) break
        let chunk
        try {
          chunk = await reader.read()
        } catch (error) {
          if (options.signal?.aborted === true) throw options.signal.reason
          if (controller.signal.aborted) {
            throw new LlmError(`${PKG}: stream from ${account.baseURL} stalled`, 'TIMEOUT', { cause: error })
          }
          throw new LlmError(`${PKG}: stream from ${account.baseURL} failed: ${errorMessage(error)}`, 'TRANSPORT', {
            cause: error,
          })
        }
        if (chunk.done) break
        armIdle()
        buffer += decoder.decode(chunk.value, { stream: true })

        let newline
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          if (line === '' || line.startsWith(':')) continue
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            buffer = ''
            finished = true
            break
          }
          let json
          try {
            json = JSON.parse(payload)
          } catch {
            continue
          }
          const events = this.handleChunk(json, {
            onReasoning: (delta) => {
              if (reasoningIndex < 0) {
                reasoningIndex = nextIndex++
              }
              reasoning += delta
              state.emitted = true
              return [{ type: 'block-start', index: reasoningIndex, blockType: 'reasoning' }, { type: 'reasoning-delta', index: reasoningIndex, text: delta }]
            },
            onText: (delta) => {
              if (textIndex < 0) {
                textIndex = nextIndex++
              }
              text += delta
              state.emitted = true
              return [{ type: 'block-start', index: textIndex, blockType: 'text' }, { type: 'text-delta', index: textIndex, text: delta }]
            },
            onTool: (delta) => {
              let blockIndex = toolBlocks.get(delta.toolIndex)
              const events = []
              if (blockIndex === undefined) {
                blockIndex = nextIndex++
                toolBlocks.set(delta.toolIndex, blockIndex)
                toolState.set(delta.toolIndex, { id: delta.id, name: delta.name, arguments: '' })
                events.push({ type: 'block-start', index: blockIndex, blockType: 'tool-call' })
              }
              const state = toolState.get(delta.toolIndex)
              if (delta.id !== undefined) state.id = delta.id
              if (delta.name !== undefined) state.name = delta.name
              state.arguments += delta.argumentsDelta
              state.emitted = true
              events.push({
                type: 'tool-call-delta',
                index: blockIndex,
                id: state.id,
                name: delta.name,
                argumentsDelta: delta.argumentsDelta,
              })
              return events
            },
            onFinish: (reason) => {
              finishReason = reason
              return []
            },
            onUsage: (value) => {
              usage = value
              return []
            },
          })
          for (const event of events) yield event
        }
      }
    } finally {
      if (idleTimer !== undefined) clearTimeout(idleTimer)
      try {
        await reader.cancel()
      } catch {
        // The reader is already closed or cancelled; nothing to release.
      }
    }

    if (!state.emitted && (reasoning === '' && text === '' && toolState.size === 0)) {
      throw new LlmError(`${PKG}: provider completed without producing any content`, 'EMPTY_RESPONSE')
    }

    for (const [toolIndex, blockIndex] of toolBlocks) {
      const state = toolState.get(toolIndex)
      yield {
        type: 'block-end',
        index: blockIndex,
        block: { type: 'tool-call', id: state.id ?? `call-${blockIndex}`, name: state.name ?? '', arguments: state.arguments },
      }
    }
    if (textIndex >= 0) yield { type: 'block-end', index: textIndex, block: { type: 'text', text } }
    if (reasoningIndex >= 0) yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoning } }
    if (usage !== undefined) yield { type: 'usage', usage }
    const kind = toolState.size > 0 ? 'tool-calls' : finishReason === 'length' ? 'max-tokens' : 'stop'
    yield { type: 'finish', reason: { kind } }
  }

  /** Translate one OpenAI-compatible SSE payload into adapter events. */
  handleChunk(json, sink) {
    if (json?.usage !== null && typeof json?.usage === 'object') {
      sink.onUsage({
        inputTokens: numberOrZero(json.usage.prompt_tokens),
        outputTokens: numberOrZero(json.usage.completion_tokens),
        totalTokens: numberOrZero(json.usage.total_tokens),
        cacheReadTokens: numberOrZero(json.usage.prompt_tokens_details?.cached_tokens),
      })
    }
    const choice = Array.isArray(json?.choices) ? json.choices[0] : undefined
    if (choice === undefined) return []
    const delta = choice.delta ?? {}
    const events = []

    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content !== '') {
      events.push(...sink.onReasoning(delta.reasoning_content))
    }
    if (typeof delta.reasoning === 'string' && delta.reasoning !== '') {
      events.push(...sink.onReasoning(delta.reasoning))
    }

    const content = delta.content
    if (typeof content === 'string' && content !== '') {
      events.push(...sink.onText(content))
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === 'text' && typeof part.text === 'string' && part.text !== '') {
          events.push(...sink.onText(part.text))
        } else if (part?.type === 'thinking') {
          for (const inner of part.thinking ?? []) {
            if (typeof inner?.text === 'string' && inner.text !== '') events.push(...sink.onReasoning(inner.text))
          }
        }
      }
    }

    if (Array.isArray(delta.tool_calls)) {
      for (const call of delta.tool_calls) {
        events.push(
          ...sink.onTool({
            toolIndex: Number.isInteger(call.index) ? call.index : 0,
            id: typeof call.id === 'string' ? call.id : undefined,
            name: typeof call.function?.name === 'string' ? call.function.name : undefined,
            argumentsDelta: typeof call.function?.arguments === 'string' ? call.function.arguments : '',
          }),
        )
      }
    }

    if (choice.finish_reason !== null && choice.finish_reason !== undefined) {
      sink.onFinish(choice.finish_reason)
    }
    return events
  }

  async dispatcher(config) {
    if (config.advanced.proxy === '') return {}
    try {
      const { ProxyAgent } = await import('undici')
      return { dispatcher: new ProxyAgent(config.advanced.proxy) }
    } catch (error) {
      throw new LlmError(`${PKG}: proxy "${config.advanced.proxy}" cannot be used: ${errorMessage(error)}`, 'TRANSPORT', {
        cause: error,
      })
    }
  }
}

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function safeText(response) {
  try {
    const text = await response.text()
    return text.length > MAX_ERROR_BODY ? `${text.slice(0, MAX_ERROR_BODY)}…` : text
  } catch {
    return ''
  }
}

/** Map an HTTP failure onto the provider-neutral failure taxonomy. */
export function classifyHttpFailure(status, body, requestId) {
  const detail = `${status} ${body}`
  const options = { status, ...(requestId === undefined ? {} : { requestId }) }
  if (status === 401 || status === 403) {
    return new LlmError(`${PKG}: authentication failed (${status}): ${body.slice(0, 300)}`, 'AUTH', options)
  }
  if (status === 429) {
    const code = isQuotaExceededError(detail) ? 'QUOTA' : 'RATE_LIMIT'
    return new LlmError(`${PKG}: rate limited or out of quota (${status}): ${body.slice(0, 300)}`, code, options)
  }
  if (isContextWindowExceededError(detail)) {
    return new LlmError(`${PKG}: request exceeds the model context window: ${body.slice(0, 300)}`, 'CONTEXT_WINDOW_EXCEEDED', options)
  }
  if (isQuotaExceededError(detail)) {
    return new LlmError(`${PKG}: account quota exhausted: ${body.slice(0, 300)}`, 'QUOTA', options)
  }
  if (status >= 500) {
    return new LlmError(`${PKG}: provider server error (${status}): ${body.slice(0, 300)}`, 'SERVER', options)
  }
  return new LlmError(`${PKG}: request rejected (${status}): ${body.slice(0, 300)}`, 'INVALID_REQUEST', options)
}
