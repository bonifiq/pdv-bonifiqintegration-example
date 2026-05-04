import { useState } from 'react'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatCurrency(value) {
  return currencyFormatter.format(value || 0)
}

function getActiveQuantity(item) {
  return Math.max(0, item.quantity - (item.cancelledQuantity || 0))
}

/**
 * Lista pedidos feitos na sessão e permite demonstrar cancelamento total/parcial.
 */
export function OrdersScreen({
  orders,
  onBack,
  onNewSale,
  onCancelOrder,
  onPartialCancel,
  isProcessing,
  processingOrderId,
  notice,
}) {
  const [partialDrafts, setPartialDrafts] = useState({})

  const updateDraftQuantity = (orderId, itemId, quantity, maxQuantity) => {
    const normalizedQuantity = Math.max(0, Math.min(maxQuantity, Number(quantity) || 0))
    setPartialDrafts(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemId]: normalizedQuantity,
      },
    }))
  }

  const handlePartialCancel = async (order) => {
    const draft = partialDrafts[order.originalId] || {}
    await onPartialCancel(order, draft)
    setPartialDrafts(prev => ({
      ...prev,
      [order.originalId]: {},
    }))
  }

  return (
    <div className="orders-screen">
      <div className="orders-toolbar">
        <div>
          <h2>Pedidos feitos</h2>
          <p>Pedidos mantidos em memória nesta sessão do PDV.</p>
        </div>
        <div className="orders-toolbar-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            Voltar ao PDV
          </button>
          <button className="btn btn-primary" onClick={onNewSale}>
            Nova venda
          </button>
        </div>
      </div>

      {notice && <div className={`orders-notice ${notice.type || 'success'}`}>{notice.message}</div>}

      {orders.length === 0 ? (
        <div className="card orders-empty">
          <h3>Nenhum pedido feito nesta sessão</h3>
          <p>Conclua uma venda para testar o fluxo de cancelamento total ou parcial.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const isOrderProcessing = isProcessing && processingOrderId === order.originalId
            const isCancelled = order.status === 'Cancelado'
            const hasActiveItems = order.items.some(item => getActiveQuantity(item) > 0)
            const draft = partialDrafts[order.originalId] || {}
            const hasPartialSelection = order.items.some(item => (draft[item.id] || 0) > 0)

            return (
              <div key={order.originalId} className="card order-card">
                <div className="order-card-header">
                  <div>
                    <h3>Pedido #{order.originalId}</h3>
                    <p>{order.customer?.name} · {order.customer?.document}</p>
                  </div>
                  <span className={`order-status ${order.statusClass}`}>{order.status}</span>
                </div>

                <div className="order-summary">
                  <div>
                    <span>Total original</span>
                    <strong>{formatCurrency(order.originalTotal)}</strong>
                  </div>
                  <div>
                    <span>Total atual</span>
                    <strong>{formatCurrency(order.currentTotal)}</strong>
                  </div>
                  <div>
                    <span>Cupom</span>
                    <strong>{order.coupon || '-'}</strong>
                  </div>
                </div>

                <div className="order-items">
                  {order.items.map(item => {
                    const activeQuantity = getActiveQuantity(item)
                    return (
                      <div key={item.id} className="order-item-row">
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} vendido(s)
                            {item.cancelledQuantity > 0 && ` · ${item.cancelledQuantity} cancelado(s)`}
                          </span>
                        </div>
                        <div className="order-item-actions">
                          <span>{formatCurrency(item.price * activeQuantity)}</span>
                          <input
                            className="order-cancel-input"
                            type="number"
                            min="0"
                            max={activeQuantity}
                            value={draft[item.id] || ''}
                            placeholder="0"
                    disabled={isCancelled || activeQuantity === 0 || isProcessing}
                            onChange={(event) => updateDraftQuantity(
                              order.originalId,
                              item.id,
                              event.target.value,
                              activeQuantity
                            )}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="order-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handlePartialCancel(order)}
                    disabled={isCancelled || !hasActiveItems || !hasPartialSelection || isProcessing}
                  >
                    {isOrderProcessing ? 'Processando...' : 'Cancelar itens selecionados'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onCancelOrder(order)}
                    disabled={isCancelled || !hasActiveItems || isProcessing}
                  >
                    Cancelar pedido inteiro
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
