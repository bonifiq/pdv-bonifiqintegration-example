export enum RewardType {
  PercentDiscount = 0,
  FixedValueDiscount = 1,
  Cashback = 3,
  Custom = 4,
  ProductDiscount = 5,
}

export enum ProductDiscountMode {
  PercentDiscount = 0,
  FixedFinalPrice = 1,
  FreeGift = 2,
  FixedDiscountAmount = 3,
}

export enum CannotUseReason {
  CanUse = 0,
  NotEnoughPoints = 1,
  MinimumValueNotReached = 2,
  CashbackNotAvailable = 3,
  NoCustomer = 4,
  RewardValueExceedsPurchase = 5,
  MinimumPurchasePercentNotReached = 6,
  CustomerNotEnrolled = 7,
  CannotUseCumulativeDiscount = 8,
  ProductRewardNoApplicableProduct = 9,
  ProductRewardUsageLimitReached = 10,
  ProductRewardRequiresCheckout = 11,
  ProductRewardInvalidConfiguration = 12,
}

export interface Tier {
  name: string
  color?: string | null
  iconUrl?: string | null
}

export interface BonifiqCustomer {
  id?: number
  originalId: string
  name: string
  email?: string | null
  phone?: string | null
  document?: string | null
  isEnrolled: boolean
  currentTier?: Tier | null
}

export interface ProductBrandInput {
  originalId: string
  name: string
}

export interface ProductCategoryInput {
  originalId: string
  name: string
  description?: string | null
  parentCategory?: ProductCategoryInput | null
}

export interface AvailableProduct {
  originalId: string
  lineId: string
  title: string
  quantity: number
  productPrice: number
  productDiscountPrice?: number | null
  isActive: boolean
  productBrand?: ProductBrandInput | null
  productCategory?: ProductCategoryInput | null
}

export interface AvailableReward {
  id: number
  title: string
  rewardType: RewardType
  value: number
  points: number
  canUse: boolean
  cannotUseReason: CannotUseReason
  requirements?: string | null
  rewardCanBeCumulative: boolean
  isCashback: boolean
  canSelectValue: boolean
  availableCashback: number
  maxCashbackForCurrentPurchase: number
  externalProductId?: string | null
  productDisplayName?: string | null
  productDiscountMode?: ProductDiscountMode | null
  productDiscountValue?: number | null
  productMaxUnitsPerRedeem?: number | null
  productAvailableQuantity?: number | null
  productDiscountTotal?: number
}

export interface AvailableRewardsRequest {
  customerId: string
  purchaseValue: number
  discountValue: number
  products: AvailableProduct[]
}

export interface AvailableRewardsResponse {
  customer?: BonifiqCustomer | null
  rewards: AvailableReward[]
  availablePoints: number
  canUseReward: boolean
  hasRewards: boolean
  cashbackEnabled: boolean
  availableCashback: number
  maxCashbackForCurrentPurchase: number
  shouldValidateCustomer: boolean
  shouldValidateCustomerSignup: boolean
  hasRestrictedItems?: boolean
  restrictedValue?: number
  eligibleValue?: number
}

export interface ChallengeRequest {
  customerId: string
  transactionId: string
  phone?: string | null
  email?: string | null
  document?: string | null
  name?: string | null
}

export interface ChallengeResponse {
  transactionId: string
  success: boolean
  deliverySucceeded: boolean
  code?: string
  sentBySms: boolean
  sentByEmail: boolean
  shouldInformPhone: boolean
  shouldInformEmail: boolean
  friendlyErrorMessage?: string | null
  deliveryError?: string | null
}

export interface ChallengeValidationResponse {
  transactionId: string
  success: boolean
  friendlyErrorMessage?: string | null
}

export interface ChallengeValidationRequest {
  customerId: string
  transactionId: string
  code: string
}

export interface RedeemProductInput {
  externalProductId: string
  quantity: number
  productPrice?: number | null
  productDiscountPrice?: number | null
  hasPromotion: boolean
}

export interface RedeemRequest {
  rewardId: number
  customerId: string
  originalKey: string
  value?: number | null
}

export interface ProductRedeemRequest extends Omit<RedeemRequest, 'value'> {
  product: RedeemProductInput
}

