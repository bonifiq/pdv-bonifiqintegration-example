import { mockCustomerPoints, mockCustomers, mockRewardsData } from './mockFixtures'
import { getActiveScenario } from './scenarios'
import {
  CannotUseReason,
  ProductDiscountMode,
  RewardType,
  type ApiResult,
  type AvailableReward,
  type AvailableRewardsRequest,
  type BonifiqClient,
  type RewardCancellationResponse,
  type RedeemResponse,
} from './types'

const delay = (milliseconds = 250): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds))
const pendingChallenges = new Map<string, string>()
const completedRedeems = new Map<string, RedeemResponse>()
const failedRedeemAttempts = new Set<string>()

const success = <T>(data: T): ApiResult<T> => ({ ok: true, data })
const failure = <T>(code: string, friendlyMessage: string, retryable = true): ApiResult<T> => ({
  ok: false,
  wireResponse: {
    ErrorMessage: friendlyMessage,
    ErrorCode: null,
    Result: null,
    Code: code,
    CodeName: code,
    Severity: 2,
    HasWarning: false,
    HasError: true,
  },
  error: { code, message: friendlyMessage, friendlyMessage, retryable },
})

const customerPoints = mockCustomerPoints
const customers = mockCustomers
const rewardsData = mockRewardsData

export function buildMockReward(reward: typeof rewardsData[number], request: AvailableRewardsRequest): AvailableReward {
  const balance = customerPoints[request.customerId]
  const meetsMinimum = request.purchaseValue >= reward.minPurchase
  const enoughPoints = balance.points >= reward.points
  const cumulative = reward.rewardCanBeCumulative ?? true
  let canUse = meetsMinimum && enoughPoints && (request.discountValue <= 0 || cumulative)
  let reason = CannotUseReason.CanUse
  let availableCashback = 0
  let maxCashbackForCurrentPurchase = 0

  if (!enoughPoints) reason = CannotUseReason.NotEnoughPoints
  else if (!meetsMinimum) reason = CannotUseReason.MinimumValueNotReached
  else if (request.discountValue > 0 && !cumulative) reason = CannotUseReason.CannotUseCumulativeDiscount

  if (reward.rewardType === RewardType.Cashback) {
    availableCashback = balance.cashback
    maxCashbackForCurrentPurchase = Math.min(balance.cashback, request.purchaseValue * ((reward.maxCashbackPercent || 100) / 100))
    canUse = maxCashbackForCurrentPurchase >= 1 && meetsMinimum
    if (!canUse) reason = balance.cashback <= 0 ? CannotUseReason.CashbackNotAvailable : CannotUseReason.MinimumValueNotReached
  }

  const scenario = getActiveScenario()
  const externalProductId = scenario === 'product-missing' && reward.id === 5 ? 'SKU-INEXISTENTE' : reward.externalProductId
  if (reward.rewardType === RewardType.ProductDiscount && canUse) {
    if (!externalProductId) {
      canUse = false
      reason = CannotUseReason.ProductRewardInvalidConfiguration
    } else if (Number(reward.productAvailableQuantity ?? 1) <= 0) {
      canUse = false
      reason = CannotUseReason.ProductRewardUsageLimitReached
    } else if (reward.productDiscountMode !== ProductDiscountMode.FreeGift) {
      const configuredValue = Number(reward.productDiscountValue || 0)
      const applicableProduct = request.products.find(product => {
        if (!product.isActive || product.quantity < 1 || product.originalId.toLowerCase() !== externalProductId.toLowerCase()) return false
        const effectivePrice = Number(product.productDiscountPrice ?? product.productPrice ?? 0)
        const hasPromotion = product.productDiscountPrice !== null
          && product.productDiscountPrice !== undefined
          && product.productDiscountPrice < product.productPrice
        if (hasPromotion && !cumulative) return false
        switch (reward.productDiscountMode) {
          case ProductDiscountMode.PercentDiscount: return configuredValue > 0 && configuredValue <= 100 && effectivePrice > 0
          case ProductDiscountMode.FixedFinalPrice: return configuredValue >= 0 && configuredValue < effectivePrice
          case ProductDiscountMode.FixedDiscountAmount: return configuredValue > 0 && effectivePrice > 0
          default: return false
        }
      })
      if (!applicableProduct) {
        canUse = false
        reason = CannotUseReason.ProductRewardNoApplicableProduct
      }
    }
  }
  const title = reward.title
    || (reward.rewardType === RewardType.PercentDiscount
      ? `${reward.value}% de desconto`
      : reward.rewardType === RewardType.FixedValueDiscount
        ? `R$${Number(reward.value || 0).toFixed(2).replace('.', ',')} de desconto`
        : 'Usar Cashback')

  return {
    id: reward.id,
    title,
    rewardType: reward.rewardType,
    value: Number(reward.value || 0),
    points: reward.rewardType === RewardType.Cashback ? Math.round(maxCashbackForCurrentPurchase) : reward.points,
    canUse,
    cannotUseReason: reason,
    requirements: reward.minPurchase > 0 ? `Válido para compras acima de R$${reward.minPurchase.toFixed(2).replace('.', ',')}` : '',
    rewardCanBeCumulative: cumulative,
    isCashback: reward.rewardType === RewardType.Cashback,
    canSelectValue: reward.rewardType === RewardType.Cashback,
    availableCashback,
    maxCashbackForCurrentPurchase,
    externalProductId,
    productDisplayName: reward.productDisplayName,
    productDiscountMode: reward.productDiscountMode,
    productDiscountValue: reward.productDiscountValue,
    productMaxUnitsPerRedeem: reward.productMaxUnitsPerRedeem,
    productAvailableQuantity: reward.productAvailableQuantity,
  }
}

