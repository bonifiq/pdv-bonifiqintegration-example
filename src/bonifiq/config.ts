export type BonifiqMode = 'mock' | 'api'

export interface BonifiqConfig {
  mode: BonifiqMode
  apiBaseUrl: string
  username: string
  password: string
  configurationError?: string
}

export function readBonifiqConfig(): BonifiqConfig {
  const mode = import.meta.env.VITE_BONIFIQ_MODE === 'api' ? 'api' : 'mock'
  const apiBaseUrl = String(import.meta.env.VITE_BONIFIQ_API_BASE_URL || 'https://api.bonifiq.com.br/v1/pvt').replace(/\/$/, '')
  const username = String(import.meta.env.VITE_BONIFIQ_API_USERNAME || '')
  const password = String(import.meta.env.VITE_BONIFIQ_API_PASSWORD || '')
  const configurationError = mode === 'api' && (!apiBaseUrl || !username || !password)
    ? 'Modo API exige VITE_BONIFIQ_API_BASE_URL, VITE_BONIFIQ_API_USERNAME e VITE_BONIFIQ_API_PASSWORD no .env.local.'
    : undefined

  return { mode, apiBaseUrl, username, password, configurationError }
}

export const bonifiqConfig = readBonifiqConfig()
