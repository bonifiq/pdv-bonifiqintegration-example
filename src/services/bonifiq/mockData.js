/**
 * ===========================================================================
 * DADOS MOCKADOS PARA DEMONSTRAÇÃO
 * ===========================================================================
 * 
 * Em produção, esses dados seriam retornados diretamente pela API da BonifiQ.
 * Este arquivo simula as respostas do backend para fins de demonstração.
 */

// Dados de clientes (para validação local)
export const mockCustomers = {
  '12345678900': { id: '12345678900', name: 'Maria Silva', email: 'maria@email.com', phone: '11999998888' },
  '98765432100': { id: '98765432100', name: 'João Santos', email: 'joao@email.com', phone: '11888887777' },
  '11122233344': { id: '11122233344', name: 'Ana Costa', email: 'ana@email.com', phone: '11777776666' },
}

/**
 * Respostas mockadas do endpoint /rewards/available para cada cliente
 * Em produção, isso viria diretamente do backend BonifiQ
 */
export const mockAvailableRewardsResponses = {
  '12345678900': {
    hasRewards: true,
    shouldValidateCustomer: true,
    availablePoints: 1500,
    cashbackEnabled: true,
    availableCashback: 25.00,
    maxCashbackForCurrentPurchase: 25.00,
    rewards: [
      {
        id: 1,
        title: 'R$10,00 de desconto',
        rewardType: 1,
        value: 10.00,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$50,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: true,
        points: 100,
        rewardCanBeCumulative: true,
      },
      {
        id: 2,
        title: 'R$30,00 de desconto',
        rewardType: 1,
        value: 30.00,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$100,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: true,
        points: 250,
        rewardCanBeCumulative: true,
      },
      {
        id: 3,
        title: '15% de desconto',
        rewardType: 0,
        value: 15,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$80,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: true,
        points: 500,
        rewardCanBeCumulative: false,
      },
      {
        id: 4,
        title: 'Usar Cashback',
        rewardType: 3,
        value: 1,
        canSelectValue: true,
        isCashback: true,
        requirements: 'Máximo de 20% do valor da compra',
        availableCashback: 25.00,
        maxCashbackForCurrentPurchase: 25.00,
        canUse: true,
        points: 25,
        rewardCanBeCumulative: true,
      },
    ],
  },
  '98765432100': {
    hasRewards: true,
    shouldValidateCustomer: true,
    availablePoints: 350,
    cashbackEnabled: false,
    availableCashback: 0,
    maxCashbackForCurrentPurchase: 0,
    rewards: [
      {
        id: 1,
        title: 'R$10,00 de desconto',
        rewardType: 1,
        value: 10.00,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$50,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: true,
        points: 100,
        rewardCanBeCumulative: true,
      },
      {
        id: 2,
        title: 'R$30,00 de desconto',
        rewardType: 1,
        value: 30.00,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$100,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: true,
        points: 250,
        rewardCanBeCumulative: true,
      },
      {
        id: 3,
        title: '15% de desconto',
        rewardType: 0,
        value: 15,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$80,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: false,
        points: 500,
        rewardCanBeCumulative: false,
      },
    ],
  },
  '11122233344': {
    hasRewards: true,
    shouldValidateCustomer: true,
    availablePoints: 50,
    cashbackEnabled: true,
    availableCashback: 100.00,
    maxCashbackForCurrentPurchase: 100.00,
    rewards: [
      {
        id: 1,
        title: 'R$10,00 de desconto',
        rewardType: 1,
        value: 10.00,
        canSelectValue: false,
        isCashback: false,
        requirements: 'Válido para compras acima de R$50,00',
        availableCashback: 0,
        maxCashbackForCurrentPurchase: 0,
        canUse: false,
        points: 100,
        rewardCanBeCumulative: true,
      },
      {
        id: 4,
        title: 'Usar Cashback',
        rewardType: 3,
        value: 1,
        canSelectValue: true,
        isCashback: true,
        requirements: 'Máximo de 20% do valor da compra',
        availableCashback: 100.00,
        maxCashbackForCurrentPurchase: 100.00,
        canUse: true,
        points: 100,
        rewardCanBeCumulative: true,
      },
    ],
  },
}

// Dados das recompensas para uso no redeem (incluindo regras de validação)
export const mockRewardsData = {
  1: { id: 1, rewardType: 1, value: 10.00, points: 100, minPurchase: 50 },
  2: { id: 2, rewardType: 1, value: 30.00, points: 250, minPurchase: 100 },
  3: { id: 3, rewardType: 0, value: 15, points: 500, minPurchase: 80 },
  4: { id: 4, rewardType: 3, value: 1, points: 0, minPurchase: 0, maxCashbackPercent: 20 },
}

// Pontos dos clientes para validação
export const mockCustomerPoints = {
  '12345678900': { points: 1500, cashback: 25.00 },
  '98765432100': { points: 350, cashback: 0 },
  '11122233344': { points: 50, cashback: 100.00 },
}

// Resposta padrão quando cliente não é encontrado
export const emptyRewardsResponse = {
  hasRewards: false,
  shouldValidateCustomer: false,
  availablePoints: 0,
  cashbackEnabled: false,
  availableCashback: 0,
  maxCashbackForCurrentPurchase: 0,
  rewards: [],
}
