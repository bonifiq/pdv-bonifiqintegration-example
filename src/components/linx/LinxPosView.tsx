import { BonifiQSection } from '../bonifiq'
import { CartItems, CartTotals, CustomerSelector, PaymentSection, ProductsGrid } from '../pdv'
import { PRODUCTS } from '../../data/products'
import { formatCents } from '../../pdv/money'
import type { useSaleFlow } from '../../pdv/useSaleFlow'

type SaleFlow = ReturnType<typeof useSaleFlow>

interface HeaderProps {
  screen: 'VENDAS' | 'PAGAMENTOS' | 'PEDIDOS' | 'VENDA CONCLUÍDA'
}

interface SaleProps {
  sale: SaleFlow
  discountLabel: string
}

export function LinxPosHeader({ screen }: HeaderProps) {
  const now = new Date()
  return <header className="linxpos-header">
    <div className="linxpos-brand">LINX<span>POS</span></div>
    <strong className="linxpos-screen-name">{screen}</strong>
    <div className="linxpos-terminal-info">
      <span>{now.toLocaleDateString('pt-BR')}</span>
      <span>{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>terminal 01</span>
    </div>
  </header>
}

function LinxActionButton({ icon, label, detail, onClick, disabled = false, emphasis = false }: {
  icon: string
  label: string
  detail?: string
  onClick: () => void
  disabled?: boolean
  emphasis?: boolean
}) {
  return <button type="button" className={`linxpos-action-button${emphasis ? ' primary' : ''}`} aria-label={label} onClick={onClick} disabled={disabled}>
    <span aria-hidden="true">{icon}</span>
    <strong>{label}</strong>
    {detail && <small>{detail}</small>}
  </button>
}

export function LinxPosSale({ sale, discountLabel }: SaleProps) {
  const rewardCancellationPending = sale.integration.retryAction === 'cancel-reward' || sale.integration.retryAction === 'remove-reward'
  const customerName = sale.customer?.name || 'Não identificado'

  return <section className="linxpos-window">
    <div className="linxpos-identification-bar">
      <span><b>Vendedor</b> 2582 · João Silva</span>
      <span><b>Cliente</b> {customerName}</span>
      <span><b>Etapa</b> {sale.currentStep} de 2</span>
    </div>

    {sale.currentStep === 1 ? <div className="linxpos-workspace linxpos-sale-setup">
      <main className="linxpos-main-area">
        <div className="linxpos-section-title">Produtos disponíveis</div>
        <ProductsGrid onAddProduct={sale.addProduct} />
      </main>

      <section className="linxpos-cart-area" data-testid="linxpos-cart">
        <div className="linxpos-section-title">Cliente e itens da venda</div>
        <CustomerSelector selectedCustomer={sale.customer} onSelectCustomer={sale.selectCustomer} />
        <CartItems items={sale.cartItems} onRemoveItem={sale.removeItem} onUpdateQuantity={sale.updateQuantity} />
        <div className="linxpos-setup-total"><span>Subtotal</span><strong>{formatCents(sale.subtotalCents)}</strong></div>
        {sale.cartItems.length > 0 && <button type="button" className="linxpos-inline-button" onClick={sale.clearCart}>Excluir todos os itens</button>}
      </section>

      <aside className="linxpos-action-rail" aria-label="Ações da venda">
        <LinxActionButton icon="💵" label="Pagamento" detail="Avançar" onClick={sale.continueToPayment} disabled={!sale.customer || !sale.cartItems.length} emphasis />
        <LinxActionButton icon="📋" label="Pedidos" detail={`${sale.orders.length} registrado(s)`} onClick={sale.viewOrders} />
      </aside>
    </div> : <div className="linxpos-workspace linxpos-payment-workspace">
      <main className="linxpos-main-area linxpos-payment-area">
        <div className="linxpos-section-title">Formas de pagamento</div>
        <div className="linxpos-payment-customer">
          <CustomerSelector selectedCustomer={sale.customer} onSelectCustomer={sale.selectCustomer} readOnly />
        </div>
        <div className="linxpos-payment-columns">
          <PaymentSection subtotalCents={sale.subtotalCents} manualDiscountCents={sale.appliedManualDiscountCents} totalCents={sale.totalCents} onManualDiscountChange={sale.changeManualDiscount} disabled={sale.isBusy || Boolean(sale.integration.redeem)} />
          <BonifiQSection rewardsData={sale.integration.rewards} loading={sale.integration.phase === 'loading-rewards'} selectedReward={sale.integration.selectedReward} catalogProducts={PRODUCTS} onConfirmReward={sale.confirmReward} onRemoveReward={sale.removeReward} isRedeemed={Boolean(sale.integration.redeem)} canRemoveReward={Boolean(sale.integration.redeem) && !sale.isBusy} disabled={sale.isBusy || Boolean(sale.integration.redeem)} />
        </div>
        <div className="linxpos-payment-summary">
          <div className="linxpos-sale-details">
            <strong>Detalhes da venda</strong>
            <span>Venda bruta <b>{formatCents(sale.subtotalCents)}</b></span>
            <span>Desconto manual <b>{formatCents(sale.appliedManualDiscountCents)}</b></span>
            <span>Desconto BonifiQ <b>{formatCents(sale.bonifiqDiscountCents)}</b></span>
          </div>
          <CartTotals subtotalCents={sale.subtotalCents} manualDiscountCents={sale.appliedManualDiscountCents} bonifiqBaseCents={sale.bonifiqBaseCents} bonifiqDiscountCents={sale.bonifiqDiscountCents} bonifiqDiscountLabel={discountLabel} totalCents={sale.totalCents} />
        </div>
        {sale.integration.redeem && <div className="linxpos-redeem-note">Ao voltar, o benefício será estornado antes de liberar a edição da venda.</div>}
      </main>

      <aside className="linxpos-action-rail" aria-label="Ações do pagamento">
        <LinxActionButton icon="↩" label="Voltar" detail={sale.integration.phase === 'cancelling-reward' ? 'Estornando...' : 'Editar venda'} onClick={() => void sale.backToSelection()} disabled={sale.isBusy} />
        <LinxActionButton icon="✓" label="Finalizar" detail="Pagamento em dinheiro" onClick={() => void sale.finalizeSale()} disabled={sale.isBusy || rewardCancellationPending || Boolean(sale.integration.selectedReward && !sale.integration.redeem)} emphasis />
        <LinxActionButton icon="📋" label="Pedidos" detail={`${sale.orders.length} registrado(s)`} onClick={sale.viewOrders} disabled={sale.isBusy} />
      </aside>
    </div>}
  </section>
}