export function createMockBonifiqClient(): BonifiqClient {
  return {
    async getAvailableRewards(request) {
      await delay()
      const customer = customers[request.customerId]
      const balance = customerPoints[request.customerId]
      if (!customer || !balance) return success({ rewards: [], availablePoints: 0, canUseReward: false, hasRewards: false, cashbackEnabled: false, availableCashback: 0, maxCashbackForCurrentPurchase: 0, shouldValidateCustomer: false, shouldValidateCustomerSignup: false })
      if (getActiveScenario() === 'no-rewards') return success({ customer, rewards: [], availablePoints: balance.points, canUseReward: false, hasRewards: false, cashbackEnabled: false, availableCashback: balance.cashback, maxCashbackForCurrentPurchase: 0, shouldValidateCustomer: false, shouldValidateCustomerSignup: false })

      const rewards = Object.values(rewardsData).map(reward => buildMockReward(reward, request))
      const cashback = rewards.find(reward => reward.isCashback)
      return success({
        customer,
        rewards,
        availablePoints: balance.points,
        canUseReward: rewards.some(reward => reward.canUse),
        hasRewards: rewards.length > 0,
        cashbackEnabled: Boolean(cashback),
        availableCashback: balance.cashback,
        maxCashbackForCurrentPurchase: cashback?.maxCashbackForCurrentPurchase || 0,
        shouldValidateCustomer: getActiveScenario() !== 'no-validation',
        shouldValidateCustomerSignup: false,
      })
    },
    async sendChallenge(request) {
      await delay()
      if (!customers[request.customerId]) return failure('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', false)
      const code = Math.random().toString().slice(2, 6).padEnd(4, '0')
      pendingChallenges.set(`${request.customerId}-${request.transactionId}`, code)
      return success({ transactionId: request.transactionId, success: true, deliverySucceeded: true, code, sentBySms: true, sentByEmail: false, shouldInformPhone: false, shouldInformEmail: false })
    },
    async validateChallenge(request) {
      await delay(150)
      const key = `${request.customerId}-${request.transactionId}`
      if (pendingChallenges.get(key) !== request.code) return failure('CHALLENGE_INVALID', 'Código inválido. Tente novamente.')
      pendingChallenges.delete(key)
      return success({ transactionId: request.transactionId, success: true })
    },
    async redeemReward(request) {
      await delay()
      if (completedRedeems.has(request.originalKey)) return success(completedRedeems.get(request.originalKey)!)
      if (getActiveScenario() === 'redeem-failure' && !failedRedeemAttempts.has(request.originalKey)) {
        failedRedeemAttempts.add(request.originalKey)
        return failure('DEMO_REDEEM_FAILURE', 'Falha simulada. Tente novamente para comprovar a idempotência.')
      }
      const reward = rewardsData[request.rewardId]
      if (!reward || !customers[request.customerId]) return failure('REWARD_NOT_FOUND', 'Cliente ou recompensa não encontrada.', false)
      if (reward.rewardType === RewardType.ProductDiscount && (!reward.externalProductId || Number(reward.productAvailableQuantity ?? 1) <= 0)) {
        return failure('PRODUCT_REWARD_INVALID', 'A recompensa não possui um produto offline ativo e disponível.', false)
      }
      const result: RedeemResponse = {
        rewardId: 1000 + Math.floor(Math.random() * 9000),
        externalCode: `BNF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        originalKey: request.originalKey,
        externalProductId: reward.rewardType === RewardType.ProductDiscount ? reward.externalProductId : null,
        point: { pointId: 2000 + Math.floor(Math.random() * 9000), quantity: -reward.points },
      }
      completedRedeems.set(request.originalKey, result)
      return success(result)
    },
    async cancelReward(rewardId) {
      await delay()
      const entry = [...completedRedeems.entries()].find(([, redeem]) => redeem.rewardId === rewardId)
      if (!entry) return failure('REWARD_NOT_FOUND', 'Recompensa não encontrada.', false)
      completedRedeems.delete(entry[0])
      return success<RewardCancellationResponse>({ id: rewardId, externalCode: entry[1].externalCode, isCanceled: true, redeemDate: new Date().toISOString() })
    },
    async createOrder(request) {
      await delay()
      const estimatedCashback = Number((request.orderTotal * 0.1).toFixed(2))
      return success({
        originalId: request.originalId,
        orderTotal: request.orderTotal,
        coupon: request.coupon,
        estimatedBonus: {
          generateBonus: true,
          estimatedPoints: Math.floor(request.orderTotal),
          estimatedCashback,
          estimatedCashbackFormatted: estimatedCashback.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        },
      })
    },
    async cancelOrder(_orderId, cancelledDate) {
      await delay()
      return success({ isCanceled: true, updatedAt: cancelledDate })
    },
    async partialCancelOrder(orderId, request) {
      await delay()
      if (request.valueToRefund <= 0) return failure('INVALID_REFUND', 'O valor do cancelamento deve ser maior que zero.', false)
      const productTotal = request.products?.reduce((total, product) => total + product.valueToRefund, 0)
      if (productTotal !== undefined && Math.round(productTotal * 100) !== Math.round(request.valueToRefund * 100)) {
        return failure('PRODUCT_REFUND_TOTAL_MISMATCH', 'A soma dos produtos deve ser igual ao valor do cancelamento.', false)
      }
      return success({ isCanceled: false, orderId, valueToRefund: request.valueToRefund, cancelKey: request.cancelKey, updatedAt: new Date().toISOString() })
    },
  }
}
