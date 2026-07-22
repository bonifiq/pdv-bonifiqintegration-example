import type { BonifiqConfig } from './config'
import {
  CannotUseReason,
  RewardType,
  type ApiResult,
  type AvailableReward,
  type AvailableRewardsResponse,
  type BonifiqClient,
  type BonifiqError,
  type ChallengeResponse,
  type ChallengeValidationResponse,
  type OrderCancellationResponse,
  type OrderResponse,
  type RedeemResponse,
  type RewardCancellationResponse,
} from './types'
import {
  buildAvailableRewardsBody,
  buildCancelOrderBody,
  buildChallengeBody,
  buildChallengeValidationBody,
  buildOrderBody,
  buildPartialCancelBody,
  buildProductRedeemBody,
  buildRedeemBody,
} from './wirePayloads'

export { pascalizeKeys } from './wirePayloads'

const camelize = (key: string): string => key.charAt(0).toLowerCase() + key.slice(1)

export function normalizeKeys<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(item => normalizeKeys(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => (
      [camelize(key), normalizeKeys(item)]
    ))) as T
  }
  return value as T
}

type ErrorResultOptions = Partial<BonifiqError> & { wireResponse?: unknown }

const errorResult = <T>(message: string, options: ErrorResultOptions = {}): ApiResult<T> => ({
  ok: false,
  httpStatus: options.httpStatus,
  wireResponse: options.wireResponse,
  error: {
    code: options.code || 'BONIFIQ_ERROR',
    message,
    friendlyMessage: options.friendlyMessage || message,
    httpStatus: options.httpStatus,
    retryable: options.retryable ?? true,
    details: options.details,
  },
})

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

function unwrapBody<T>(body: unknown, httpStatus: number, map: (value: unknown) => T): ApiResult<T> {
  const normalized = normalizeKeys<Record<string, unknown>>(body)
  const responseCode = normalized.codeName ?? normalized.code ?? normalized.errorCode
  if (normalized.hasError === true || normalized.severity === 2 || httpStatus >= 400) {
    return errorResult(String(normalized.errorMessage || normalized.friendlyErrorMessage || 'A BonifiQ recusou a operação.'), {
      code: String(responseCode ?? 'BONIFIQ_BUSINESS_ERROR'),
      httpStatus,
      retryable: httpStatus >= 500,
      details: normalized,
      wireResponse: body,
    })
  }

  const hasResult = Object.prototype.hasOwnProperty.call(normalized, 'result')
  if (hasResult && (normalized.result === null || normalized.result === undefined)) {
    return errorResult(String(normalized.errorMessage || normalized.codeName || 'A BonifiQ não retornou o resultado da operação.'), {
      code: String(responseCode ?? 'BONIFIQ_EMPTY_RESULT'),
      httpStatus,
      retryable: false,
      details: normalized,
      wireResponse: body,
    })
  }

  const data = hasResult ? normalized.result : Object.prototype.hasOwnProperty.call(normalized, 'data') ? normalized.data : normalized
  return { ok: true, data: map(data), httpStatus, wireResponse: body }
}

const optionalString = (value: unknown): string | null => value === null || value === undefined ? null : String(value)

const mapCustomer = (value: unknown): AvailableRewardsResponse['customer'] => {
  if (value === null || value === undefined) return null
  const customer = asRecord(value)
  const tier = customer.currentTier === null || customer.currentTier === undefined ? null : asRecord(customer.currentTier)
  return {
    id: Number(customer.id),
    originalId: String(customer.originalId || ''),
    name: String(customer.name || ''),
    email: optionalString(customer.email),
    phone: optionalString(customer.phone),
    document: optionalString(customer.document),
    isEnrolled: Boolean(customer.isEnrolled),
    currentTier: tier ? {
      name: String(tier.name || ''),
      color: optionalString(tier.color),
      iconUrl: optionalString(tier.iconUrl),
    } : null,
  }
}

