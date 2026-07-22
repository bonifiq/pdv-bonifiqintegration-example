import { describe, expect, it } from 'vitest'
import {
  buildAvailableRewardsBody,
  buildCancelOrderBody,
  buildChallengeBody,
  buildChallengeValidationBody,
  buildOrderBody,
  buildPartialCancelBody,
  buildProductRedeemBody,
  buildRedeemBody,
} from './wirePayloads'
import type { OrderRequest } from './types'
import { buildChallengeResponse, buildOrderCancellationResponse, buildSuccessEnvelope } from './wireResponses'

describe('payloads enviados à API', () => {
  it('separa os parâmetros de rota do body de resgate', () => {
    expect(buildRedeemBody({ rewardId: 7, customerId: '12345678900', originalKey: 'KEY-1', value: 10 })).toEqual({
      CustomerId: '12345678900',
      Value: 10,
      OriginalKey: 'KEY-1',
      RedeemOrigin: 5,
    })
    expect(buildRedeemBody({ rewardId: 7, customerId: '12345678900', originalKey: 'KEY-2', value: null })).toEqual({
      CustomerId: '12345678900',
      OriginalKey: 'KEY-2',
      RedeemOrigin: 5,
    })
  })

  it('monta o resgate de produto com casing recursivo', () => {
    expect(buildProductRedeemBody({
      rewardId: 5,
      customerId: '12345678900',
      originalKey: 'KEY-2',
      product: { externalProductId: 'P009', quantity: 1, productPrice: 29.9, productDiscountPrice: null, hasPromotion: false },
    })).toEqual({
      RewardConfigurationId: 5,
      CustomerId: '12345678900',
      OriginalKey: 'KEY-2',
      RedeemOrigin: 5,
      Product: { ExternalProductId: 'P009', Quantity: 1, ProductPrice: 29.9, HasPromotion: false },
    })
  })

  it('não inclui identificadores de rota nos bodies de challenge e cancelamento', () => {
    expect(buildChallengeBody({ customerId: '12345678900', transactionId: 'T1' })).toEqual({ TransactionId: 'T1' })
    expect(buildChallengeValidationBody({ customerId: '12345678900', transactionId: 'T1', code: '1234' })).toEqual({ TransactionId: 'T1', Code: '1234' })
    expect(buildCancelOrderBody('2026-07-21T00:00:00.000Z', 'Cancelado')).toEqual({ OrderCancelledDate: '2026-07-21T00:00:00.000Z', OrderStatus: 'Cancelado' })
    expect(buildPartialCancelBody({
      valueToRefund: 25.9,
      cancelKey: 'CANCEL-1',
      products: [{ originalId: 'P001', valueToRefund: 25.9 }],
    })).toEqual({ ValueToRefund: 25.9, CancelKey: 'CANCEL-1', Products: [{ OriginalId: 'P001', ValueToRefund: 25.9 }] })
  })

  it('envia somente os campos do contrato na consulta de recompensas', () => {
    expect(buildAvailableRewardsBody({
      customerId: '12345678900',
      purchaseValue: 129.9,
      discountValue: 0,
      products: [{
        originalId: 'P002', lineId: 'line-1', title: 'Calça', quantity: 1,
        productPrice: 129.9, productDiscountPrice: null, isActive: true,
        productBrand: { originalId: 'B1', name: 'Marca' },
        productCategory: { originalId: 'C1', name: 'Categoria', description: 'Não pertence a este contrato' },
      }],
    })).toEqual({
      CustomerId: '12345678900',
      PurchaseValue: 129.9,
      DiscountValue: 0,
      Products: [{
        OriginalId: 'P002', LineId: 'line-1', Title: 'Calça', IsActive: true, Quantity: 1,
        ProductPrice: 129.9,
        ProductBrand: { OriginalId: 'B1', Name: 'Marca' },
        ProductCategory: { OriginalId: 'C1', Name: 'Categoria' },
      }],
    })
  })

  it('projeta o pedido sem campos exclusivos da resposta ou do carrinho', () => {
    const request = {
      originalId: 'ORDER-1',
      orderPlacementDate: '2026-07-21T00:00:00.000Z',
      orderCompletedDate: '2026-07-21T00:00:00.000Z',
      orderStatus: 'Concluído',
      isCancelledOrReturned: false,
      isCompleted: true,
      orderTotal: 49.9,
      coupon: null,
      customer: {
        id: 99,
        originalId: '12345678900',
        name: 'Maria',
        email: 'maria@example.test',
        phone: null,
        document: '12345678900',
        isEnrolled: true,
        currentTier: { name: 'Ouro' },
      },
      products: [{
        originalId: 'P001', title: 'Camiseta', productPrice: 49.9, isActive: true,
        quantity: 2, price: 49.9, productDiscountPrice: 39.9,
        productBrand: { originalId: 'B1', name: 'Marca' },
        productCategory: { originalId: 'C1', name: 'Categoria' },
      }],
      paymentMethods: [{ originalId: 'DINHEIRO', name: 'Dinheiro', paidAmount: 49.9 }],
      branch: { originalId: 'LOJA-1', name: 'Centro' },
      salesPerson: { originalId: 'V1', name: 'João' },
    } as unknown as OrderRequest

    expect(buildOrderBody(request)).toEqual({
      OriginalId: 'ORDER-1',
      OrderPlacementDate: '2026-07-21T00:00:00.000Z',
      OrderCompletedDate: '2026-07-21T00:00:00.000Z',
      OrderStatus: 'Concluído',
      IsCancelledOrReturned: false,
      IsCompleted: true,
      OrderTotal: 49.9,
      Customer: {
        OriginalId: '12345678900', Name: 'Maria', Email: 'maria@example.test',
        Document: '12345678900', IsEnrolled: true,
      },
      Products: [{
        OriginalId: 'P001', Title: 'Camiseta', IsActive: true, ProductPrice: 49.9,
        ProductBrand: { OriginalId: 'B1', Name: 'Marca' },
        ProductCategory: { OriginalId: 'C1', Name: 'Categoria' },
      }],
      PaymentMethods: [{ OriginalId: 'DINHEIRO', Name: 'Dinheiro', PaidAmount: 49.9 }],
      Branch: { OriginalId: 'LOJA-1', Name: 'Centro' },
      SalesPerson: { OriginalId: 'V1', Name: 'João' },
    })
  })

  it('mantém o casing irregular definido nos contratos de resposta', () => {
    expect(buildChallengeResponse({
      transactionId: 'T1', success: true, deliverySucceeded: true, sentBySms: true, sentByEmail: false,
      shouldInformPhone: false, shouldInformEmail: false,
    })).toMatchObject({ SentBySMS: true, SentByEmail: false })
    expect(buildChallengeResponse({
      transactionId: 'T1', success: true, deliverySucceeded: true, sentBySms: true, sentByEmail: false,
      shouldInformPhone: false, shouldInformEmail: false,
    })).not.toHaveProperty('SentBySms')

    expect(buildOrderCancellationResponse({ isCanceled: true })).toEqual({ isCanceled: true })
    expect(buildOrderCancellationResponse({ isCanceled: true })).not.toHaveProperty('IsCanceled')
    expect(buildSuccessEnvelope(buildOrderCancellationResponse({ isCanceled: true }))).toMatchObject({
      Result: { isCanceled: true }, Severity: 0, HasWarning: false, HasError: false,
    })
  })
})
