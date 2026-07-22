import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpBonifiqClient, mapAvailableRewards, normalizeKeys, pascalizeKeys } from './httpClient'

afterEach(() => vi.unstubAllGlobals())

describe('fronteira HTTP', () => {
  it('normaliza chaves somente na fronteira', () => {
    expect(normalizeKeys<{ currentTier: { iconUrl: string } }>({ CurrentTier: { IconUrl: 'x' } })).toEqual({ currentTier: { iconUrl: 'x' } })
    expect(pascalizeKeys({ customer: { originalId: '1' } })).toEqual({ Customer: { OriginalId: '1' } })
  })

  it('mantém CanUse e CannotUseReason retornados pela API', () => {
    const response = mapAvailableRewards({ Rewards: [{ Id: 1, Title: 'R', RewardType: 1, CanUse: false, CannotUseReason: 1 }], AvailablePoints: 0 })
    expect(response.rewards[0]).toMatchObject({ canUse: false, cannotUseReason: 1 })
  })

  it('prioriza Code mesmo quando o envio externo retorna Success=false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ Success: false, ErrorMessage: 'Outside production', Code: '4321', TransactionId: 'T1' }) }))
    const client = createHttpBonifiqClient({ mode: 'api', apiBaseUrl: 'https://example.test/v1/pvt', username: 'user', password: 'pass' })
    const result = await client.sendChallenge({ customerId: '123', transactionId: 'T1' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toMatchObject({ code: '4321', deliverySucceeded: false })
  })

  it('lê corretamente o casing de SentBySMS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ Success: true, SentBySMS: true, SentByEmail: false, TransactionId: 'T1' }) }))
    const client = createHttpBonifiqClient({ mode: 'api', apiBaseUrl: 'https://example.test/v1/pvt', username: 'user', password: 'pass' })
    const result = await client.sendChallenge({ customerId: '123', transactionId: 'T1' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.sentBySms).toBe(true)
  })

  it('usa rota e verbo do contrato nos nove métodos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        Success: true,
        SentBySMS: true,
        Rewards: [],
        Result: { RewardId: 10, Id: 10, ExternalCode: 'EXT', OriginalKey: 'KEY', ProductDiscountTotal: 0, IsCanceled: true, RedeemDate: '2026-07-21T00:00:00.000Z' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpBonifiqClient({ mode: 'api', apiBaseUrl: 'https://example.test/v1/pvt', username: 'user', password: 'pass' })

    await client.getAvailableRewards({ customerId: 'a/b', purchaseValue: 10, discountValue: 0, products: [] })
    await client.sendChallenge({ customerId: 'a/b', transactionId: 'T1' })
    await client.validateChallenge({ customerId: 'a/b', transactionId: 'T1', code: '1234' })
    await client.redeemReward({ rewardId: 1, customerId: 'a/b', originalKey: 'K1' })
    await client.redeemProductDiscountReward({ rewardId: 5, customerId: 'a/b', originalKey: 'K2', product: { externalProductId: 'P1', quantity: 1, productPrice: 10, hasPromotion: false } })
    await client.cancelReward(10)
    await client.createOrder({
      originalId: 'O/1', orderPlacementDate: '2026-07-21T00:00:00.000Z', orderCompletedDate: '2026-07-21T00:00:00.000Z',
      orderStatus: 'Concluído', isCancelledOrReturned: false, isCompleted: true, orderTotal: 10,
      customer: { originalId: 'a/b', name: 'Teste', isEnrolled: true }, products: [], paymentMethods: [],
      branch: { originalId: 'B1', name: 'Loja' }, salesPerson: { originalId: 'S1', name: 'Pessoa' },
    })
    await client.cancelOrder('O/1', '2026-07-21T00:00:00.000Z', 'Cancelado')
    await client.partialCancelOrder('O/1', {
      valueToRefund: 5,
      cancelKey: 'C1',
      products: [{ originalId: 'P1', valueToRefund: 5 }],
      shouldRefundRedeem: false,
    })

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['https://example.test/v1/pvt/POS/rewards/available', 'POST'],
      ['https://example.test/v1/pvt/POS/customers/a%2Fb/challenge', 'POST'],
      ['https://example.test/v1/pvt/POS/customers/a%2Fb/challengevalidate', 'POST'],
      ['https://example.test/v1/pvt/POS/rewards/1/redeem', 'POST'],
      ['https://example.test/v1/pvt/RewardConfigurations/5/product-discount/redeem', 'POST'],
      ['https://example.test/v1/pvt/POS/rewards/10', 'DELETE'],
      ['https://example.test/v1/pvt/POS/orders', 'POST'],
      ['https://example.test/v1/pvt/POS/orders/O%2F1/cancel', 'POST'],
      ['https://example.test/v1/pvt/POS/O%2F1/partialcancel', 'POST'],
    ])
    expect(JSON.parse(String((fetchMock.mock.calls[8][1] as RequestInit).body))).toEqual({
      ValueToRefund: 5,
      CancelKey: 'C1',
      Products: [{ OriginalId: 'P1', ValueToRefund: 5 }],
      ShouldRefundRedeem: false,
    })
  })

  it('mapeia os outputs dos nove métodos conforme o contrato', async () => {
    const responses = [
      {
        Customer: { Id: 1, OriginalId: '123', Name: 'Maria', Email: 'maria@example.test', Phone: null, Document: '123', IsEnrolled: true, CurrentTier: { Name: 'Ouro', Color: '#fff', IconUrl: 'tier.png' } },
        Rewards: [{ Id: 5, Title: 'Brinde', RewardType: 5, Value: 0, CanUse: true, Points: 100, RewardCanBeCumulative: true, ExternalProductId: 'P1', ProductDiscountTotal: 10 }],
        HasRewards: true, ShouldValidateCustomer: true, ShouldValidateCustomerSignup: true, AvailablePoints: 500,
      },
      { Success: true, SentBySMS: true, SentByEmail: false, ShouldInformPhone: false, ShouldInformEmail: true, TransactionId: 'T1', Code: '1234' },
      { Success: true, TransactionId: 'T1', FriendlyErrorMessage: null },
      { Result: { RewardId: 10, ExternalCode: 'EXT-1', OriginalKey: 'K1', Point: { PointId: 20, Quantity: -100, Metadatas: [{ Name: 'origin', Value: 'pdv' }] } } },
      { Result: { RewardId: 11, ExternalCode: 'EXT-2', OriginalKey: 'K2', ExternalProductId: 'P1', ProductDiscountTotal: 10, Point: { PointId: 21, Quantity: -100 } } },
      { Result: { Id: 10, Customer: { OriginalId: '123' }, ExternalCode: 'EXT-1', CashValue: null, IsCanceled: true, RedeemDate: '2026-07-21T00:00:00.000Z', Points: { Id: 30, Points: 100, Type: 1, EventKey: 'K1' } } },
      { Result: { Id: 40, OriginalId: 'O1', OrderTotal: 90, Coupon: 'EXT-2', EstimatedBonus: { GenerateBonus: true, EstimatedPoints: 90, EstimatedCashback: 4.5, EstimatedCashbackFormatted: 'R$ 4,50' } } },
      { Result: { isCanceled: true, UpdatedAt: '2026-07-21T00:00:00.000Z', Status: 3, RefundErrorDetails: null } },
      { Result: { isCanceled: false, UpdatedAt: '2026-07-21T00:00:01.000Z', Status: 2, RefundErrorDetails: { Code: 'VALUE_MISMATCH', Message: 'Valores diferentes', Field: 'ValueToRefund', ExpectedValue: 10, ActualValue: 9 } } },
    ]
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({ status: 200, json: async () => responses.shift() })))
    const client = createHttpBonifiqClient({ mode: 'api', apiBaseUrl: 'https://example.test/v1/pvt', username: 'user', password: 'pass' })

    const available = await client.getAvailableRewards({ customerId: '123', purchaseValue: 100, discountValue: 0, products: [] })
    const challenge = await client.sendChallenge({ customerId: '123', transactionId: 'T1' })
    const validation = await client.validateChallenge({ customerId: '123', transactionId: 'T1', code: '1234' })
    const redeem = await client.redeemReward({ rewardId: 1, customerId: '123', originalKey: 'K1' })
    const productRedeem = await client.redeemProductDiscountReward({ rewardId: 5, customerId: '123', originalKey: 'K2', product: { externalProductId: 'P1', quantity: 1, productPrice: 100, hasPromotion: false } })
    const rewardCancel = await client.cancelReward(10)
    const order = await client.createOrder({
      originalId: 'O1', orderPlacementDate: '2026-07-21T00:00:00.000Z', orderCompletedDate: '2026-07-21T00:00:00.000Z',
      orderStatus: 'Concluído', isCancelledOrReturned: false, isCompleted: true, orderTotal: 90,
      customer: { originalId: '123', name: 'Maria', isEnrolled: true }, products: [], paymentMethods: [],
      branch: { originalId: 'B1', name: 'Loja' }, salesPerson: { originalId: 'S1', name: 'Pessoa' },
    })
    const orderCancel = await client.cancelOrder('O1', '2026-07-21T00:00:00.000Z', 'Cancelado')
    const partialCancel = await client.partialCancelOrder('O1', { valueToRefund: 9, cancelKey: 'C1' })

    expect(available.ok && available.data).toMatchObject({ customer: { id: 1, currentTier: { iconUrl: 'tier.png' } }, shouldValidateCustomerSignup: true, rewards: [{ externalProductId: 'P1' }] })
    expect(challenge.ok && challenge.data).toMatchObject({ success: true, sentBySms: true, shouldInformEmail: true, code: '1234' })
    expect(validation.ok && validation.data).toEqual({ transactionId: 'T1', success: true, friendlyErrorMessage: null })
    expect(redeem.ok && redeem.data).toMatchObject({ rewardId: 10, point: { pointId: 20, quantity: -100, metadatas: [{ name: 'origin', value: 'pdv' }] } })
    expect(productRedeem.ok && productRedeem.data).toMatchObject({ rewardId: 11, externalProductId: 'P1', productDiscountTotal: 10 })
    expect(rewardCancel.ok && rewardCancel.data).toMatchObject({ id: 10, isCanceled: true, points: { id: 30, eventKey: 'K1' } })
    expect(order.ok && order.data).toMatchObject({ id: 40, originalId: 'O1', estimatedBonus: { generateBonus: true, estimatedPoints: 90, estimatedCashback: 4.5 } })
    if (order.ok) expect(order.data).not.toHaveProperty('pointsEarned')
    expect(orderCancel.ok && orderCancel.data).toMatchObject({ isCanceled: true, status: 3, refundErrorDetails: null })
    expect(!partialCancel.ok && partialCancel.error).toMatchObject({ code: 'VALUE_MISMATCH', friendlyMessage: 'Valores diferentes' })
  })

  it('não aceita como sucesso resultado vazio ou cancelamento não confirmado', async () => {
    const responses = [
      { Result: null, Code: '07', CodeName: 'RewardNotFound', Severity: 1, HasWarning: true, HasError: false },
      { Result: { Id: 10, ExternalCode: 'EXT', IsCanceled: false, RedeemDate: '2026-07-21T00:00:00.000Z' }, Severity: 0, HasError: false },
      { Result: { isCanceled: false, UpdatedAt: '2026-07-21T00:00:00.000Z', Status: 1 }, Severity: 0, HasError: false },
      { Result: {}, Severity: 2, HasError: false, Code: '99', ErrorMessage: 'Falha de negócio' },
    ]
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({ status: 200, json: async () => responses.shift() })))
    const client = createHttpBonifiqClient({ mode: 'api', apiBaseUrl: 'https://example.test/v1/pvt', username: 'user', password: 'pass' })

    const emptyRedeem = await client.redeemReward({ rewardId: 1, customerId: '123', originalKey: 'K1' })
    const rewardNotCancelled = await client.cancelReward(10)
    const orderNotCancelled = await client.cancelOrder('O1', '2026-07-21T00:00:00.000Z', 'Cancelado')
    const severityError = await client.createOrder({
      originalId: 'O1', orderPlacementDate: '2026-07-21T00:00:00.000Z', orderCompletedDate: '2026-07-21T00:00:00.000Z',
      orderStatus: 'Concluído', isCancelledOrReturned: false, isCompleted: true, orderTotal: 10,
      customer: { originalId: '123', name: 'Teste', isEnrolled: true }, products: [], paymentMethods: [],
      branch: { originalId: 'B1', name: 'Loja' }, salesPerson: { originalId: 'S1', name: 'Pessoa' },
    })

    expect(!emptyRedeem.ok && emptyRedeem.error.code).toBe('RewardNotFound')
    expect(!rewardNotCancelled.ok && rewardNotCancelled.error.code).toBe('REWARD_NOT_CANCELLED')
    expect(!orderNotCancelled.ok && orderNotCancelled.error.code).toBe('ORDER_NOT_CANCELLED')
    expect(!severityError.ok && severityError.error).toMatchObject({ code: '99', friendlyMessage: 'Falha de negócio' })
  })
})
