import { ProductDiscountMode, RewardType, type BonifiqCustomer } from './types'

export interface MockRewardConfig {
  id: number
  title?: string
  rewardType: RewardType
  value?: number
  points: number
  minPurchase: number
  maxCashbackPercent?: number
  rewardCanBeCumulative?: boolean
  externalProductId?: string
  productDisplayName?: string
  productDiscountMode?: ProductDiscountMode
  productDiscountValue?: number
  productMaxUnitsPerRedeem?: number
  productAvailableQuantity?: number
}

export const mockCustomers: Record<string, BonifiqCustomer> = {
  '12345678900': { id: 1001, originalId: '12345678900', name: 'Maria Silva', email: 'maria@email.com', phone: '11999998888', document: '12345678900', isEnrolled: true, currentTier: { name: 'Nível Ouro', color: '#d97706', iconUrl: null } },
  '98765432100': { id: 1002, originalId: '98765432100', name: 'João Santos', email: 'joao@email.com', phone: '11888887777', document: '98765432100', isEnrolled: true, currentTier: { name: 'Nível base a', color: '#502727', iconUrl: 'https://bq-public-images.s3.amazonaws.com/images/62b2bc41-4397-48a8-bad5-d628d5120ea5/2ae20c64-be76-4c7d-a8d7-4a3e0d338991.png' } },
  '11122233344': { id: 1003, originalId: '11122233344', name: 'Ana Costa', email: 'ana@email.com', phone: '11777776666', document: '11122233344', isEnrolled: true, currentTier: { name: 'Nível Diamante', color: '#0891b2', iconUrl: null } },
}

export const mockCustomerPoints: Record<string, { points: number; cashback: number }> = {
  '12345678900': { points: 1500, cashback: 25 },
  '98765432100': { points: 350, cashback: 0 },
  '11122233344': { points: 50, cashback: 100 },
}

export const mockRewardsData: Record<number, MockRewardConfig> = {
  1: { id: 1, rewardType: RewardType.FixedValueDiscount, value: 10, points: 100, minPurchase: 50, rewardCanBeCumulative: true },
  2: { id: 2, rewardType: RewardType.FixedValueDiscount, value: 30, points: 250, minPurchase: 100, rewardCanBeCumulative: true },
  3: { id: 3, rewardType: RewardType.PercentDiscount, value: 15, points: 500, minPurchase: 80, rewardCanBeCumulative: false },
  4: { id: 4, rewardType: RewardType.Cashback, value: 1, points: 0, minPurchase: 0, maxCashbackPercent: 20, rewardCanBeCumulative: true },
  5: { id: 5, title: 'Caneca BonifiQ de brinde', rewardType: RewardType.ProductDiscount, points: 0, minPurchase: 0, rewardCanBeCumulative: true, externalProductId: 'P009', productDisplayName: 'Caneca BonifiQ', productDiscountMode: ProductDiscountMode.FreeGift, productDiscountValue: 0, productMaxUnitsPerRedeem: 1, productAvailableQuantity: 20 },
  6: { id: 6, title: '20% na Camiseta Básica', rewardType: RewardType.ProductDiscount, points: 150, minPurchase: 0, rewardCanBeCumulative: true, externalProductId: 'P001', productDisplayName: 'Camiseta Básica', productDiscountMode: ProductDiscountMode.PercentDiscount, productDiscountValue: 20, productMaxUnitsPerRedeem: 1, productAvailableQuantity: 50 },
  7: { id: 7, title: 'Squeeze BonifiQ de brinde', rewardType: RewardType.ProductDiscount, points: 0, minPurchase: 0, rewardCanBeCumulative: true, externalProductId: 'P010', productDisplayName: 'Squeeze BonifiQ', productDiscountMode: ProductDiscountMode.FreeGift, productDiscountValue: 0, productMaxUnitsPerRedeem: 1, productAvailableQuantity: 15 },
}
