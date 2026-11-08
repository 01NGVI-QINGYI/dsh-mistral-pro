/**
 * Model catalog for dsh-mistral-pro.
 *
 * A curated snapshot of Mistral's serverless lineup (2026-11) supplies the
 * facts the model selector needs before any network call: context window,
 * output cap, input modalities and the exact `reasoning_effort` ladder each
 * model accepts. Live discovery from `GET /v1/models` adds ids this snapshot
 * does not know; overrides from the plugin configuration win over both.
 */
import { PROVIDER_ID } from './config.js'

const TEXT = ['text']
const TEXT_IMAGE = ['text', 'image']

function efforts(...ids) {
  const names = {
    none: 'Off',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    max: 'Max',
  }
  return ids.map((id) => ({ id, name: names[id] ?? id }))
}

/**
 * Built-in entries. `visible: false` keeps a model out of the selector until a
 * user override turns it on; `deprecated` entries stay addressable by id.
 */
export const BUILTIN_MODELS = [
  {
    id: 'mistral-large-4',
    name: 'Mistral Large 4',
    description: 'Flagship multimodal model, 1M context, adjustable reasoning.',
    contextWindow: 1000000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('low', 'medium', 'high'),
    defaultReasoning: 'high',
  },
  {
    id: 'mistral-large-4-0',
    name: 'Mistral Large 4 (26.10)',
    description: 'Dated id of Mistral Large 4.',
    contextWindow: 1000000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('low', 'medium', 'high'),
    defaultReasoning: 'high',
    visible: false,
  },
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large (latest)',
    description: 'Alias that follows the current Mistral Large release.',
    contextWindow: 1000000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('low', 'medium', 'high'),
    defaultReasoning: 'high',
    visible: false,
  },
  {
    id: 'mistral-small-2603',
    name: 'Mistral Small 4',
    description: 'Hybrid instruct/reasoning/coding model with a 256K context.',
    contextWindow: 256000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'medium', 'high'),
    defaultReasoning: 'none',
  },
  {
    id: 'mistral-small-4-0',
    name: 'Mistral Small 4 (26.03)',
    description: 'Dated id of Mistral Small 4.',
    contextWindow: 256000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'medium', 'high'),
    defaultReasoning: 'none',
    visible: false,
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small (latest)',
    description: 'Alias that follows the current Mistral Small release.',
    contextWindow: 256000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'medium', 'high'),
    defaultReasoning: 'none',
    visible: false,
  },
  {
    id: 'mistral-medium-3-5',
    name: 'Mistral Medium 3.5',
    description: 'Balanced model with adjustable reasoning; retires 2027-04-30.',
    contextWindow: 131072,
    maxTokens: 65536,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'medium', 'high'),
    defaultReasoning: 'none',
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium (latest)',
    description: 'Alias that follows the current Mistral Medium release.',
    contextWindow: 131072,
    maxTokens: 65536,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'medium', 'high'),
    defaultReasoning: 'none',
    visible: false,
  },
  {
    id: 'zai-glm-5-3',
    name: 'Z.ai GLM 5.3',
    description: 'Third-party 1M-context text model with low/high/max reasoning.',
    contextWindow: 1000000,
    maxTokens: 131072,
    input: TEXT,
    reasoning: efforts('low', 'high', 'max'),
    defaultReasoning: 'high',
  },
  {
    id: 'zai-glm-5-3-flash',
    name: 'Z.ai GLM 5.3 Flash',
    description: 'Agentic multimodal GLM with a 1M context and low/high/max reasoning.',
    contextWindow: 1000000,
    maxTokens: 131072,
    input: TEXT_IMAGE,
    reasoning: efforts('low', 'high', 'max'),
    defaultReasoning: 'high',
  },
  {
    id: 'deepseek-v4-flash-1017',
    name: 'DeepSeek V4.1 Flash 1017',
    description: 'Third-party long-context coding model served by Mistral.',
    contextWindow: 1000000,
    maxTokens: 128000,
    input: TEXT_IMAGE,
    reasoning: efforts('none', 'low', 'high', 'max'),
    defaultReasoning: 'high',
  },
  {
    id: 'ministral-3-14b-25-12',
    name: 'Ministral 3 14B',
    description: 'Efficient text and vision model.',
    contextWindow: 256000,
    maxTokens: 131072,
    input: TEXT_IMAGE,
    reasoning: [],
  },
  {
    id: 'ministral-3-8b-25-12',
    name: 'Ministral 3 8B',
    description: 'Small text and vision model.',
    contextWindow: 256000,
    maxTokens: 131072,
    input: TEXT_IMAGE,
    reasoning: [],
  },
  {
    id: 'ministral-3-3b-25-12',
    name: 'Ministral 3 3B',
    description: 'Tiny text and vision model.',
    contextWindow: 256000,
    maxTokens: 131072,
    input: TEXT_IMAGE,
    reasoning: [],
  },
  {
    id: 'codestral-25-08',
    name: 'Codestral',
    description: 'Code completion and generation model.',
    contextWindow: 256000,
    maxTokens: 65536,
    input: TEXT,
    reasoning: [],
  },
  {
    id: 'codestral-latest',
    name: 'Codestral (latest)',
    description: 'Alias that follows the current Codestral release.',
    contextWindow: 256000,
    maxTokens: 65536,
    input: TEXT,
    reasoning: [],
  },
  {
    id: 'mistral-large-2512',
    name: 'Mistral Large 3',
    description: 'Previous-generation flagship; retires 2027-04-30.',
    contextWindow: 262144,
    maxTokens: 65536,
    input: TEXT_IMAGE,
    reasoning: [],
    visible: false,
    deprecated: true,
  },
  {
    id: 'devstral-2512',
    name: 'Devstral 2',
    description: 'Previous-generation coding model; retires 2026-07-31.',
    contextWindow: 262144,
    maxTokens: 65536,
    input: TEXT,
    reasoning: [],
    visible: false,
    deprecated: true,
  },
  {
    id: 'mistral-medium-2508',
    name: 'Mistral Medium 3.1',
    description: 'Previous-generation medium model; retires 2026-08-31.',
    contextWindow: 131072,
    maxTokens: 65536,
    input: TEXT_IMAGE,
    reasoning: [],
    visible: false,
    deprecated: true,
  },
]

