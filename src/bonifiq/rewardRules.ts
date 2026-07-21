import { fromCents, toCents } from '../pdv/money'
import type { MoneyCents } from '../pdv/types'
import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableReward, type AvailableRewardsResponse, type RedeemResponse } from './types'

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

export function calculateProductRewardUnitPriceCents(reward: AvailableReward, redeem: RedeemResponse, originalUnitPriceCents: MoneyCents, quantity = 1): MoneyCents {
  if (isFreeGift(reward)) return 0
  const unitDiscountCents = Math.round(toCents(redeem.productDiscountTotal) / Math.max(1, quantity))
  return Math.max(0, originalUnitPriceCents - unitDiscountCents)
}

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
  [CannotUseReason.ProductRewardNoApplicableProduct]: 'Produto elegível ausente no carrinho',
  [CannotUseReason.ProductRewardUsageLimitReached]: 'Limite de uso atingido',
  [CannotUseReason.ProductRewardRequiresCheckout]: 'Disponível apenas no checkout online',
  [CannotUseReason.ProductRewardInvalidConfiguration]: 'Configuração de produto inválida',
}

export const getCannotUseReason = (reward: AvailableReward): string => (
  unavailableReasons[reward.cannotUseReason] || reward.requirements || 'Requisitos não atendidos'
)