export function mapAvailableRewards(value: unknown): AvailableRewardsResponse {
  const body = asRecord(normalizeKeys(value))
  const rewards = Array.isArray(body.rewards) ? body.rewards : []
  const mappedRewards: AvailableReward[] = rewards.map(item => {
    const reward = asRecord(item)
    return {
      id: Number(reward.id),
      title: String(reward.title || 'Recompensa'),
      rewardType: Number(reward.rewardType) as RewardType,
      value: Number(reward.value || 0),
      points: Number(reward.points || 0),
      canUse: Boolean(reward.canUse),
      cannotUseReason: Number(reward.cannotUseReason || 0) as CannotUseReason,
      requirements: reward.requirements ? String(reward.requirements) : null,
      rewardCanBeCumulative: reward.rewardCanBeCumulative !== false,
      isCashback: Boolean(reward.isCashback) || Number(reward.rewardType) === RewardType.Cashback,
      canSelectValue: Boolean(reward.canSelectValue) || Number(reward.rewardType) === RewardType.Cashback,
      availableCashback: Number(reward.availableCashback || 0),
      maxCashbackForCurrentPurchase: Number(reward.maxCashbackForCurrentPurchase || 0),
      externalProductId: reward.externalProductId ? String(reward.externalProductId) : null,
      productDisplayName: reward.productDisplayName ? String(reward.productDisplayName) : null,
      productDiscountMode: reward.productDiscountMode === null || reward.productDiscountMode === undefined
        ? null
        : Number(reward.productDiscountMode),
      productDiscountValue: reward.productDiscountValue === null || reward.productDiscountValue === undefined
        ? null
        : Number(reward.productDiscountValue),
      productMaxUnitsPerRedeem: reward.productMaxUnitsPerRedeem === null || reward.productMaxUnitsPerRedeem === undefined
        ? null
        : Number(reward.productMaxUnitsPerRedeem),
      productAvailableQuantity: reward.productAvailableQuantity === null || reward.productAvailableQuantity === undefined
        ? null
        : Number(reward.productAvailableQuantity),
      productDiscountTotal: Number(reward.productDiscountTotal || 0),
    }
  })

  return {
    customer: mapCustomer(body.customer),
    rewards: mappedRewards,
    availablePoints: Number(body.availablePoints || 0),
    canUseReward: body.canUseReward === undefined ? mappedRewards.some(reward => reward.canUse) : Boolean(body.canUseReward),
    hasRewards: body.hasRewards === undefined ? mappedRewards.length > 0 : Boolean(body.hasRewards),
    cashbackEnabled: Boolean(body.cashbackEnabled),
    availableCashback: Number(body.availableCashback || 0),
    maxCashbackForCurrentPurchase: Number(body.maxCashbackForCurrentPurchase || 0),
    shouldValidateCustomer: Boolean(body.shouldValidateCustomer),
    shouldValidateCustomerSignup: Boolean(body.shouldValidateCustomerSignup),
    hasRestrictedItems: Boolean(body.hasRestrictedItems),
    restrictedValue: Number(body.restrictedValue || 0),
    eligibleValue: Number(body.eligibleValue || 0),
  }
}

export function mapRedeemResponse(value: unknown): RedeemResponse {
  const body = asRecord(normalizeKeys(value))
  const point = body.point === null || body.point === undefined ? null : asRecord(body.point)
  return {
    rewardId: Number(body.rewardId),
    externalCode: String(body.externalCode || ''),
    originalKey: String(body.originalKey || ''),
    externalProductId: optionalString(body.externalProductId),
    productDiscountTotal: Number(body.productDiscountTotal || 0),
    coupon: body.coupon ?? null,
    point: point ? {
      pointId: Number(point.pointId),
      quantity: Number(point.quantity),
      metadatas: Array.isArray(point.metadatas) ? point.metadatas : null,
    } : null,
  }
}

export function mapRewardCancellationResponse(value: unknown): RewardCancellationResponse {
  const body = asRecord(normalizeKeys(value))
  const points = body.points === null || body.points === undefined ? null : asRecord(body.points)
  return {
    id: Number(body.id),
    customer: body.customer === null || body.customer === undefined ? undefined : asRecord(body.customer),
    externalCode: String(body.externalCode || ''),
    cashValue: body.cashValue === null || body.cashValue === undefined ? null : Number(body.cashValue),
    isCanceled: Boolean(body.isCanceled),
    redeemDate: String(body.redeemDate || ''),
    points: points ? {
      id: Number(points.id),
      points: Number(points.points),
      type: Number(points.type),
      eventKey: String(points.eventKey || ''),
    } : undefined,
  }
}

