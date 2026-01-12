/**
 * ===========================================================================
 * ⚠️⚠️⚠️ ARQUIVO DE DEMONSTRAÇÃO - NÃO USE EM PRODUÇÃO ⚠️⚠️⚠️
 * ===========================================================================
 * 
 * Este arquivo SIMULA a API BonifiQ para fins de demonstração.
 * 
 * TODOS OS CÁLCULOS AQUI SÃO APENAS PARA SIMULAR O BACKEND!
 * 
 * Em PRODUÇÃO:
 * - Use o arquivo api.production.js
 * - Todos os campos já vêm prontos da API (canUse, maxCashbackForCurrentPurchase, etc)
 * - Você NÃO precisa calcular nada localmente
 * 
 * Os cálculos de canUse, meetsMinPurchase, hasEnoughPoints, etc que você vê
 * aqui são APENAS para simular o que a API real faz no servidor BonifiQ.
 * 
 * Para entender como usar a API em produção, veja: api.production.js
 * ===========================================================================
 */

import { 
  mockCustomers, 
  mockRewardsData, 
  mockCustomerPoints,
  emptyRewardsResponse 
} from './mockData'

// Simulação de delay de rede
const MOCK_DELAY = 800
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Armazena desafios pendentes para validação
const pendingChallenges = new Map()

// Armazena resgates realizados (para idempotência)
const completedRedeems = new Map()

/**
 * ===========================================================================
 * POST /rewards/available
 * ===========================================================================
 * Consulta as recompensas disponíveis para um cliente
 * Valida o valor mínimo da compra para cada recompensa
 */
export async function getAvailableRewards(customerId, purchaseValue, discountValue = 0) {
  await delay(MOCK_DELAY)

  const customerData = mockCustomerPoints[customerId]
  
  if (!customerData) {
    return emptyRewardsResponse
  }

  // Gera as recompensas dinamicamente baseado no valor da compra
  const rewards = Object.values(mockRewardsData).map(reward => {
    const hasEnoughPoints = customerData.points >= reward.points
    const meetsMinPurchase = purchaseValue >= reward.minPurchase
    
    let canUse = hasEnoughPoints && meetsMinPurchase
    let availableCashback = 0
    let maxCashbackForCurrentPurchase = 0
    
    // Lógica especial para Cashback
    if (reward.rewardType === 3) {
      availableCashback = customerData.cashback
      maxCashbackForCurrentPurchase = Math.min(
        customerData.cashback,
        purchaseValue * (reward.maxCashbackPercent / 100)
      )
      canUse = customerData.cashback > 0 && maxCashbackForCurrentPurchase >= 1 && meetsMinPurchase
    }

    // Gera título baseado no tipo
    let title = ''
    if (reward.rewardType === 0) {
      title = `${reward.value}% de desconto`
    } else if (reward.rewardType === 1) {
      title = `R$${reward.value.toFixed(2).replace('.', ',')} de desconto`
    } else if (reward.rewardType === 3) {
      title = 'Usar Cashback'
    }

    // Gera requirements
    let requirements = ''
    if (reward.minPurchase > 0) {
      requirements = `Válido para compras acima de R$${reward.minPurchase.toFixed(2).replace('.', ',')}`
    }
    if (reward.maxCashbackPercent) {
      requirements = `Máximo de ${reward.maxCashbackPercent}% do valor da compra`
    }

    return {
      id: reward.id,
      title,
      rewardType: reward.rewardType,
      value: reward.value,
      canSelectValue: reward.rewardType === 3,
      isCashback: reward.rewardType === 3,
      requirements,
      availableCashback,
      maxCashbackForCurrentPurchase,
      canUse,
      points: reward.rewardType === 3 ? Math.round(maxCashbackForCurrentPurchase) : reward.points,
      rewardCanBeCumulative: true,
      minPurchase: reward.minPurchase,
    }
  })

  const hasCashback = rewards.some(r => r.isCashback && r.availableCashback > 0)

  return {
    hasRewards: rewards.some(r => r.canUse),
    shouldValidateCustomer: true,
    availablePoints: customerData.points,
    cashbackEnabled: hasCashback,
    availableCashback: customerData.cashback,
    maxCashbackForCurrentPurchase: rewards.find(r => r.isCashback)?.maxCashbackForCurrentPurchase || 0,
    rewards,
  }
}

/**
 * ===========================================================================
 * POST /customers/{id}/challenge
 * ===========================================================================
 * Envia um código de validação para o cliente (OTP por SMS/Email)
 */
export async function sendChallenge(customerId, transactionId, phone = null, email = null) {
  await delay(MOCK_DELAY)

  const customer = mockCustomers[customerId]
  
  if (!customer) {
    return {
      success: false,
      friendlyErrorMessage: 'Cliente não encontrado',
      shouldInformPhone: true,
      shouldInformEmail: true,
      sentBySMS: false,
      sentByEmail: false,
      transactionId,
      errorMessage: 'Customer not found',
    }
  }

  // Gera código de 4 dígitos (como a API de produção)
  const code = Math.random().toString().slice(2, 6)
  
  // Armazena para validação posterior
  pendingChallenges.set(`${customerId}-${transactionId}`, {
    code,
    createdAt: Date.now(),
    attempts: 0,
  })

  console.log(`[BonifiQ] Código de validação enviado para ${customer.name}: ${code}`)

  return {
    success: true,
    friendlyErrorMessage: null,
    shouldInformPhone: false,
    shouldInformEmail: false,
    sentBySMS: true,
    sentByEmail: false,
    transactionId,
    errorMessage: null,
    // Em produção, o código NÃO é retornado. Aqui retornamos para demonstração.
    code,
  }
}