const BUILTIN_BY_ID = new Map(BUILTIN_MODELS.map((model) => [model.id, model]))

/** Live listing ids that correspond to a built-in snapshot entry. */
const LIVE_TO_BUILTIN = {
  'deepseek-v4-1-flash-1017': 'deepseek-v4-flash-1017',
  'mistral-medium-latest': 'mistral-medium-3-5',
  'ministral-14b-2512': 'ministral-3-14b-25-12',
  'ministral-8b-2512': 'ministral-3-8b-25-12',
  'ministral-3b-2512': 'ministral-3-3b-25-12',
  'codestral-2508': 'codestral-25-08',
  'mistral-large-4': 'mistral-large-4',
  'mistral-small-2603': 'mistral-small-2603',
  'zai-glm-5-3': 'zai-glm-5-3',
  'zai-glm-5-3-flash': 'zai-glm-5-3-flash',
  'mistral-large-2512': 'mistral-large-2512',
}

function builtinFor(id) {
  return BUILTIN_BY_ID.get(id) ?? BUILTIN_BY_ID.get(LIVE_TO_BUILTIN[id])
}

/** Generic facts for an id discovered live but absent from the snapshot. */
function genericModel(id, listing) {
  return {
    id,
    name: listing?.name ?? id,
    description: 'Discovered from the provider model listing.',
    contextWindow: listing?.contextWindow ?? 131072,
    maxTokens: 32768,
    input: listing?.vision ? TEXT_IMAGE : TEXT,
    reasoning: [],
  }
}

