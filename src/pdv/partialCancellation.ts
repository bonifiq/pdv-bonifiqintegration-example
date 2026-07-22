import type { PartialCancelProductInput } from '../bonifiq/types'
import { allocateCentsProportionally, fromCents } from './money'
import type { OrderItemRecord } from './types'

export function allocatePartialRefundProducts(
  items: OrderItemRecord[],
  selectedQuantities: Record<string, number>,
  refundCents: number,
): PartialCancelProductInput[] {
  const selectedItems = items.map(item => ({
    originalId: item.originalId || item.id,
    grossCents: item.priceCents * (selectedQuantities[item.id] || 0),
  })).filter(item => item.grossCents > 0)
  if (refundCents <= 0) return []
  const allocations = allocateCentsProportionally(refundCents, selectedItems.map(item => item.grossCents))
  const grouped = new Map<string, number>()
  selectedItems.forEach((item, index) => {
    const itemRefundCents = allocations[index]
    grouped.set(item.originalId, (grouped.get(item.originalId) || 0) + itemRefundCents)
  })

  return [...grouped.entries()].map(([originalId, valueToRefundCents]) => ({
    originalId,
    valueToRefund: fromCents(valueToRefundCents),
  }))
}
