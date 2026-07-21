import { describe, expect, it } from 'vitest'
import { allocateOrderProductTotals } from './orderProducts'
import type { CartItem } from './types'

const item = (id: string, priceCents: number, quantity: number): CartItem => ({ id, name: id, icon: '', priceCents, quantity })

describe('valores dos produtos do pedido', () => {
  it('considera quantidade, distribui descontos e fecha exatamente com OrderTotal', () => {
    const totals = allocateOrderProductTotals([
      item('P1', 1000, 2),
      item('P2', 500, 1),
    ], 2001)

    expect(totals).toEqual([1601, 400])
    expect(totals.reduce((total, value) => total + value, 0)).toBe(2001)
  })

  it('mantém produtos gratuitos em zero', () => {
    expect(allocateOrderProductTotals([item('GIFT', 0, 1)], 0)).toEqual([0])
  })

  it('não gera linha negativa quando há mais produtos que centavos', () => {
    const totals = allocateOrderProductTotals(Array.from({ length: 10 }, (_, index) => item(`P${index}`, 100, 1)), 3)
    expect(totals.every(value => value >= 0)).toBe(true)
    expect(totals.reduce((total, value) => total + value, 0)).toBe(3)
  })
})
