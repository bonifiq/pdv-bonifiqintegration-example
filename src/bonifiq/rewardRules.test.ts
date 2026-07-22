import { describe, expect, it } from 'vitest'
import { calculateProductRewardUnitPriceCents, calculateRewardDiscountCents, shouldRunCustomerChallenge } from './rewardRules'
import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableReward, type RedeemResponse } from './types'

const productReward = (mode: ProductDiscountMode, value: number): AvailableReward => ({ id: 1, title: 'Produto', rewardType: RewardType.ProductDiscount, value: 0, points: 0, canUse: true, cannotUseReason: CannotUseReason.CanUse, rewardCanBeCumulative: true, isCashback: false, canSelectValue: false, availableCashback: 0, maxCashbackForCurrentPurchase: 0, productDiscountMode: mode, productDiscountValue: value })
const redeem = (discount: number): RedeemResponse => ({ rewardId: 10, externalCode: 'EXT', originalKey: 'KEY', productDiscountTotal: discount })

describe('regras monetárias de recompensa', () => {
  it('calcula descontos comuns em centavos', () => {
    const percent = { ...productReward(ProductDiscountMode.PercentDiscount, 0), rewardType: RewardType.PercentDiscount, value: 15 }
    expect(calculateRewardDiscountCents(percent, 0, 10000)).toBe(1500)
    const cashback = { ...percent, rewardType: RewardType.Cashback, isCashback: true }
    expect(calculateRewardDiscountCents(cashback, 2300, 10000)).toBe(2300)
  })

  it.each([
    [ProductDiscountMode.PercentDiscount, 20, 2000, 8000],
    [ProductDiscountMode.FixedFinalPrice, 60, 4000, 6000],
    [ProductDiscountMode.FreeGift, 0, 0, 0],
    [ProductDiscountMode.FixedDiscountAmount, 15, 1500, 8500],
  ])('calcula preço final no modo %s', (mode, value, discountCents, expected) => {
    expect(calculateProductRewardUnitPriceCents(productReward(mode, value), redeem(discountCents / 100), 10000)).toBe(expected)
  })

  it('exige challenge também para validação de cadastro', () => {
    expect(shouldRunCustomerChallenge({ shouldValidateCustomer: false, shouldValidateCustomerSignup: true })).toBe(true)
    expect(shouldRunCustomerChallenge({ shouldValidateCustomer: false, shouldValidateCustomerSignup: false })).toBe(false)
  })
})
