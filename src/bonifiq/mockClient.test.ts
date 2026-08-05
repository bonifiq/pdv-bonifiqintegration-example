import { beforeEach, describe, expect, it } from 'vitest'
import { buildMockReward, createMockBonifiqClient } from './mockClient'
import { mockRewardsData, type MockRewardConfig } from './mockFixtures'
import { setActiveScenario } from './scenarios'
import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableRewardsRequest } from './types'

const request = (products: AvailableRewardsRequest['products']): AvailableRewardsRequest => ({
  customerId: '12345678900',
  purchaseValue: 100,
  discountValue: 0,
  products,
})

const reward = (overrides: Partial<MockRewardConfig> = {}): MockRewardConfig => ({
  id: 99,
  title: 'Desconto no produto',
  rewardType: RewardType.ProductDiscount,
  points: 0,
  minPurchase: 0,
  rewardCanBeCumulative: true,
  externalProductId: 'P001',
  productDiscountMode: ProductDiscountMode.PercentDiscount,
  productDiscountValue: 20,
  productAvailableQuantity: 10,
  ...overrides,
})

beforeEach(() => setActiveScenario('standard'))

describe('mock do contrato POS de ProductDiscount', () => {
  it('ignora os produtos do carrinho na disponibilidade offline', () => {
    expect(buildMockReward(reward(), request([]))).toMatchObject({
      canUse: true,
      cannotUseReason: CannotUseReason.CanUse,
      externalProductId: 'P001',
    })
    expect(buildMockReward(reward({ productDiscountMode: ProductDiscountMode.FixedFinalPrice, productDiscountValue: 90 }), request([{
      originalId: 'OUTRO-SKU', lineId: 'line-1', title: 'Outro', quantity: 1,
      productPrice: 50, productDiscountPrice: 40, isActive: true,
    }]))).toMatchObject({
      canUse: true,
      cannotUseReason: CannotUseReason.CanUse,
    })
  })

  it('continua respeitando desconto manual e cumulatividade da recompensa', () => {
    expect(buildMockReward(reward({ rewardCanBeCumulative: false }), { ...request([]), discountValue: 10 })).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.CannotUseCumulativeDiscount,
    })
  })

  it('mantém FreeGift disponível sem produto correspondente no carrinho', () => {
    expect(buildMockReward(reward({ externalProductId: 'P009', productDiscountMode: ProductDiscountMode.FreeGift, productDiscountValue: 0 }), request([]))).toMatchObject({
      canUse: true,
      cannotUseReason: CannotUseReason.CanUse,
    })
  })

  it('bloqueia somente configuração offline inválida ou sem disponibilidade', () => {
    expect(buildMockReward(reward({ externalProductId: undefined }), request([]))).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.ProductRewardInvalidConfiguration,
    })
    expect(buildMockReward(reward({ productAvailableQuantity: 0 }), request([]))).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.ProductRewardUsageLimitReached,
    })
  })

  it('resgata ProductDiscount pelo método padrão, retorna o SKU offline e preserva idempotência', async () => {
    const client = createMockBonifiqClient()
    const redeemRequest = { rewardId: mockRewardsData[6].id, customerId: '12345678900', originalKey: 'MOCK-PRODUCT-KEY' }
    const first = await client.redeemReward(redeemRequest)
    const retry = await client.redeemReward(redeemRequest)

    expect(first.ok && first.data).toMatchObject({ externalProductId: 'P001', originalKey: 'MOCK-PRODUCT-KEY' })
    expect(retry).toEqual(first)
    if (first.ok) expect(first.data).not.toHaveProperty('productDiscountTotal')
  })
})
