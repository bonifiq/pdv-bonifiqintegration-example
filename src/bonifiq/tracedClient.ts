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

export function withIntegrationTrace(client: BonifiqClient): BonifiqClient {
  return {
    getAvailableRewards: request => traceOperation({ operation: 'Consultar benefícios', method: 'POST', endpoint: '/POS/rewards/available', reason: 'Reavaliar saldos, produto offline, preço efetivo, promoção e elegibilidade com o carrinho atual.', persists: ['customer', 'shouldValidateCustomer', 'shouldValidateCustomerSignup', 'canUse', 'cannotUseReason', 'externalProductId', 'productDiscountMode', 'productDiscountValue'], request: buildAvailableRewardsBody(request), formatResponse: buildAvailableRewardsResponse }, () => client.getAvailableRewards(request)),
    sendChallenge: request => traceOperation({ operation: 'Criar challenge', method: 'POST', endpoint: `/POS/customers/${encodeURIComponent(request.customerId)}/challenge`, reason: 'Validar a identidade antes do resgate.', persists: ['transactionId'], request: buildChallengeBody(request), formatResponse: buildChallengeResponse }, () => client.sendChallenge(request)),
    validateChallenge: request => traceOperation({ operation: 'Validar challenge', method: 'POST', endpoint: `/POS/customers/${encodeURIComponent(request.customerId)}/challengevalidate`, reason: 'Confirmar o código informado pelo cliente.', persists: ['transactionId'], request: buildChallengeValidationBody(request), formatResponse: buildChallengeValidationResponse }, () => client.validateChallenge(request)),
    redeemReward: request => traceOperation({ operation: 'Resgatar recompensa', method: 'POST', endpoint: `/POS/rewards/${request.rewardId}/redeem`, reason: 'Confirmar o benefício já validado por /available. Para ProductDiscount, o PDV aplica o efeito financeiro localmente.', persists: ['originalKey', 'rewardId', 'externalCode', 'externalProductId'], request: buildRedeemBody(request), formatResponse: response => buildSuccessEnvelope(buildRedeemResponse(response)) }, () => client.redeemReward(request)),
    cancelReward: rewardId => traceOperation({ operation: 'Estornar recompensa', method: 'DELETE', endpoint: `/POS/rewards/${rewardId}`, reason: 'Liberar a recompensa antes de editar cliente ou carrinho.', request: null, formatResponse: response => buildSuccessEnvelope(buildRewardCancellationResponse(response)) }, () => client.cancelReward(rewardId)),
    createOrder: request => traceOperation({ operation: 'Registrar pedido', method: 'POST', endpoint: '/POS/orders', reason: 'Registrar a venda líquida e gerar pontuação.', persists: ['originalId'], request: buildOrderBody(request), formatResponse: response => buildSuccessEnvelope(buildOrderResponse(response)) }, () => client.createOrder(request)),
    cancelOrder: (orderId, cancelledDate, orderStatus) => traceOperation({ operation: 'Cancelar pedido', method: 'POST', endpoint: `/POS/orders/${encodeURIComponent(orderId)}/cancel`, reason: 'Cancelar integralmente a venda registrada.', request: buildCancelOrderBody(cancelledDate, orderStatus), formatResponse: response => buildSuccessEnvelope(buildOrderCancellationResponse(response)) }, () => client.cancelOrder(orderId, cancelledDate, orderStatus)),
    partialCancelOrder: (orderId, request) => traceOperation({ operation: 'Cancelar parcialmente', method: 'POST', endpoint: `/POS/${encodeURIComponent(orderId)}/partialcancel`, reason: 'Registrar itens e valor líquido devolvidos com idempotência.', persists: ['cancelKey'], request: buildPartialCancelBody(request), formatResponse: response => buildSuccessEnvelope(buildOrderCancellationResponse(response)) }, () => client.partialCancelOrder(orderId, request)),
  }
}
