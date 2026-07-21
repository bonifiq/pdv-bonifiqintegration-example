import { bonifiqConfig } from './config'
import { createHttpBonifiqClient, createMissingConfigurationClient } from './httpClient'
import { createMockBonifiqClient } from './mockClient'
import { withIntegrationTrace } from './tracedClient'
import type { BonifiqClient } from './types'

function createClient(): BonifiqClient {
  if (bonifiqConfig.configurationError) return createMissingConfigurationClient(bonifiqConfig.configurationError)
  return bonifiqConfig.mode === 'api'
    ? createHttpBonifiqClient(bonifiqConfig)
    : createMockBonifiqClient()
}

export const bonifiqClient = withIntegrationTrace(createClient())
export { bonifiqConfig }
export type { BonifiqClient }