export function mapOrderResponse(value: unknown): OrderResponse {
  const body = asRecord(normalizeKeys(value))
  const estimatedBonus = body.estimatedBonus === null || body.estimatedBonus === undefined ? null : asRecord(body.estimatedBonus)
  return {
    id: body.id === null || body.id === undefined ? undefined : Number(body.id),
    originalId: String(body.originalId || ''),
    orderPlacementDate: optionalString(body.orderPlacementDate) || undefined,
    orderCompletedDate: optionalString(body.orderCompletedDate),
    orderCancelledDate: optionalString(body.orderCancelledDate),
    orderStatus: optionalString(body.orderStatus) || undefined,
    isCancelledOrReturned: body.isCancelledOrReturned === undefined ? undefined : Boolean(body.isCancelledOrReturned),
    isCompleted: body.isCompleted === undefined ? undefined : Boolean(body.isCompleted),
    orderTotal: Number(body.orderTotal || 0),
    coupon: optionalString(body.coupon),
    updatedDate: optionalString(body.updatedDate) || undefined,
    state: body.state === null || body.state === undefined ? undefined : Number(body.state),
    origin: body.origin === null || body.origin === undefined ? undefined : Number(body.origin),
    customer: body.customer === null || body.customer === undefined ? undefined : asRecord(body.customer),
    products: Array.isArray(body.products) ? body.products : null,
    branch: body.branch === null || body.branch === undefined ? null : asRecord(body.branch),
    tenantSalesman: body.tenantSalesman === null || body.tenantSalesman === undefined ? null : asRecord(body.tenantSalesman),
    metadatas: Array.isArray(body.metadatas) ? body.metadatas : null,
    externalCoupon: optionalString(body.externalCoupon),
    estimatedBonus: estimatedBonus ? {
      generateBonus: Boolean(estimatedBonus.generateBonus),
      estimatedPoints: Number(estimatedBonus.estimatedPoints || 0),
      estimatedCashback: Number(estimatedBonus.estimatedCashback || 0),
      estimatedCashbackFormatted: String(estimatedBonus.estimatedCashbackFormatted || ''),
    } : undefined,
  }
}

export function mapOrderCancellationResponse(value: unknown): OrderCancellationResponse {
  const body = asRecord(normalizeKeys(value))
  const details = body.refundErrorDetails === null || body.refundErrorDetails === undefined ? null : asRecord(body.refundErrorDetails)
  return {
    isCanceled: Boolean(body.isCanceled),
    updatedAt: optionalString(body.updatedAt) || undefined,
    status: body.status === null || body.status === undefined ? undefined : Number(body.status),
    refundErrorDetails: details ? {
      code: String(details.code || ''),
      message: String(details.message || ''),
      field: optionalString(details.field),
      productOriginalId: optionalString(details.productOriginalId),
      expectedValue: details.expectedValue === null || details.expectedValue === undefined ? null : Number(details.expectedValue),
      actualValue: details.actualValue === null || details.actualValue === undefined ? null : Number(details.actualValue),
    } : null,
  }
}

