import type {
  AvailableRewardsResponse,
  ChallengeResponse,
  ChallengeValidationResponse,
  OrderCancellationResponse,
  OrderResponse,
  RedeemResponse,
  RewardCancellationResponse,
} from './types'
import { pascalizeKeys } from './wirePayloads'

const compact = (value: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
)

export const buildSuccessEnvelope = (result: unknown): Record<string, unknown> => ({
  ErrorMessage: null,
  ErrorCode: null,
  Result: result,
  Code: null,
  CodeName: null,
  Severity: 0,
  HasWarning: false,
  HasError: false,
})

export const buildAvailableRewardsResponse = (response: AvailableRewardsResponse): Record<string, unknown> => compact({
  Customer: response.customer ? compact({
    Id: response.customer.id,
    OriginalId: response.customer.originalId,
    Name: response.customer.name,
    Email: response.customer.email,
    Phone: response.customer.phone,
    Document: response.customer.document,
    IsEnrolled: response.customer.isEnrolled,
    CurrentTier: response.customer.currentTier ? compact({
      Name: response.customer.currentTier.name,
      Color: response.customer.currentTier.color,
      IconUrl: response.customer.currentTier.iconUrl,
    }) : undefined,
  }) : undefined,
  Rewards: response.rewards.map(reward => compact({
    Id: reward.id,
    Title: reward.title,
    RewardType: reward.rewardType,
    Value: reward.value,
    CanSelectValue: reward.canSelectValue,
    IsCashback: reward.isCashback,
    Requirements: reward.requirements,
    AvailableCashback: reward.availableCashback,
    MaxCashbackForCurrentPurchase: reward.maxCashbackForCurrentPurchase,
    CanUse: reward.canUse,
    Points: reward.points,
    RewardCanBeCumulative: reward.rewardCanBeCumulative,
    ExternalProductId: reward.externalProductId,
    ProductDisplayName: reward.productDisplayName,
    ProductDiscountMode: reward.productDiscountMode,
    ProductDiscountValue: reward.productDiscountValue,
    ProductMaxUnitsPerRedeem: reward.productMaxUnitsPerRedeem,
    ProductAvailableQuantity: reward.productAvailableQuantity,
    ProductDiscountTotal: reward.productDiscountTotal,
  })),
  HasRestrictedItems: response.hasRestrictedItems,
  RestrictedValue: response.restrictedValue,
  EligibleValue: response.eligibleValue,
  HasRewards: response.hasRewards,
  ShouldValidateCustomer: response.shouldValidateCustomer,
  ShouldValidateCustomerSignup: response.shouldValidateCustomerSignup,
  AvailablePoints: response.availablePoints,
  CashbackEnabled: response.cashbackEnabled,
  AvailableCashback: response.availableCashback,
  MaxCashbackForCurrentPurchase: response.maxCashbackForCurrentPurchase,
})

export const buildChallengeResponse = (response: ChallengeResponse): Record<string, unknown> => compact({
  Success: response.success,
  FriendlyErrorMessage: response.friendlyErrorMessage,
  ShouldInformPhone: response.shouldInformPhone,
  ShouldInformEmail: response.shouldInformEmail,
  SentBySMS: response.sentBySms,
  SentByEmail: response.sentByEmail,
  TransactionId: response.transactionId,
  ErrorMessage: response.deliveryError,
  Code: response.code,
})

export const buildChallengeValidationResponse = (response: ChallengeValidationResponse): Record<string, unknown> => compact({
  TransactionId: response.transactionId,
  Success: response.success,
  FriendlyErrorMessage: response.friendlyErrorMessage,
})

export const buildRedeemResponse = (response: RedeemResponse): Record<string, unknown> => compact({
  RewardId: response.rewardId,
  Point: response.point ? compact({
    PointId: response.point.pointId,
    Quantity: response.point.quantity,
    Metadatas: response.point.metadatas ? pascalizeKeys(response.point.metadatas) : undefined,
  }) : undefined,
  ExternalCode: response.externalCode,
  OriginalKey: response.originalKey,
  Coupon: response.coupon ? pascalizeKeys(response.coupon) : undefined,
  ExternalProductId: response.externalProductId,
  ProductDiscountTotal: response.productDiscountTotal,
})

export const buildRewardCancellationResponse = (response: RewardCancellationResponse): Record<string, unknown> => compact({
  Id: response.id,
  Customer: response.customer ? pascalizeKeys(response.customer) : undefined,
  ExternalCode: response.externalCode,
  CashValue: response.cashValue,
  IsCanceled: response.isCanceled,
  RedeemDate: response.redeemDate,
  Points: response.points ? compact({
    Id: response.points.id,
    Points: response.points.points,
    Type: response.points.type,
    EventKey: response.points.eventKey,
  }) : undefined,
})

export const buildOrderResponse = (response: OrderResponse): Record<string, unknown> => compact({
  Id: response.id,
  OriginalId: response.originalId,
  OrderPlacementDate: response.orderPlacementDate,
  OrderCompletedDate: response.orderCompletedDate,
  OrderCancelledDate: response.orderCancelledDate,
  OrderStatus: response.orderStatus,
  IsCancelledOrReturned: response.isCancelledOrReturned,
  IsCompleted: response.isCompleted,
  OrderTotal: response.orderTotal,
  Customer: response.customer ? pascalizeKeys(response.customer) : undefined,
  Products: response.products ? pascalizeKeys(response.products) : undefined,
  UpdatedDate: response.updatedDate,
  Coupon: response.coupon,
  State: response.state,
  Origin: response.origin,
  Branch: response.branch ? pascalizeKeys(response.branch) : undefined,
  TenantSalesman: response.tenantSalesman ? pascalizeKeys(response.tenantSalesman) : undefined,
  Metadatas: response.metadatas ? pascalizeKeys(response.metadatas) : undefined,
  ExternalCoupon: response.externalCoupon,
  EstimatedBonus: response.estimatedBonus ? compact({
    GenerateBonus: response.estimatedBonus.generateBonus,
    EstimatedPoints: response.estimatedBonus.estimatedPoints,
    EstimatedCashback: response.estimatedBonus.estimatedCashback,
    EstimatedCashbackFormatted: response.estimatedBonus.estimatedCashbackFormatted,
  }) : undefined,
})

export const buildOrderCancellationResponse = (response: OrderCancellationResponse): Record<string, unknown> => compact({
  isCanceled: response.isCanceled,
  UpdatedAt: response.updatedAt,
  Status: response.status,
  RefundErrorDetails: response.refundErrorDetails ? compact({
    Code: response.refundErrorDetails.code,
    Message: response.refundErrorDetails.message,
    Field: response.refundErrorDetails.field,
    ProductOriginalId: response.refundErrorDetails.productOriginalId,
    ExpectedValue: response.refundErrorDetails.expectedValue,
    ActualValue: response.refundErrorDetails.actualValue,
  }) : undefined,
})
