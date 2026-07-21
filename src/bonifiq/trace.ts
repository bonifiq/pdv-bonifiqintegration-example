import type { ApiResult } from './types'

export interface IntegrationTraceEvent {
  id: string
  timestamp: string
  kind: 'api' | 'local'
  operation: string
  method: string
  endpoint: string
  reason: string
  persists: string[]
  request: unknown
  response: unknown
  durationMs: number
  ok: boolean
}

type Listener = (events: IntegrationTraceEvent[]) => void

let events: IntegrationTraceEvent[] = []
const listeners = new Set<Listener>()

const sensitiveKeys = new Set(['authorization', 'password', 'apipassword', 'apiusername'])

export function sanitizeTraceValue(value: unknown, key = ''): unknown {
  const normalizedKey = key.toLowerCase()
  if (sensitiveKeys.has(normalizedKey)) return '<removido>'
  if (Array.isArray(value)) return value.map(item => sanitizeTraceValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => (
      [entryKey, sanitizeTraceValue(entryValue, entryKey)]
    )))
  }
  return value
}

function publish(event: IntegrationTraceEvent): void {
  events = [event, ...events].slice(0, 50)
  listeners.forEach(listener => listener(events))
}

export function subscribeToIntegrationTrace(listener: Listener): () => void {
  listeners.add(listener)
  listener(events)
  return () => listeners.delete(listener)
}

export function clearIntegrationTrace(): void {
  events = []
  listeners.forEach(listener => listener(events))
}

export function traceLocalEvent(metadata: {
  operation: string
  reason: string
  context?: unknown
  result?: unknown
}): void {
  publish({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    kind: 'local',
    operation: metadata.operation,
    method: 'LOCAL',
    endpoint: '',
    reason: metadata.reason,
    persists: [],
    request: sanitizeTraceValue(metadata.context || {}),
    response: sanitizeTraceValue(metadata.result || {}),
    durationMs: 0,
    ok: true,
  })
}

export async function traceOperation<T>(metadata: {
  operation: string
  method: string
  endpoint: string
  reason: string
  persists?: string[]
  request: unknown
  formatResponse?: (response: T) => unknown
}, execute: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  const startedAt = performance.now()
  const result = await execute()
  publish({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    kind: 'api',
    operation: metadata.operation,
    method: metadata.method,
    endpoint: metadata.endpoint,
    reason: metadata.reason,
    persists: metadata.persists || [],
    request: sanitizeTraceValue(metadata.request),
    response: sanitizeTraceValue(result.wireResponse ?? (result.ok ? metadata.formatResponse?.(result.data) ?? result.data : result.error)),
    durationMs: Math.round(performance.now() - startedAt),
    ok: result.ok,
  })
  return result
}

export function traceAsCurl(event: IntegrationTraceEvent, apiBaseUrl = '<BONIFIQ_BASE_URL>'): string {
  const baseUrl = apiBaseUrl.replace(/\/$/, '')
  const serializedRequest = event.request === null
    ? null
    : JSON.stringify(event.request, null, 2).replace(/'/g, "'\\''")
  const body = event.method === 'GET' || event.method === 'DELETE' || event.request === null
    ? ''
    : ` \\\n  --data '${serializedRequest}'`

  return `curl --request ${event.method} \\\n  --url '${baseUrl}${event.endpoint}' \\\n  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \\\n  --header 'Content-Type: application/json'${body}`
}
