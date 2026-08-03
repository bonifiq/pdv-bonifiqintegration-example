import { useState } from 'react'
import { getProductRewardDescription, isProductReward } from './bonifiq/rewardRules'
import { DeveloperToolbar, IntegrationInspector, IntegrationNotice, BonifiQSection, RewardsSummaryModal, ValidationModal } from './components/bonifiq'
import { Header, StepIndicator, CustomerSelector, ProductsGrid, CartItems, CartTotals, PaymentSection, SuccessScreen, OrdersScreen } from './components/pdv'
import { PRODUCTS } from './data/products'
import { formatCents } from './pdv/money'
import { useSaleFlow } from './pdv/useSaleFlow'

function App() {
  const sale = useSaleFlow()
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const reward = sale.integration.selectedReward
  const discountLabel = !reward ? '' : reward.isCashback ? 'Cashback BonifiQ' : isProductReward(reward) ? `${getProductRewardDescription(reward)} BonifiQ` : 'Desconto BonifiQ'
  const validationError = sale.integration.retryAction === 'validation' ? sale.integration.error : null
  const globalError = sale.integration.phase === 'error' && sale.integration.retryAction !== 'validation' ? sale.integration.error : null

  const shell = (content: React.ReactNode) => <>
    <Header />
    <div className="container">
      <DeveloperToolbar activeScenario={sale.activeScenario} onScenarioChange={sale.applyScenario} onOpenInspector={() => setInspectorOpen(true)} />
      {content}
    </div>
    <IntegrationInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
  </>

  if (sale.showOrders) return shell(<OrdersScreen orders={sale.orders} onBack={sale.backToPdv} onNewSale={sale.newSale} onCancelOrder={sale.cancelOrder} onPartialCancel={sale.partialCancel} isProcessing={Boolean(sale.processingOrderId)} processingOrderId={sale.processingOrderId} notice={sale.orderNotice} />)
  if (sale.orderResult) {
    const confirmedOrder = sale.orders.find(order => order.originalId === sale.orderResult?.originalId)
    if (confirmedOrder) return shell(<SuccessScreen order={confirmedOrder} orderResult={sale.orderResult} onNewSale={sale.newSale} onViewOrders={sale.viewOrders} onCancelOrder={sale.cancelOrder} onPartialCancel={sale.partialCancel} isProcessing={Boolean(sale.processingOrderId)} processingOrderId={sale.processingOrderId} notice={sale.orderNotice} />)
  }

  return shell(<>
    <div className="pdv-actions-bar"><button className="btn btn-secondary" onClick={sale.viewOrders}>Pedidos feitos ({sale.orders.length})</button></div>
    <StepIndicator currentStep={sale.currentStep} />
    {globalError && <IntegrationNotice message={globalError} canRetry={Boolean(sale.integration.retryAction)} canDismiss={sale.integration.retryAction !== 'cancel-reward'} onRetry={() => void sale.retryIntegration()} onDismiss={sale.dismissIntegrationError} />}

    {sale.currentStep === 1 ? <div className="pdv-layout sale-setup-layout">
      <ProductsGrid onAddProduct={sale.addProduct} />
      <aside className="cart-section card">
        <div className="cart-header"><div><span className="panel-eyebrow">Etapa 1 de 2</span><h2>🧾 Cliente e carrinho</h2></div>{sale.cartItems.length > 0 && <button className="btn btn-secondary" onClick={sale.clearCart}>Limpar</button>}</div>
        <CustomerSelector selectedCustomer={sale.customer} onSelectCustomer={sale.selectCustomer} />
        <CartItems items={sale.cartItems} onRemoveItem={sale.removeItem} onUpdateQuantity={sale.updateQuantity} />
        {sale.cartItems.length > 0 && <div className="setup-subtotal"><span>Subtotal</span><strong>{formatCents(sale.subtotalCents)}</strong></div>}
        <div className="setup-next-action"><button className="btn btn-primary" onClick={sale.continueToPayment} disabled={!sale.customer || !sale.cartItems.length}>Ir para pagamento <span>→</span></button>{(!sale.customer || !sale.cartItems.length) && <small>Selecione o cliente e adicione pelo menos um produto.</small>}</div>
      </aside>
    </div> : <div className="pdv-layout checkout-layout">
      <section className="checkout-review card">
        <div className="checkout-review-header"><div><span className="panel-eyebrow">Resumo da compra</span><h2>Cliente e produtos</h2></div><button className="btn btn-secondary" onClick={() => void sale.backToSelection()} disabled={sale.isBusy}>{sale.integration.phase === 'cancelling-reward' ? '⏳ Estornando benefício...' : '← Editar seleção'}</button></div>
        <CustomerSelector selectedCustomer={sale.customer} onSelectCustomer={sale.selectCustomer} readOnly />
        <CartItems items={sale.cartItems} onRemoveItem={sale.removeItem} onUpdateQuantity={sale.updateQuantity} readOnly />
        {sale.integration.redeem && <div className="checkout-edit-lock">↩️ Ao editar a seleção, o benefício será estornado automaticamente.</div>}
      </section>
      <aside className="cart-section checkout-panel card">
        <PaymentSection subtotalCents={sale.subtotalCents} manualDiscountCents={sale.appliedManualDiscountCents} totalCents={sale.totalCents} onManualDiscountChange={sale.changeManualDiscount} disabled={sale.isBusy || Boolean(sale.integration.redeem)} />
        <BonifiQSection rewardsData={sale.integration.rewards} loading={sale.integration.phase === 'loading-rewards'} selectedReward={sale.integration.selectedReward} catalogProducts={PRODUCTS} onConfirmReward={sale.confirmReward} isRedeemed={Boolean(sale.integration.redeem)} disabled={sale.isBusy || Boolean(sale.integration.redeem)} />
        <CartTotals subtotalCents={sale.subtotalCents} manualDiscountCents={sale.appliedManualDiscountCents} bonifiqBaseCents={sale.bonifiqBaseCents} bonifiqDiscountCents={sale.bonifiqDiscountCents} bonifiqDiscountLabel={discountLabel} totalCents={sale.totalCents} />
        <div className="cart-actions"><button className="btn btn-success" onClick={() => void sale.finalizeSale()} disabled={sale.isBusy || sale.integration.retryAction === 'cancel-reward' || Boolean(sale.integration.selectedReward && !sale.integration.redeem)}>{sale.integration.phase === 'submitting-order' ? '⏳ Processando...' : '✅ Finalizar venda em dinheiro'}</button>{sale.integration.selectedReward && !sale.integration.redeem && <small className="cart-action-hint">Conclua ou cancele o resgate antes de finalizar.</small>}</div>
      </aside>
    </div>}

    {sale.showRewardsSummary && sale.customer && <RewardsSummaryModal rewardsSummary={sale.integration.rewards} isLoading={sale.integration.phase === 'loading-rewards'} error={sale.integration.retryAction === 'rewards' ? sale.integration.error : null} onConfirm={sale.closeRewardsSummary} />}
    {sale.validationOpen && sale.customer && <ValidationModal customer={sale.customer} phase={sale.integration.phase} challenge={sale.integration.challenge} error={validationError} onValidate={sale.validateCode} onCancel={sale.cancelPendingReward} />}
  </>)
}

export default App