export function createHttpBonifiqClient(config: BonifiqConfig): BonifiqClient {
  const auth = `Basic ${btoa(`${config.username}:${config.password}`)}`

  const request = async (path: string, method: string, body?: unknown): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const responseBody = await response.json().catch(() => ({}))
    return { status: response.status, body: responseBody }
  }

  const safely = async <T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> => {
    try {
      return await operation()
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Falha de comunicação com a BonifiQ.', {
        code: 'BONIFIQ_NETWORK_ERROR',
        retryable: true,
        details: error,
      })
    }
  }

  return {
    getAvailableRewards: requestData => safely(async () => {
      const response = await request('/POS/rewards/available', 'POST', buildAvailableRewardsBody(requestData))
      return unwrapBody(response.body, response.status, mapAvailableRewards)
    }),
    sendChallenge: requestData => safely(async () => {
      const response = await request(`/POS/customers/${encodeURIComponent(requestData.customerId)}/challenge`, 'POST', buildChallengeBody(requestData))
      const normalized = normalizeKeys<Record<string, unknown>>(response.body)
      const codeValue = normalized.code ?? normalized.token
      const code = codeValue === null || codeValue === undefined || codeValue === '' ? undefined : String(codeValue)
      const success = Boolean(normalized.success)
      if (response.status >= 400 || (!success && !code)) {
        return errorResult(String(normalized.friendlyErrorMessage || normalized.errorMessage || 'Não foi possível criar o código.'), {
          code: 'CHALLENGE_FAILED', httpStatus: response.status, retryable: response.status >= 500 || response.status < 400, details: normalized, wireResponse: response.body,
        })
      }
      return {
        ok: true,
        httpStatus: response.status,
        wireResponse: response.body,
        data: {
          transactionId: String(normalized.transactionId || requestData.transactionId),
          success,
          deliverySucceeded: success,
          code,
          sentBySms: Boolean(normalized.sentBySMS ?? normalized.sentBySms),
          sentByEmail: Boolean(normalized.sentByEmail),
          shouldInformPhone: Boolean(normalized.shouldInformPhone),
          shouldInformEmail: Boolean(normalized.shouldInformEmail),
          friendlyErrorMessage: optionalString(normalized.friendlyErrorMessage),
          deliveryError: success ? null : String(normalized.friendlyErrorMessage || normalized.errorMessage || ''),
        } satisfies ChallengeResponse,
      }
    }),
    validateChallenge: requestData => safely(async () => {
      const response = await request(`/POS/customers/${encodeURIComponent(requestData.customerId)}/challengevalidate`, 'POST', buildChallengeValidationBody(requestData))
      const normalized = normalizeKeys<Record<string, unknown>>(response.body)
      return response.status < 400 && normalized.success
        ? { ok: true, data: {
            transactionId: String(normalized.transactionId || requestData.transactionId),
            success: true,
            friendlyErrorMessage: optionalString(normalized.friendlyErrorMessage),
          } satisfies ChallengeValidationResponse, httpStatus: response.status, wireResponse: response.body }
        : errorResult(String(normalized.friendlyErrorMessage || normalized.errorMessage || 'Código inválido.'), { code: 'CHALLENGE_INVALID', httpStatus: response.status, retryable: response.status >= 500 || response.status < 400, wireResponse: response.body })
    }),
    redeemReward: requestData => safely(async () => {
      const response = await request(`/POS/rewards/${requestData.rewardId}/redeem`, 'POST', buildRedeemBody(requestData))
      return unwrapBody(response.body, response.status, mapRedeemResponse)
    }),
    redeemProductDiscountReward: requestData => safely(async () => {
      const response = await request(`/RewardConfigurations/${requestData.rewardId}/product-discount/redeem`, 'POST', buildProductRedeemBody(requestData))
      return unwrapBody(response.body, response.status, mapRedeemResponse)
    }),
    cancelReward: rewardId => safely(async () => {
      const response = await request(`/POS/rewards/${rewardId}`, 'DELETE')
      const result = unwrapBody(response.body, response.status, mapRewardCancellationResponse)
      return result.ok && !result.data.isCanceled
        ? errorResult('A BonifiQ não confirmou o estorno da recompensa.', { code: 'REWARD_NOT_CANCELLED', httpStatus: response.status, retryable: false, details: result.data, wireResponse: response.body })
        : result
    }),
    createOrder: requestData => safely(async () => {
      const response = await request('/POS/orders', 'POST', buildOrderBody(requestData))
      return unwrapBody(response.body, response.status, mapOrderResponse)
    }),
    cancelOrder: (orderId, cancelledDate, orderStatus) => safely(async () => {
      const response = await request(`/POS/orders/${encodeURIComponent(orderId)}/cancel`, 'POST', buildCancelOrderBody(cancelledDate, orderStatus))
      const result = unwrapBody(response.body, response.status, mapOrderCancellationResponse)
      return result.ok && !result.data.isCanceled
        ? errorResult('A BonifiQ não confirmou o cancelamento do pedido.', { code: 'ORDER_NOT_CANCELLED', httpStatus: response.status, retryable: false, details: result.data, wireResponse: response.body })
        : result
    }),
    partialCancelOrder: (orderId, requestData) => safely(async () => {
      const response = await request(`/POS/${encodeURIComponent(orderId)}/partialcancel`, 'POST', buildPartialCancelBody(requestData))
      const result = unwrapBody(response.body, response.status, mapOrderCancellationResponse)
      return result.ok && result.data.refundErrorDetails
        ? errorResult(result.data.refundErrorDetails.message, { code: result.data.refundErrorDetails.code, httpStatus: response.status, retryable: false, details: result.data.refundErrorDetails, wireResponse: response.body })
        : result
    }),
  }
}

export function createMissingConfigurationClient(message: string): BonifiqClient {
  const failure = async <T>(): Promise<ApiResult<T>> => errorResult(message, { code: 'BONIFIQ_CONFIGURATION_ERROR', retryable: false })
  return {
    getAvailableRewards: failure,
    sendChallenge: failure,
    validateChallenge: failure,
    redeemReward: failure,
    redeemProductDiscountReward: failure,
    cancelReward: failure,
    createOrder: failure,
    cancelOrder: failure,
    partialCancelOrder: failure,
  }
}
