import { useState } from 'react'

import { formatCents } from '../../pdv/money'
import type { OrderRecord } from '../../pdv/types'

interface Props {
  order: OrderRecord
  onCancelOrder: (order: OrderRecord) => Promise<void>
  onPartialCancel: (order: OrderRecord, draft: Record<string, number>) => Promise<void>
  isProcessing: boolean
  processingOrderId: string | null
}

export function OrderCard({ order, onCancelOrder, onPartialCancel, isProcessing, processingOrderId }: Props) {
  const [draft, setDraft] = useState<Record<string, number>>({})
  const cancelled = order.status === 'Cancelado'
  const active = order.items.some(item => item.quantity - item.cancelledQuantity > 0)
  const hasSelection = Object.values(draft).some(value => value > 0)

  const updateDraft = (itemId: string, value: number, max: number): void => {
    setDraft(previous => ({
      ...previous,
      [itemId]: Math.max(0, Math.min(max, Number(value) || 0)),
    }))
  }

  const cancelSelectedItems = async (): Promise<void> => {
    await onPartialCancel(order, draft)
    setDraft({})
  }

  return <div className="card order-card">
    <div className="order-card-header">
      <div><h3>Pedido #{order.originalId}</h3><p>{order.customer.name} · {order.customer.document}</p></div>
      <span className={`order-status ${order.statusClass}`}>{order.status}</span>
    </div>
    <div className="order-summary">
      <div><span>Total original</span><strong>{formatCents(order.originalTotalCents)}</strong></div>
      <div><span>Total atual</span><strong>{formatCents(order.currentTotalCents)}</strong></div>
      <div><span>Cupom</span><strong>{order.coupon || '-'}</strong></div>
    </div>
    <div className="order-items">{order.items.map(item => {
      const activeQuantity = Math.max(0, item.quantity - item.cancelledQuantity)
      return <div key={item.id} className="order-item-row">
        <div><strong>{item.name}</strong><span>{item.quantity} vendido(s){item.cancelledQuantity > 0 && ` · ${item.cancelledQuantity} cancelado(s)`}</span></div>
        <div className="order-item-actions">
          <span>{formatCents(item.priceCents * activeQuantity)}</span>
          <input
            aria-label={`Quantidade de ${item.name} para cancelar`}
            className="order-cancel-input"
            type="number"
            min="0"
            max={activeQuantity}
            value={draft[item.id] || ''}
            placeholder="0"
            disabled={cancelled || !activeQuantity || isProcessing}
            onChange={event => updateDraft(item.id, Number(event.target.value), activeQuantity)}
          />
        </div>
      </div>
    })}</div>
    <div className="order-actions">
      <button className="btn btn-secondary" disabled={cancelled || !active || !hasSelection || isProcessing} onClick={() => void cancelSelectedItems()}>{processingOrderId === order.originalId ? 'Processando...' : 'Cancelar itens selecionados'}</button>
      <button className="btn btn-danger" disabled={cancelled || !active || isProcessing} onClick={() => void onCancelOrder(order)}>Cancelar pedido inteiro</button>
    </div>
  </div>
}
