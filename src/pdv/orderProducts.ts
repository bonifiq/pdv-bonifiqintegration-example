import type { CartItem } from './types'
import { allocateCentsProportionally } from './money'

export function allocateOrderProductTotals(items: CartItem[], orderTotalCents: number): number[] {
  if (items.length === 0) return []
  const lineTotals = items.map(item => item.priceCents * item.quantity)
  return allocateCentsProportionally(orderTotalCents, lineTotals)
}
