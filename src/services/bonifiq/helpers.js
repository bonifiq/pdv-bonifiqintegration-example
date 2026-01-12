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
    case 4: return 'Brinde'
    default: return 'Recompensa'
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
