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

const product = (overrides: Partial<AvailableRewardsRequest['products'][number]> = {}): AvailableRewardsRequest['products'][number] => ({
  originalId: 'P001',
  lineId: 'line-P001',
  title: 'Camiseta Básica',
  quantity: 1,
  productPrice: 100,
  productDiscountPrice: null,
  isActive: true,
  ...overrides,
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
  it('mantém desconto sem produto visível, mas bloqueado pelo /available', () => {
    expect(buildMockReward(reward(), request([]))).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.ProductRewardNoApplicableProduct,
      externalProductId: 'P001',
    })
  })

  it('usa o preço promocional e respeita cumulatividade e benefício real', () => {
    const promotional = product({ productPrice: 100, productDiscountPrice: 80 })
    expect(buildMockReward(reward(), request([promotional])).canUse).toBe(true)
    expect(buildMockReward(reward({ rewardCanBeCumulative: false }), request([promotional]))).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.ProductRewardNoApplicableProduct,
    })
    expect(buildMockReward(reward({ productDiscountMode: ProductDiscountMode.FixedFinalPrice, productDiscountValue: 90 }), request([promotional]))).toMatchObject({
      canUse: false,
      cannotUseReason: CannotUseReason.ProductRewardNoApplicableProduct,
    })
  })

  it('mantém FreeGift disponível sem produto correspondente no carrinho', () => {
    expect(buildMockReward(reward({ externalProductId: 'P009', productDiscountMode: ProductDiscountMode.FreeGift, productDiscountValue: 0 }), request([]))).toMatchObject({
      canUse: true,
      cannotUseReason: CannotUseReason.CanUse,
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
