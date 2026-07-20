/**
 * ===========================================================================
 * BONIFIQ HELPERS - Funções auxiliares para o PDV
 * ===========================================================================
 * 
 * Funções utilitárias para processar dados da BonifiQ no PDV.
 */

/**
 * Calcula o desconto baseado no tipo de recompensa
 * @param {object} rewardData - Dados da recompensa resgatada
 * @param {number} purchaseValue - Valor da compra
 * @returns {number} Valor do desconto calculado
 */
export function calculateDiscount(rewardData, purchaseValue) {
  if (!rewardData) return 0

  if (rewardData.productDiscountTotal !== null && rewardData.productDiscountTotal !== undefined) {
    return rewardData.productDiscountTotal
  }

  const { rewardType, discountValue, discountPercent } = rewardData

  switch (rewardType) {
    case 0: // Percent Discount
      return purchaseValue * (discountPercent / 100)
    case 1: // Value Discount
    case 3: // Cashback
      return discountValue
    default:
      return 0
  }
}

/**
 * Formata tipo de recompensa para exibição
 * @param {number} rewardType - Código do tipo de recompensa
 * @returns {string} Nome amigável do tipo
 */
export function getRewardTypeLabel(rewardType) {
  switch (rewardType) {
    case 0: return 'Desconto Percentual'
    case 1: return 'Desconto em Valor'
    case 3: return 'Cashback'
    case 4: return 'Recompensa Personalizada'
    case 5: return 'Desconto em Produto ou Brinde'
    default: return 'Recompensa'
  }
}

export const PRODUCT_DISCOUNT_REWARD_TYPE = 5

export const PRODUCT_DISCOUNT_MODES = {
  PERCENT_DISCOUNT: 0,
  FIXED_FINAL_PRICE: 1,
  FREE_GIFT: 2,
  FIXED_DISCOUNT_AMOUNT: 3,
}

export function isProductDiscountReward(reward) {
  return reward?.rewardType === PRODUCT_DISCOUNT_REWARD_TYPE
}

export function isFreeGiftReward(reward) {
  return isProductDiscountReward(reward)
    && reward.productDiscountMode === PRODUCT_DISCOUNT_MODES.FREE_GIFT
}

/**
 * Calcula o preço unitário que o PDV deve registrar depois do resgate.
 * O Loyalty é autoritativo para o desconto total; no modo brinde, o contrato
 * retorna desconto zero e a regra do modo determina que a linha seja gratuita.
 */
export function calculateProductRewardUnitPrice(reward, redeemData, originalUnitPrice, quantity = 1) {
  if (isFreeGiftReward(reward)) return 0

  const normalizedOriginalPrice = Math.max(0, Number(originalUnitPrice) || 0)
  const normalizedQuantity = Math.max(1, Number(quantity) || 1)
  const discountTotal = Math.max(0, Number(redeemData?.productDiscountTotal) || 0)
  const unitDiscount = discountTotal / normalizedQuantity

  return Number(Math.max(0, normalizedOriginalPrice - unitDiscount).toFixed(2))
}

export function getProductDiscountDescription(reward) {
  if (!isProductDiscountReward(reward)) return ''

  const value = Number(reward.productDiscountValue || 0)

  switch (reward.productDiscountMode) {
    case PRODUCT_DISCOUNT_MODES.PERCENT_DISCOUNT:
      return `${value}% de desconto`
    case PRODUCT_DISCOUNT_MODES.FIXED_FINAL_PRICE:
      return `Preço final ${formatCurrency(value)}`
    case PRODUCT_DISCOUNT_MODES.FREE_GIFT:
      return 'Grátis'
    case PRODUCT_DISCOUNT_MODES.FIXED_DISCOUNT_AMOUNT:
      return `${formatCurrency(value)} de desconto`
    default:
      return 'Benefício no produto'
  }
}

/**
 * Gera uma chave única para operações de idempotência
 * @param {number} rewardId - ID da recompensa
 * @param {string} customerId - ID do cliente
 * @returns {string} Chave única
 */
export function generateOriginalKey(rewardId, customerId) {
  return `${rewardId}-${customerId}-${Date.now()}`
}

/**
 * Formata valor monetário para exibição
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado em BRL
 */
export function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Verifica se a recompensa é do tipo cashback
 * @param {object} reward - Objeto da recompensa
 * @returns {boolean}
 */
export function isCashbackReward(reward) {
  return reward?.rewardType === 3 || reward?.isCashback === true
}

/**
 * Calcula o label do desconto para exibição
 * @param {object} selectedReward - Recompensa selecionada
 * @param {number} cashbackValue - Valor de cashback selecionado (se aplicável)
 * @param {number} subtotal - Subtotal da compra
 * @returns {{ discount: number, label: string }}
 */
export function calculateDiscountLabel(selectedReward, cashbackValue, subtotal) {
  if (!selectedReward) {
    return { discount: 0, label: '' }
  }

  if (isCashbackReward(selectedReward)) {
    return { 
      discount: cashbackValue, 
      label: 'Cashback BonifiQ' 
    }
  }
  
  if (selectedReward.rewardType === 0) {
    return { 
      discount: subtotal * (selectedReward.value / 100), 
      label: `Desconto ${selectedReward.value}% BonifiQ` 
    }
  }
  
  return { 
    discount: selectedReward.value, 
    label: 'Desconto BonifiQ' 
  }
}