/**
 * ===========================================================================
 * POST /customers/{id}/challengevalidate
 * ===========================================================================
 * Valida o código informado pelo cliente
 */
export async function validateChallenge(customerId, transactionId, code) {
  await delay(MOCK_DELAY / 2)

  const challengeKey = `${customerId}-${transactionId}`
  const challenge = pendingChallenges.get(challengeKey)

  if (!challenge) {
    return {
      transactionId,
      success: false,
      friendlyErrorMessage: 'Código expirado. Solicite um novo código.',
    }
  }

  // Verifica tentativas
  challenge.attempts += 1
  if (challenge.attempts > 3) {
    pendingChallenges.delete(challengeKey)
    return {
      transactionId,
      success: false,
      friendlyErrorMessage: 'Muitas tentativas. Solicite um novo código.',
    }
  }

  // Verifica expiração (5 minutos)
  if (Date.now() - challenge.createdAt > 5 * 60 * 1000) {
    pendingChallenges.delete(challengeKey)
    return {
      transactionId,
      success: false,
      friendlyErrorMessage: 'Código expirado. Solicite um novo código.',
    }
  }

  // Valida código
  if (code !== challenge.code) {
    return {
      transactionId,
      success: false,
      friendlyErrorMessage: 'Código inválido. Tente novamente.',
    }
  }

  // Sucesso - remove o challenge
  pendingChallenges.delete(challengeKey)

  return {
    transactionId,
    success: true,
    friendlyErrorMessage: null,
  }
}

/**
 * ===========================================================================
 * POST /rewards/{id}/redeem
 * ===========================================================================
 * Resgata uma recompensa para o cliente
 */
export async function redeemReward(rewardId, customerId, value = null, originalKey) {
  await delay(MOCK_DELAY)

  // Verifica idempotência
  if (completedRedeems.has(originalKey)) {
    return completedRedeems.get(originalKey)
  }

  const customer = mockCustomers[customerId]
  const reward = mockRewardsData[rewardId]

  if (!customer || !reward) {
    return {
      hasError: true,
      errorMessage: 'Cliente ou recompensa não encontrada',
      data: null,
    }
  }

  // Calcula pontos e valor do desconto
  let pointsToConsume = reward.points
  let cashValue = reward.value

  if (reward.rewardType === 3 && value) {
    // Cashback: usa o valor selecionado pelo cliente
    pointsToConsume = Math.round(value)
    cashValue = value
  }

  const result = {
    hasError: false,
    errorMessage: null,
    data: {
      rewardId: 1000 + Math.floor(Math.random() * 9000),
      point: {
        pointId: 2000 + Math.floor(Math.random() * 9000),
        quantity: -pointsToConsume,
        metadatas: null,
      },
      externalCode: `BNF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      originalKey,
      coupon: null,
      // Dados para o PDV calcular o desconto
      rewardType: reward.rewardType,
      discountValue: cashValue,
      discountPercent: reward.rewardType === 0 ? reward.value : null,
    },
  }

  // Armazena para idempotência
  completedRedeems.set(originalKey, result)

  return result
}

/**
 * ===========================================================================
 * DELETE /rewards/{id}
 * ===========================================================================
 * Cancela uma recompensa resgatada
 */
export async function cancelReward(rewardIdOrOriginalKey) {
  await delay(MOCK_DELAY)

  // Encontra o resgate pelo originalKey ou ID
  let redeemEntry = null
  for (const [key, value] of completedRedeems.entries()) {
    if (key === rewardIdOrOriginalKey || value.data?.rewardId === rewardIdOrOriginalKey) {
      redeemEntry = { key, value }
      break
    }
  }

  if (!redeemEntry) {
    return {
      hasError: true,
      errorMessage: 'Recompensa não encontrada',
      data: null,
    }
  }

  // Remove do registro
  completedRedeems.delete(redeemEntry.key)

  return {
    hasError: false,
    data: {
      id: redeemEntry.value.data.rewardId,
      isCanceled: true,
      externalCode: redeemEntry.value.data.externalCode,
    },
  }
}

/**
 * ===========================================================================
 * POST /orders
 * ===========================================================================
 * Cadastra um pedido na BonifiQ
 */
export async function createOrder(orderData) {
  await delay(MOCK_DELAY)

  // Calcula pontos a serem concedidos (exemplo: 1 ponto por real)
  const pointsToEarn = Math.floor(orderData.orderTotal)

  return {
    hasError: false,
    errorMessage: null,
    data: {
      originalId: orderData.originalId,
      orderPlacementDate: orderData.orderPlacementDate,
      orderCompletedDate: orderData.orderCompletedDate,
      orderTotal: orderData.orderTotal,
      coupon: orderData.coupon,
      state: orderData.isCompleted ? 2 : 1, // 2 = Completo, 1 = Pendente
      origin: 1, // External API
      pointsEarned: pointsToEarn,
    },
  }
}

/**
 * ===========================================================================
 * POST /orders/{orderId}/cancel
 * ===========================================================================
 * Cancela um pedido
 */
export async function cancelOrder(orderId, cancelledDate, orderStatus = 'Cancelado') {
  await delay(MOCK_DELAY)

  return {
    hasError: false,
    data: {
      isCanceled: true,
      updatedAt: cancelledDate || new Date().toISOString(),
      status: {
        code: 3,
        description: orderStatus,
      },
    },
  }
}
