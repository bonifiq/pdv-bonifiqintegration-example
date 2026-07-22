import type { OrderResponse } from '../../bonifiq/types'
import type { Notice, OrderRecord } from '../../pdv/types'
import { OrderCard } from './OrderCard'

interface Props {
  order: OrderRecord
  orderResult: OrderResponse
  onNewSale: () => void
  onViewOrders: () => void
  onCancelOrder: (order: OrderRecord) => Promise<void>
  onPartialCancel: (order: OrderRecord, draft: Record<string, number>) => Promise<void>
  isProcessing: boolean
  processingOrderId: string | null
  notice: Notice | null
}

export function SuccessScreen({ order, orderResult, onNewSale, onViewOrders, onCancelOrder, onPartialCancel, isProcessing, processingOrderId, notice }: Props) {
  const orderTotal = Number(orderResult.orderTotal || 0)
  const bonus = orderResult.estimatedBonus
  const wasCancelled = order.status === 'Cancelado'
  const showEstimatedBonus = order.cancellations.length === 0 && bonus?.generateBonus

  return <div className="success-confirmation">
    <div className="card success-screen">
      <div className="success-icon">{wasCancelled ? '↩️' : '✅'}</div>
      <h2>{wasCancelled ? 'Pedido cancelado' : 'Venda concluída!'}</h2>
      <p>Pedido #{String(orderResult.originalId || 'Processado')}</p>
      <div className={`success-callout${wasCancelled ? ' cancelled' : ''}`}>{wasCancelled ? 'Cancelamento enviado para a BonifiQ' : 'Venda enviada para a BonifiQ'}</div>
      <div className="success-details">
        <div className="success-details-row"><span>Valor pago</span><span>{orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        {Boolean(orderResult.coupon) && <div className="success-details-row"><span>Cupom utilizado</span><span>{String(orderResult.coupon)}</span></div>}
        {showEstimatedBonus && <div className="success-details-row points-earned"><span>🎉 Pontos ganhos nesta venda</span><span>+{bonus.estimatedPoints} pontos</span></div>}
        {showEstimatedBonus && bonus.estimatedCashback > 0 && <div className="success-details-row points-earned cashback-earned"><span>Cashback ganho nesta venda</span><span>{bonus.estimatedCashbackFormatted}</span></div>}
      </div>
      <button className="btn btn-primary" onClick={onNewSale} style={{ width: '100%' }}>Iniciar nova venda</button>
      <button className="btn btn-secondary" onClick={onViewOrders} style={{ width: '100%', marginTop: 12 }}>Ver pedidos feitos</button>
    </div>
    <section className="confirmation-order-actions" aria-labelledby="confirmation-order-actions-title">
      <div className="confirmation-order-actions-heading">
        <h2 id="confirmation-order-actions-title">Gerenciar este pedido</h2>
        <p>Cancele o pedido inteiro ou informe a quantidade dos itens que deseja cancelar.</p>
      </div>
      {notice && <div className={`orders-notice ${notice.type}`}>{notice.message}</div>}
      <OrderCard order={order} onCancelOrder={onCancelOrder} onPartialCancel={onPartialCancel} isProcessing={isProcessing} processingOrderId={processingOrderId} />
    </section>
  </div>
}
