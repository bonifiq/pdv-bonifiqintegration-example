import type { OrderCustomerInput, OrderRequest, OrderResponse, ProductBrandInput, ProductCategoryInput } from '../bonifiq/types'

export type MoneyCents = number

export interface CatalogProduct {
  id: string
  name: string
  priceCents: MoneyCents
  icon: string
  availableForSale?: boolean
  brand?: ProductBrandInput
  category?: ProductCategoryInput
}

export interface CartItem extends CatalogProduct {
  quantity: number
  originalId?: string
  originalPriceCents?: MoneyCents
  productDiscountTotalCents?: MoneyCents
  isRewardProduct?: boolean
  rewardLabel?: string | null
}

export interface PdvCustomer {
  document: string
  name: string
  email: string
  phone: string
}

export interface OrderItemRecord extends CartItem {
  cancelledQuantity: number
}

export interface CancellationRecord {
  type: 'total' | 'partial'
  cancelledAt: string
  items?: Record<string, number>
  valueToRefund?: number
  cancelKey?: string
}

export interface OrderRecord {
  originalId: string
  customer: OrderCustomerInput
  coupon?: string | null
  orderData: OrderRequest
  bonifiqResult: OrderResponse | Record<string, unknown>
  originalSubtotalCents: MoneyCents
  originalDiscountCents: MoneyCents
  originalTotalCents: MoneyCents
  currentTotalCents: MoneyCents
  status: string
  statusClass: string
  items: OrderItemRecord[]
  cancellations: CancellationRecord[]
}

export interface Notice {
  type: 'success' | 'error'
  message: string
}
