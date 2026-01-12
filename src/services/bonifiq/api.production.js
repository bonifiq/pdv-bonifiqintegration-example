/**
 * ===========================================================================
 * BONIFIQ API - IMPLEMENTAÇÃO DE PRODUÇÃO
 * ===========================================================================
 * 
 * Este arquivo mostra como as chamadas seriam feitas em PRODUÇÃO.
 * 
 * ✅ TODOS os campos vêm prontos da API - você NÃO precisa calcular nada!
 * ✅ Campos como `canUse`, `maxCashbackForCurrentPurchase` já vêm calculados
 * ✅ Basta usar a resposta diretamente na interface
 * 
 * Para usar em produção:
 * 1. Configure API_USERNAME e API_PASSWORD (obtidos no painel BonifiQ)
 * 2. Importe este arquivo no index.js
 * 3. Pronto!
 */

const API_BASE_URL = 'https://api.bonifiq.com.br/v1/pvt/POS'

// ===========================================================================
// CREDENCIAIS - Configure aqui seu usuário e senha
// ===========================================================================
// Obtenha suas credenciais no painel da BonifiQ:
// Menu > Configurações > API > Credenciais Private API
const API_USERNAME = 'APIUSER-TotvsOmniP-0ce81622ac5147a6bc6b2472d6a16968'
const API_PASSWORD = 'ZRZ3GUW9SJFFQ675L5ZJMUHUASCNRZ'

/**
 * Gera o header de autenticação Basic Auth
 * Basic Auth: Base64 encode de "username:password"
 */
function getAuthHeader() {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`
  const base64Credentials = btoa(credentials) // Converte para Base64
  return `Basic ${base64Credentials}`
}

/**
 * ===========================================================================
 * NORMALIZAÇÃO DE CAMPOS
 * ===========================================================================
 * A API retorna campos em PascalCase (ex: HasRewards, CanUse)
 * O frontend espera camelCase (ex: hasRewards, canUse)
 * Esta função converte automaticamente todos os campos.
 */
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function normalizeKeys(obj) {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeKeys(item))
  }
  if (typeof obj === 'object') {
    const normalized = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = toCamelCase(key)
        normalized[camelKey] = normalizeKeys(obj[key])
      }
    }
    return normalized
  }
  return obj
}

/**
 * ===========================================================================
 * NORMALIZAÇÃO DE CAMPOS (SAÍDA)
 * ===========================================================================
 * A API espera campos em PascalCase (ex: OrderTotal, CustomerId)
 * O frontend usa camelCase (ex: orderTotal, customerId)
 * Esta função converte antes de enviar.
 */
function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function pascalizeKeys(obj) {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => pascalizeKeys(item))
  }
  if (typeof obj === 'object') {
    const normalized = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const pascalKey = toPascalCase(key)
        normalized[pascalKey] = pascalizeKeys(obj[key])
      }
    }
    return normalized
  }
  return obj
}

/**
 * ===========================================================================
 * POST /rewards/available
 * ===========================================================================
 * 
 * IMPORTANTE: A resposta já vem com todos os campos calculados!
 * 
 * Campos que a API retorna prontos (você NÃO precisa calcular):
 * - canUse: boolean - se o cliente pode usar esta recompensa
 * - maxCashbackForCurrentPurchase: number - máximo de cashback permitido
 * - hasRewards: boolean - se há alguma recompensa disponível
 * - shouldValidateCustomer: boolean - se precisa validar identidade
 * 
 * Você apenas exibe os dados retornados!
 */
export async function getAvailableRewards(customerId, purchaseValue, discountValue = 0) {
  const response = await fetch(`${API_BASE_URL}/rewards/available`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      customerId,
      purchaseValue,
      discountValue,
    }),
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * POST /customers/{id}/challenge
 * ===========================================================================
 * 
 * Envia código OTP para o cliente. A API envia automaticamente por SMS/Email.
 */
export async function sendChallenge(customerId, transactionId, phone = null, email = null) {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      transactionId,
      phone,
      email,
    }),
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * POST /customers/{id}/challengevalidate
 * ===========================================================================
 * 
 * Valida o código OTP informado pelo cliente.
 */
export async function validateChallenge(customerId, transactionId, code) {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}/challengevalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      transactionId,
      code,
    }),
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * POST /rewards/{id}/redeem
 * ===========================================================================
 * 
 * Resgata a recompensa. 
 * 
 * IMPORTANTE: O ExternalCode retornado DEVE ser enviado no campo 'coupon' 
 * do pedido para vincular o resgate ao pedido.
 */
export async function redeemReward(rewardId, customerId, value = null, originalKey) {
  const response = await fetch(`${API_BASE_URL}/rewards/${rewardId}/redeem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      customerId,
      value,
      originalKey,
    }),
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * DELETE /rewards/{id}
 * ===========================================================================
 * 
 * Cancela uma recompensa já resgatada. Os pontos são devolvidos ao cliente.
 */
export async function cancelReward(rewardId) {
  const response = await fetch(`${API_BASE_URL}/rewards/${rewardId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * POST /orders
 * ===========================================================================
 * 
 * Registra o pedido na BonifiQ. O cliente ganha pontos conforme configurado.
 * 
 * IMPORTANTE: O campo 'coupon' deve conter o ExternalCode retornado no redeem!
 */
export async function createOrder(orderData) {
  // Converte campos de camelCase para PascalCase (API espera PascalCase)
  const pascalizedData = pascalizeKeys(orderData)
  
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(pascalizedData),
  })

  const data = await response.json()
  return normalizeKeys(data)
}

/**
 * ===========================================================================
 * POST /orders/{orderId}/cancel
 * ===========================================================================
 * 
 * Cancela um pedido. Os pontos são removidos e recompensas são estornadas.
 */
export async function cancelOrder(orderId, cancelledDate, orderStatus = 'Cancelado') {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify({
      orderCancelledDate: cancelledDate,
      orderStatus,
    }),
  })

  const data = await response.json()
  return normalizeKeys(data)
}
