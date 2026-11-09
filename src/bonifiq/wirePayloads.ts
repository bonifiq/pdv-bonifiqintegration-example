import type {
  AvailableRewardsRequest,
  ChallengeRequest,
  ChallengeValidationRequest,
  NamedReferenceInput,
  OrderPaymentMethodInput,
  OrderRequest,
  PartialCancelRequest,
  ProductBrandInput,
  ProductCategoryInput,
  RedeemRequest,
  SaleContextInput,
} from './types'

export const REDEEM_ORIGIN_PDV = 5

const pascalize = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1)

export function pascalizeKeys<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(item => pascalizeKeys(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => (
      [pascalize(key), pascalizeKeys(item)]
    ))) as T
  }
  return value as T
}

const compact = (value: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
)

const buildNamedReference = (reference?: NamedReferenceInput | null): Record<string, unknown> | undefined => reference
  ? compact({ OriginalId: reference.originalId, Name: reference.name })
  : undefined

const buildBrand = (brand?: ProductBrandInput | null): Record<string, unknown> | undefined => buildNamedReference(brand)

const buildPaymentMethods = (paymentMethods?: OrderPaymentMethodInput[] | null): Record<string, unknown>[] | undefined => paymentMethods
  ? paymentMethods.map(paymentMethod => compact({
      OriginalId: paymentMethod.originalId,
      Name: paymentMethod.name,
      PaidAmount: paymentMethod.paidAmount,
    }))
  : undefined

/** Loja, política comercial, vendedor e pagamento no mesmo formato do pedido. Campos ausentes não são enviados. */
const buildSaleContext = (context: SaleContextInput): Record<string, unknown> => compact({
  Branch: buildNamedReference(context.branch),
  TradePolicy: buildNamedReference(context.tradePolicy),
  SalesPerson: buildNamedReference(context.salesPerson),
  PaymentMethods: context.paymentMethods?.length ? buildPaymentMethods(context.paymentMethods) : undefined,
})

const buildAvailableCategory = (category?: ProductCategoryInput | null): Record<string, unknown> | undefined => category
  ? compact({
      OriginalId: category.originalId,
      Name: category.name,
      ParentCategory: buildAvailableCategory(category.parentCategory),
    })
  : undefined

const buildOrderCategory = (category?: ProductCategoryInput | null): Record<string, unknown> | undefined => category
  ? compact({
      OriginalId: category.originalId,
      Name: category.name,
      Description: category.description,
      ParentCategory: buildOrderCategory(category.parentCategory),
    })
  : undefined

export const buildAvailableRewardsBody = (request: AvailableRewardsRequest): Record<string, unknown> => ({
  CustomerId: request.customerId,
  PurchaseValue: request.purchaseValue,
  DiscountValue: request.discountValue,
  Products: request.products.map(product => compact({
    OriginalId: product.originalId,
    LineId: product.lineId,
    Title: product.title,
    IsActive: product.isActive,
    Quantity: product.quantity,
    ProductPrice: product.productPrice,
    ProductDiscountPrice: product.productDiscountPrice,
    ProductBrand: buildBrand(product.productBrand),
    ProductCategory: buildAvailableCategory(product.productCategory),
  })),
  ...buildSaleContext(request),
})

export const buildChallengeBody = (request: ChallengeRequest): Record<string, unknown> => ({
  TransactionId: request.transactionId,
  ...(request.phone ? { Phone: request.phone } : {}),
  ...(request.email ? { Email: request.email } : {}),
  ...(request.document ? { Document: request.document } : {}),
  ...(request.name ? { Name: request.name } : {}),
})

export const buildChallengeValidationBody = (request: ChallengeValidationRequest): Record<string, unknown> => ({
  TransactionId: request.transactionId,
  Code: request.code,
})

export const buildRedeemBody = (request: RedeemRequest): Record<string, unknown> => ({
  CustomerId: request.customerId,
  ...(request.value !== null && request.value !== undefined ? { Value: request.value } : {}),
  OriginalKey: request.originalKey,
  RedeemOrigin: REDEEM_ORIGIN_PDV,
  ...buildSaleContext(request),
})

export const buildOrderBody = (request: OrderRequest): Record<string, unknown> => compact({
  OriginalId: request.originalId,
  OrderPlacementDate: request.orderPlacementDate,
  OrderCompletedDate: request.orderCompletedDate,
  OrderStatus: request.orderStatus,
  IsCancelledOrReturned: request.isCancelledOrReturned,
  IsCompleted: request.isCompleted,
  OrderTotal: request.orderTotal,
  Coupon: request.coupon,
  Customer: compact({
    OriginalId: request.customer.originalId,
    Name: request.customer.name,
    Email: request.customer.email,
    Phone: request.customer.phone,
    BirthdayDate: request.customer.birthdayDate,
    SignupDate: request.customer.signupDate,
    Document: request.customer.document,
    IsEnrolled: request.customer.isEnrolled,
    EnrolledDate: request.customer.enrolledDate,
  }),
  Products: request.products.map(product => compact({
    OriginalId: product.originalId,
    Title: product.title,
    Url: product.url,
    ImageUrl: product.imageUrl,
    IsActive: product.isActive,
    ProductPrice: product.productPrice,
    ProductBrand: buildBrand(product.productBrand),
    ProductCategory: buildOrderCategory(product.productCategory),
  })),
  PaymentMethods: buildPaymentMethods(request.paymentMethods),
  Branch: buildNamedReference(request.branch),
  TradePolicy: buildNamedReference(request.tradePolicy),
  SalesPerson: buildNamedReference(request.salesPerson),
})

export const buildCancelOrderBody = (cancelledDate: string, orderStatus: string): Record<string, unknown> => ({
  OrderCancelledDate: cancelledDate,
  OrderStatus: orderStatus,
})

export const buildPartialCancelBody = (request: PartialCancelRequest): Record<string, unknown> => compact({
  ValueToRefund: request.valueToRefund,
  CancelKey: request.cancelKey,
  Products: request.products?.length ? request.products.map(product => ({
    OriginalId: product.originalId,
    ValueToRefund: product.valueToRefund,
  })) : undefined,
  ShouldRefundRedeem: request.shouldRefundRedeem,
})
