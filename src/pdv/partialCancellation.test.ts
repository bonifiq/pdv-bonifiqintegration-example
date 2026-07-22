import { describe, expect, it } from 'vitest'
import { allocatePartialRefundProducts } from './partialCancellation'
import type { OrderItemRecord } from './types'

const item = (id: string, originalId: string, priceCents: number): OrderItemRecord => ({
  id,
  originalId,
  name: id,
  priceCents,
  icon: '',
  quantity: 1,
  cancelledQuantity: 0,
})

describe('produtos do cancelamento parcial', () => {
  it('distribui o valor líquido e mantém a soma exata em centavos', () => {
    const products = allocatePartialRefundProducts([
      item('line-1', 'P1', 333),
      item('line-2', 'P2', 667),
    ], { 'line-1': 1, 'line-2': 1 }, 901)

    expect(products).toEqual([
      { originalId: 'P1', valueToRefund: 3 },
      { originalId: 'P2', valueToRefund: 6.01 },
    ])
    expect(Math.round(products.reduce((total, product) => total + product.valueToRefund, 0) * 100)).toBe(901)
  })

  it('agrupa linhas com o mesmo OriginalId', () => {
    expect(allocatePartialRefundProducts([
      item('line-1', 'P1', 500),
      item('line-2', 'P1', 500),
    ], { 'line-1': 1, 'line-2': 1 }, 800)).toEqual([{ originalId: 'P1', valueToRefund: 8 }])
  })
})