export interface RedeemResponse {
  rewardId: number
  externalCode: string
  originalKey: string
  externalProductId?: string | null
  productDiscountTotal: number
  coupon?: unknown | null
  point?: {
    pointId: number
    quantity: number
    metadatas?: unknown[] | null
  } | null
}

export interface OrderProductInput {
  originalId: string
  title: string
  productPrice: number
  isActive: boolean
  url?: string | null
  imageUrl?: string | null
  productBrand?: ProductBrandInput | null
  productCategory?: ProductCategoryInput | null
}

export interface OrderCustomerInput {
  originalId: string
  name: string
  email?: string | null
  phone?: string | null
  birthdayDate?: string | null
  signupDate?: string | null
  document?: string | null
  isEnrolled: boolean
  enrolledDate?: string | null
}

export interface OrderPaymentMethodInput {
  originalId: string
  name: string
  paidAmount?: number | null
}

export interface OrderRequest {
  originalId: string
  orderPlacementDate: string
  orderCompletedDate: string
  orderStatus: string
  isCancelledOrReturned: boolean
  isCompleted: boolean
  orderTotal: number
  coupon?: string | null
  customer: OrderCustomerInput
  products: OrderProductInput[]
  paymentMethods: OrderPaymentMethodInput[]
  branch: { originalId: string; name: string }
  salesPerson: { originalId: string; name: string }
}

export interface OrderResponse {
  id?: number
  originalId: string
  orderPlacementDate?: string
  orderCompletedDate?: string | null
  orderCancelledDate?: string | null
  orderStatus?: string
  isCancelledOrReturned?: boolean
  isCompleted?: boolean
  orderTotal: number
  coupon?: string | null
  updatedDate?: string
  state?: number
  origin?: number
  customer?: Record<string, unknown>
  products?: unknown[] | null
  branch?: Record<string, unknown> | null
  tenantSalesman?: Record<string, unknown> | null
  metadatas?: unknown[] | null
  externalCoupon?: string | null
  estimatedBonus?: {
    generateBonus: boolean
    estimatedPoints: number
    estimatedCashback: number
    estimatedCashbackFormatted: string
  }
}

export interface OrderCancellationResponse {
  isCanceled: boolean
  updatedAt?: string
  status?: number
  refundErrorDetails?: {
    code: string
    message: string
    field?: string | null
    productOriginalId?: string | null
    expectedValue?: number | null
    actualValue?: number | null
  } | null
  [key: string]: unknown
}

export interface PartialCancelProductInput {
  originalId: string
  valueToRefund: number
}

export interface PartialCancelRequest {
  valueToRefund: number
  cancelKey: string
  products?: PartialCancelProductInput[] | null
  shouldRefundRedeem?: boolean | null
}

export interface RewardCancellationResponse {
  id: number
  customer?: Record<string, unknown>
  externalCode: string
  cashValue?: number | null
  isCanceled: boolean
  redeemDate: string
  points?: {
    id: number
    points: number
    type: number
    eventKey: string
  }
}

export interface BonifiqError {
  code: string
  message: string
  friendlyMessage: string
  httpStatus?: number
  retryable: boolean
  details?: unknown
}

export type ApiResult<T> =
  | { ok: true; data: T; httpStatus?: number; wireResponse?: unknown }
  | { ok: false; error: BonifiqError; httpStatus?: number; wireResponse?: unknown }

export interface BonifiqClient {
  getAvailableRewards(request: AvailableRewardsRequest): Promise<ApiResult<AvailableRewardsResponse>>
  sendChallenge(request: ChallengeRequest): Promise<ApiResult<ChallengeResponse>>
  validateChallenge(request: ChallengeValidationRequest): Promise<ApiResult<ChallengeValidationResponse>>
  redeemReward(request: RedeemRequest): Promise<ApiResult<RedeemResponse>>
  redeemProductDiscountReward(request: ProductRedeemRequest): Promise<ApiResult<RedeemResponse>>
  cancelReward(rewardId: number): Promise<ApiResult<RewardCancellationResponse>>
  createOrder(request: OrderRequest): Promise<ApiResult<OrderResponse>>
  cancelOrder(orderId: string, cancelledDate: string, orderStatus: string): Promise<ApiResult<OrderCancellationResponse>>
  partialCancelOrder(orderId: string, request: PartialCancelRequest): Promise<ApiResult<OrderCancellationResponse>>
}
