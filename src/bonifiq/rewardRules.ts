import { fromCents, toCents } from '../pdv/money'
import type { MoneyCents } from '../pdv/types'
import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableReward, type AvailableRewardsResponse } from './types'

export const isProductReward = (reward?: AvailableReward | null): boolean => reward?.rewardType === RewardType.ProductDiscount
export const isFreeGift = (reward?: AvailableReward | null): boolean => isProductReward(reward) && reward?.productDiscountMode === ProductDiscountMode.FreeGift
export const shouldRunCustomerChallenge = (response?: Pick<AvailableRewardsResponse, 'shouldValidateCustomer' | 'shouldValidateCustomerSignup'> | null): boolean => Boolean(
  response?.shouldValidateCustomer || response?.shouldValidateCustomerSignup,
)

export function calculateRewardDiscountCents(reward: AvailableReward | null, cashbackCents: MoneyCents, purchaseCents: MoneyCents): MoneyCents {
  if (!reward || isProductReward(reward)) return 0
  if (reward.isCashback) return Math.min(cashbackCents, purchaseCents)
  if (reward.rewardType === RewardType.PercentDiscount) return Math.min(purchaseCents, Math.round(purchaseCents * reward.value / 100))
  return Math.min(purchaseCents, toCents(reward.value))
}

export function calculateProductRewardUnitPriceCents(reward: AvailableReward, effectiveUnitPriceCents: MoneyCents): MoneyCents {
  const basePriceCents = Math.max(0, Math.round(effectiveUnitPriceCents))
  const configuredValue = Number(reward.productDiscountValue || 0)

  switch (reward.productDiscountMode) {
    case ProductDiscountMode.PercentDiscount: {
      const percent = Math.max(0, Math.min(100, configuredValue))
      return Math.max(0, basePriceCents - Math.round(basePriceCents * percent / 100))
    }
    case ProductDiscountMode.FixedFinalPrice:
      return Math.min(basePriceCents, Math.max(0, toCents(configuredValue)))
    case ProductDiscountMode.FreeGift:
      return 0
    case ProductDiscountMode.FixedDiscountAmount:
      return Math.max(0, basePriceCents - Math.max(0, toCents(configuredValue)))
    default:
      return basePriceCents
  }
}

export const calculateProductRewardDiscountCents = (reward: AvailableReward, effectiveUnitPriceCents: MoneyCents): MoneyCents => (
  Math.max(0, effectiveUnitPriceCents - calculateProductRewardUnitPriceCents(reward, effectiveUnitPriceCents))
)

export function getProductRewardDescription(reward: AvailableReward): string {
  const value = Number(reward.productDiscountValue || 0)
  switch (reward.productDiscountMode) {
    case ProductDiscountMode.PercentDiscount: return `${value}% de desconto`
    case ProductDiscountMode.FixedFinalPrice: return `Preço final ${fromCents(toCents(value)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    case ProductDiscountMode.FreeGift: return 'Grátis'
    case ProductDiscountMode.FixedDiscountAmount: return `${fromCents(toCents(value)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto`
    default: return 'Benefício no produto'
  }
}

const unavailableReasons: Record<CannotUseReason, string> = {
  [CannotUseReason.CanUse]: '',
  [CannotUseReason.NotEnoughPoints]: 'Pontos insuficientes',
  [CannotUseReason.MinimumValueNotReached]: 'Valor mínimo não atingido',
  [CannotUseReason.CashbackNotAvailable]: 'Sem saldo de cashback',
  [CannotUseReason.NoCustomer]: 'Cliente não encontrado',
  [CannotUseReason.RewardValueExceedsPurchase]: 'Benefício maior que a compra',
  [CannotUseReason.MinimumPurchasePercentNotReached]: 'Percentual mínimo não atingido',
  [CannotUseReason.CustomerNotEnrolled]: 'Cliente não inscrito no programa',
  [CannotUseReason.CannotUseCumulativeDiscount]: 'Não cumulativo com outro desconto',
  [CannotUseReason.ProductRewardNoApplicableProduct]: 'Produto elegível ausente, em promoção não cumulativa ou sem benefício aplicável',
  [CannotUseReason.ProductRewardUsageLimitReached]: 'Limite de uso atingido',
  [CannotUseReason.ProductRewardRequiresCheckout]: 'Disponível apenas no checkout online',
  [CannotUseReason.ProductRewardInvalidConfiguration]: 'Configuração de produto inválida',
}

export const getCannotUseReason = (reward: AvailableReward): string => (
  unavailableReasons[reward.cannotUseReason] || reward.requirements || 'Requisitos não atendidos'
)