function applyOverride(model, override) {
  if (override === undefined) return model
  return {
    ...model,
    contextWindow: override.contextWindow ?? model.contextWindow,
    maxTokens: override.maxTokens ?? model.maxTokens,
    defaultReasoning: override.reasoningEffort ?? model.defaultReasoning,
  }
}

/**
 * Build one entry per distinct live model. The listing repeats aliases as
 * separate ids that share a display name; the canonical id is the one whose id
 * equals the name, otherwise the first entry in the group.
 */
function catalogFromListing(config, listing) {
  const groups = new Map()
  for (const model of listing) {
    const key = String(model.name ?? model.id).toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(model)
  }
  const entries = []
  for (const group of groups.values()) {
    const canonical = group.find((model) => model.id === model.name) ?? group[0]
    const meta = builtinFor(canonical.id)
    const base = meta ?? genericModel(canonical.id, canonical)
    const entry = {
      ...base,
      id: canonical.id,
      name: meta?.name ?? canonical.name ?? canonical.id,
      description: meta?.description ?? base.description,
      contextWindow: canonical.contextWindow ?? base.contextWindow,
      input: canonical.vision ? TEXT_IMAGE : base.input,
    }
    entries.push(applyOverride(entry, config.models[canonical.id] ?? (meta ? config.models[meta.id] : undefined)))
  }
  return entries
}

/**
 * Resolve the complete catalog for one configuration snapshot.
 * @param config - normalized plugin configuration.
 * @param discovered - live listing entries, if any.
 * @returns ordered entries with overrides applied.
 */
export function resolveCatalog(config, discovered) {
  if (Array.isArray(discovered) && discovered.length > 0) return catalogFromListing(config, discovered)
  return BUILTIN_MODELS.map((model) => applyOverride(model, config.models[model.id]))
}

/** Visibility decision: override wins, then the built-in default. */
export function isVisible(model, config) {
  const override = config.models[model.id]
  if (override !== undefined && override.visible === false) return false
  if (override !== undefined && override.visible === true) return true
  return model.visible !== false
}

/**
 * Model entries the selector may offer.
 * @param config - normalized plugin configuration.
 * @param discovered - live listing entries, if any.
 */
export function listModels(config, discovered) {
  return resolveCatalog(config, discovered)
    .filter((model) => isVisible(model, config))
    .map((model) => ({
      provider: PROVIDER_ID,
      id: model.id,
      name: model.name,
      description: model.description,
      inputModalities: model.input,
    }))
}

/**
 * Exact metadata for one model id.
 * @param id - model id named by a request.
 * @param config - normalized plugin configuration.
 * @param discovered - live listing entries, if any.
 */
export function resolveModelInfo(id, config, discovered) {
  const listing = Array.isArray(discovered)
    ? discovered.find((model) => model.id === id) ?? discovered.find((model) => (model.aliases ?? []).includes(id))
    : undefined
  const meta = builtinFor(listing?.id ?? id)
  const base = meta ?? (listing ? genericModel(listing.id, listing) : genericModel(id))
  const model = applyOverride(base, config.models[id] ?? config.models[listing?.id])
  const info = {
    provider: PROVIDER_ID,
    id,
    name: model.name,
    description: model.description,
    inputModalities: model.input,
    context: { contextWindow: model.contextWindow },
    defaultMaxTokens: Math.min(model.maxTokens, config.advanced.maxTokensCap),
  }
  if (model.reasoning.length > 0) {
    info.reasoning = {
      efforts: model.reasoning,
      defaultEffort: model.defaultReasoning ?? model.reasoning[0].id,
    }
  }
  return info
}

/** Default output cap for one model, honoring the configured ceiling. */
export function outputCap(model, config) {
  const declared = model.maxTokens ?? 32768
  return Math.min(declared, config.advanced.maxTokensCap)
}

export { BUILTIN_BY_ID }
