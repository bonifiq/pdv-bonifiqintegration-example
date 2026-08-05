import { beforeEach, describe, expect, it } from 'vitest'
import { createMockBonifiqClient } from './mockClient'
import { clearIntegrationTrace, sanitizeTraceValue, subscribeToIntegrationTrace, traceAsCurl, traceLocalEvent, traceOperation, type IntegrationTraceEvent } from './trace'
import { withIntegrationTrace } from './tracedClient'

beforeEach(clearIntegrationTrace)

describe('inspetor de integração', () => {
  it('preserva dados da demo e remove apenas credenciais', () => {
    expect(sanitizeTraceValue({ CustomerId: '12345678900', Document: '12345678900', OriginalId: 'P009', Email: 'dev@exemplo.com', Authorization: 'Basic secret', ApiPassword: 'secret' })).toEqual({
      CustomerId: '12345678900',
      Document: '12345678900',
      OriginalId: 'P009',
      Email: 'dev@exemplo.com',
      Authorization: '<removido>',
      ApiPassword: '<removido>',
    })
  })

  it('gera cURL somente com placeholder de autenticação', () => {
    const curl = traceAsCurl({ id: '1', timestamp: '', kind: 'api', operation: 'Teste', method: 'POST', endpoint: '/POS/orders', reason: '', persists: [], request: { OrderTotal: 10, CustomerName: "D'Ávila" }, response: {}, durationMs: 1, ok: true }, 'https://api.example.test/v1/pvt/')
    expect(curl).toContain("--url 'https://api.example.test/v1/pvt/POS/orders'")
    expect(curl).toContain('Authorization: Basic <CREDENCIAL_BASE64>')
    expect(curl).toContain('"OrderTotal": 10')
    expect(curl).toContain("D'\\''Ávila")
    expect(curl).not.toContain('\n+')
    expect(curl).not.toMatch(/Authorization: Basic [A-Za-z0-9+/]{8}/)
  })

  it('não adiciona body ao cURL de DELETE', () => {
    const curl = traceAsCurl({ id: '2', timestamp: '', kind: 'api', operation: 'Estorno', method: 'DELETE', endpoint: '/POS/rewards/123', reason: '', persists: [], request: null, response: {}, durationMs: 1, ok: true })
    expect(curl).toContain("--url '<BONIFIQ_BASE_URL>/POS/rewards/123'")
    expect(curl).not.toContain('--data')
  })

  it('mantém o motivo apenas no trace, sem alterar body ou cURL', async () => {
    let events: IntegrationTraceEvent[] = []
    const unsubscribe = subscribeToIntegrationTrace(updated => { events = updated })
    const client = withIntegrationTrace(createMockBonifiqClient())
    const reason = 'Desconto manual alterado; revalidar elegibilidade e limites.'

    await client.getAvailableRewards({
      customerId: '12345678900',
      purchaseValue: 100,
      discountValue: 20,
      products: [],
    }, { reason })

    expect(events[0].reason).toBe(reason)
    expect(JSON.stringify(events[0].request)).not.toContain(reason)
    expect(traceAsCurl(events[0])).not.toContain(reason)
    unsubscribe()
  })

  it('registra abandono do resgate como evento local', () => {
    let events: IntegrationTraceEvent[] = []
    const unsubscribe = subscribeToIntegrationTrace(updated => { events = updated })

    traceLocalEvent({
      operation: 'Resgate abandonado',
      reason: 'Nenhum estorno foi necessário.',
      context: { rewardConfigurationId: 5 },
      result: { rewardCancellationRequired: false },
    })

    expect(events[0]).toMatchObject({
      kind: 'local',
      method: 'LOCAL',
      operation: 'Resgate abandonado',
      request: { rewardConfigurationId: 5 },
      response: { rewardCancellationRequired: false },
    })
    unsubscribe()
  })

  it('preserva o casing exato da resposta HTTP bruta', async () => {
    let events: IntegrationTraceEvent[] = []
    const unsubscribe = subscribeToIntegrationTrace(updated => { events = updated })

    await traceOperation({
      operation: 'Challenge', method: 'POST', endpoint: '/challenge', reason: '', request: {},
      formatResponse: () => ({ SentBySMS: false }),
    }, async () => ({
      ok: true,
      data: { sentBySms: true },
      wireResponse: { Success: true, SentBySMS: true, Result: { CurrentTier: { IconUrl: 'tier.png' }, isCanceled: false } },
    }))

    expect(events[0].response).toEqual({ Success: true, SentBySMS: true, Result: { CurrentTier: { IconUrl: 'tier.png' }, isCanceled: false } })
    unsubscribe()
  })
})
