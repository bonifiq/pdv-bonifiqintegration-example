import type { Notice, OrderRecord } from '../../pdv/types'
import { OrderCard } from './OrderCard'

interface Props {
  orders: OrderRecord[]
  onBack: () => void
  onNewSale: () => void
  onCancelOrder: (order: OrderRecord) => Promise<void>
  onPartialCancel: (order: OrderRecord, draft: Record<string, number>) => Promise<void>
  isProcessing: boolean
  processingOrderId: string | null
  notice: Notice | null
}

export function OrdersScreen({ orders, onBack, onNewSale, onCancelOrder, onPartialCancel, isProcessing, processingOrderId, notice }: Props) {
  return <div className="orders-screen">
    <div className="orders-toolbar"><div><h2>Pedidos feitos</h2><p>Pedidos mantidos em memória nesta sessão do PDV.</p></div><div className="orders-toolbar-actions"><button className="btn btn-secondary" onClick={onBack}>Voltar ao PDV</button><button className="btn btn-primary" onClick={onNewSale}>Nova venda</button></div></div>
    {notice && <div className={`orders-notice ${notice.type}`}>{notice.message}</div>}
    {!orders.length ? <div className="card orders-empty"><h3>Nenhum pedido feito nesta sessão</h3><p>Conclua uma venda para testar cancelamentos.</p></div> : <div className="orders-list">{orders.map(order => <OrderCard key={order.originalId} order={order} onCancelOrder={onCancelOrder} onPartialCancel={onPartialCancel} isProcessing={isProcessing} processingOrderId={processingOrderId} />)}</div>}
  </div>
}
