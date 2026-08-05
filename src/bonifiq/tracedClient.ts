import { traceOperation } from './trace'
import type { BonifiqClient } from './types'
import {
  buildAvailableRewardsBody,
  buildCancelOrderBody,
  buildChallengeBody,
  buildChallengeValidationBody,
  buildOrderBody,
  buildPartialCancelBody,
  buildRedeemBody,
} from './wirePayloads'
import {
  buildAvailableRewardsResponse,
  buildChallengeResponse,
  buildChallengeValidationResponse,
  buildOrderCancellationResponse,
  buildOrderResponse,
  buildRedeemResponse,
  buildRewardCancellationResponse,
  buildSuccessEnvelope,
} from './wireResponses'

export interface TraceCallContext {
  reason: string
}

type MethodWithTraceContext<T> = T extends (...args: infer Arguments) => infer Result
  ? (...args: [...Arguments, context: TraceCallContext]) => Result
  : never

export type TracedBonifiqClient = {
  [Method in keyof BonifiqClient]: MethodWithTraceContext<BonifiqClient[Method]>
}

export function withIntegrationTrace(client: BonifiqClient): TracedBonifiqClient {
  return {
    getAvailableRewards: (request, context) => traceOperation({ operation: 'Consultar benefícios', method: 'POST', endpoint: '/POS/rewards/available', reason: context.reason, persists: ['customer', 'shouldValidateCustomer', 'shouldValidateCustomerSignup', 'canUse', 'cannotUseReason', 'externalProductId', 'productDiscountMode', 'productDiscountValue'], request: buildAvailableRewardsBody(request), formatResponse: buildAvailableRewardsResponse }, () => client.getAvailableRewards(request)),
    sendChallenge: (request, context) => traceOperation({ operation: 'Criar challenge', method: 'POST', endpoint: `/POS/customers/${encodeURIComponent(request.customerId)}/challenge`, reason: context.reason, persists: ['transactionId'], request: buildChallengeBody(request), formatResponse: buildChallengeResponse }, () => client.sendChallenge(request)),
    validateChallenge: (request, context) => traceOperation({ operation: 'Validar challenge', method: 'POST', endpoint: `/POS/customers/${encodeURIComponent(request.customerId)}/challengevalidate`, reason: context.reason, persists: ['transactionId'], request: buildChallengeValidationBody(request), formatResponse: buildChallengeValidationResponse }, () => client.validateChallenge(request)),
    redeemReward: (request, context) => traceOperation({ operation: 'Resgatar recompensa', method: 'POST', endpoint: `/POS/rewards/${request.rewardId}/redeem`, reason: context.reason, persists: ['originalKey', 'rewardId', 'externalCode', 'externalProductId'], request: buildRedeemBody(request), formatResponse: response => buildSuccessEnvelope(buildRedeemResponse(response)) }, () => client.redeemReward(request)),
    cancelReward: (rewardId, context) => traceOperation({ operation: 'Estornar recompensa', method: 'DELETE', endpoint: `/POS/rewards/${rewardId}`, reason: context.reason, request: null, formatResponse: response => buildSuccessEnvelope(buildRewardCancellationResponse(response)) }, () => client.cancelReward(rewardId)),
    createOrder: (request, context) => traceOperation({ operation: 'Registrar pedido', method: 'POST', endpoint: '/POS/orders', reason: context.reason, persists: ['originalId'], request: buildOrderBody(request), formatResponse: response => buildSuccessEnvelope(buildOrderResponse(response)) }, () => client.createOrder(request)),
    cancelOrder: (orderId, cancelledDate, orderStatus, context) => traceOperation({ operation: 'Cancelar pedido', method: 'POST', endpoint: `/POS/orders/${encodeURIComponent(orderId)}/cancel`, reason: context.reason, request: buildCancelOrderBody(cancelledDate, orderStatus), formatResponse: response => buildSuccessEnvelope(buildOrderCancellationResponse(response)) }, () => client.cancelOrder(orderId, cancelledDate, orderStatus)),
    partialCancelOrder: (orderId, request, context) => traceOperation({ operation: 'Cancelar parcialmente', method: 'POST', endpoint: `/POS/${encodeURIComponent(orderId)}/partialcancel`, reason: context.reason, persists: ['cancelKey'], request: buildPartialCancelBody(request), formatResponse: response => buildSuccessEnvelope(buildOrderCancellationResponse(response)) }, () => client.partialCancelOrder(orderId, request)),
  }
}
