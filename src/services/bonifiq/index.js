/**
 * ===========================================================================
 * BONIFIQ SERVICE - Exportação centralizada
 * ===========================================================================
 * 
 * Este módulo encapsula toda a comunicação com a API da BonifiQ.
 * Use este arquivo para importar as funções necessárias.
 * 
 * Exemplo de uso:
 *   import * as BonifiQ from './services/bonifiq'
 *   
 *   const rewards = await BonifiQ.getAvailableRewards(customerId, value)
 * 
 * ===========================================================================
 * PARA ALTERNAR ENTRE MOCK E PRODUÇÃO:
 * ===========================================================================
 * 
 * MOCK (demonstração): Troque o import abaixo para './api.mock'
 * PRODUÇÃO: Troque o import abaixo para './api.production'
 * 
 * Em produção, os campos como `canUse`, `maxCashbackForCurrentPurchase`, etc
 * já vêm calculados da API. Você NÃO precisa calcular nada no PDV!
 */

// ============================================
// 🔀 ALTERE AQUI PARA MUDAR ENTRE MOCK/PROD:
// ============================================
// Para MOCK (demonstração):
 import * as api from './api.mock'
// Para PRODUÇÃO:
 //import * as api from './api.production'

// Re-exporta as funções da API selecionada
export const {
  getAvailableRewards,
  sendChallenge,
  validateChallenge,
  redeemReward,
  cancelReward,
  createOrder,
  cancelOrder,
} = api

// Helper Functions
export {
  calculateDiscount,
  getRewardTypeLabel,
  generateOriginalKey,
  formatCurrency,
  isCashbackReward,
  calculateDiscountLabel,
} from './helpers'
