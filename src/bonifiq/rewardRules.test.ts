import { describe, expect, it } from 'vitest'
import { calculateProductRewardDiscountCents, calculateProductRewardUnitPriceCents, calculateRewardDiscountCents, shouldRunCustomerChallenge } from './rewardRules'
import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableReward } from './types'

const productReward = (mode: ProductDiscountMode, value: number): AvailableReward => ({ id: 1, title: 'Produto', rewardType: RewardType.ProductDiscount, value: 0, points: 0, canUse: true, cannotUseReason: CannotUseReason.CanUse, rewardCanBeCumulative: true, isCashback: false, canSelectValue: false, availableCashback: 0, maxCashbackForCurrentPurchase: 0, productDiscountMode: mode, productDiscountValue: value })

describe('regras monetárias de recompensa', () => {
  it('calcula descontos comuns em centavos', () => {
    const percent = { ...productReward(ProductDiscountMode.PercentDiscount, 0), rewardType: RewardType.PercentDiscount, value: 15 }
    expect(calculateRewardDiscountCents(percent, 0, 10000)).toBe(1500)
    const cashback = { ...percent, rewardType: RewardType.Cashback, isCashback: true }
    expect(calculateRewardDiscountCents(cashback, 2300, 10000)).toBe(2300)
  })

  it.each([
    [ProductDiscountMode.PercentDiscount, 20, 8000],
    [ProductDiscountMode.FixedFinalPrice, 60, 6000],
    [ProductDiscountMode.FreeGift, 0, 0],
    [ProductDiscountMode.FixedDiscountAmount, 15, 8500],
  ])('calcula localmente o preço final no modo %s', (mode, value, expected) => {
    expect(calculateProductRewardUnitPriceCents(productReward(mode, value), 10000)).toBe(expected)
  })

  it('usa o preço promocional efetivo e expõe o desconto local em centavos', () => {
    const reward = productReward(ProductDiscountMode.PercentDiscount, 20)
    expect(calculateProductRewardUnitPriceCents(reward, 8000)).toBe(6400)
    expect(calculateProductRewardDiscountCents(reward, 8000)).toBe(1600)
  })

  it('exige challenge também para validação de cadastro', () => {
    expect(shouldRunCustomerChallenge({ shouldValidateCustomer: false, shouldValidateCustomerSignup: true })).toBe(true)
    expect(shouldRunCustomerChallenge({ shouldValidateCustomer: false, shouldValidateCustomerSignup: false })).toBe(false)
  })
})
