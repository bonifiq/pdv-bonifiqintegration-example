import { useState } from 'react'

// Componentes do PDV (puro PDV, sem BonifiQ)
import { 
  Header, 
  StepIndicator, 
  CustomerSelector, 
  ProductsGrid, 
  CartItems, 
  CartTotals, 
  PaymentSection,
  SuccessScreen,
  OrdersScreen
} from './components/pdv'

// Componentes da BonifiQ (integração separada)
import { BonifiQSection, RewardsSummaryModal, ValidationModal } from './components/bonifiq'
import { PRODUCTS } from './data/products'

// Serviço BonifiQ
import * as BonifiQ from './services/bonifiq'

/**
 * ===========================================================================
 * APP PRINCIPAL - Orquestra PDV + BonifiQ
 * ===========================================================================
 * 
 * Este componente apenas gerencia o estado e conecta os componentes do PDV
 * com os componentes da BonifiQ, sem misturar as responsabilidades.
 */
function App() {
  // =========================================================================
  // ESTADO DO PDV (sem BonifiQ)
  // =========================================================================
  const [currentStep, setCurrentStep] = useState(1)
  const [customer, setCustomer] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [orderResult, setOrderResult] = useState(null)
  const [orders, setOrders] = useState([])
  const [showOrdersScreen, setShowOrdersScreen] = useState(false)
  const [orderNotice, setOrderNotice] = useState(null)
  const [processingOrderId, setProcessingOrderId] = useState(null)
  const [manualDiscount, setManualDiscount] = useState(0)

  // =========================================================================
  // ESTADO DA INTEGRAÇÃO BONIFIQ
  // =========================================================================
  const [selectedReward, setSelectedReward] = useState(null)
  const [cashbackValue, setCashbackValue] = useState(0)
  const [redeemResult, setRedeemResult] = useState(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [showRewardsSummaryModal, setShowRewardsSummaryModal] = useState(false)
  const [customerRewardsSummary, setCustomerRewardsSummary] = useState(null)
  const [isRewardsSummaryLoading, setIsRewardsSummaryLoading] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingRedeem, setPendingRedeem] = useState(null)
  const [isCancellingReward, setIsCancellingReward] = useState(false)

  // =========================================================================
  // CÁLCULOS DO CARRINHO
  // =========================================================================
  const roundCurrency = (value) => Number(value.toFixed(2))
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const appliedManualDiscount = roundCurrency(Math.min(Math.max(0, manualDiscount), subtotal))
  const bonifiqBaseTotal = roundCurrency(subtotal - appliedManualDiscount)
  
  // Calcula desconto baseado na recompensa selecionada
  let bonifiqDiscount = 0
  let bonifiqDiscountLabel = ''
  if (selectedReward && !redeemResult) {
    if (selectedReward.isCashback) {
      bonifiqDiscount = roundCurrency(Math.min(cashbackValue, bonifiqBaseTotal))
      bonifiqDiscountLabel = 'Cashback BonifiQ'
    } else if (selectedReward.rewardType === 0) {
      bonifiqDiscount = roundCurrency(bonifiqBaseTotal * (selectedReward.value / 100))
      bonifiqDiscountLabel = `Desconto ${selectedReward.value}% BonifiQ`
    } else if (BonifiQ.isProductDiscountReward(selectedReward)) {
      // O produto e o desconto efetivo entram no carrinho somente após o resgate.
      bonifiqDiscount = 0
      bonifiqDiscountLabel = BonifiQ.getProductDiscountDescription(selectedReward)
    } else {
      bonifiqDiscount = roundCurrency(Math.min(selectedReward.value, bonifiqBaseTotal))
      bonifiqDiscountLabel = 'Desconto BonifiQ'
    }
  } else if (redeemResult) {
    const redeemData = redeemResult.data || redeemResult.result
    // Em recompensa de produto, o desconto já está no preço da linha do carrinho.
    bonifiqDiscount = BonifiQ.isProductDiscountReward(selectedReward)
      ? 0
      : roundCurrency(Math.min(BonifiQ.calculateDiscount(redeemData, bonifiqBaseTotal), bonifiqBaseTotal))
    bonifiqDiscountLabel = BonifiQ.isProductDiscountReward(selectedReward)
      ? `${BonifiQ.getProductDiscountDescription(selectedReward)} BonifiQ`
      : 'Desconto BonifiQ (aplicado)'
  }

  const totalDiscount = roundCurrency(appliedManualDiscount + bonifiqDiscount)
  const total = roundCurrency(Math.max(0, bonifiqBaseTotal - bonifiqDiscount))

  const calculateOrderTotals = (items, originalSubtotal, originalDiscount) => {
    const activeSubtotal = items.reduce((sum, item) => {
      const activeQuantity = Math.max(0, item.quantity - (item.cancelledQuantity || 0))
      return sum + (item.price * activeQuantity)
    }, 0)
    const proportionalDiscount = originalSubtotal > 0
      ? originalDiscount * (activeSubtotal / originalSubtotal)
      : 0
    const currentDiscount = Math.min(activeSubtotal, proportionalDiscount)
    return {
      activeSubtotal,
      currentTotal: Math.max(0, Number((activeSubtotal - currentDiscount).toFixed(2))),
    }
  }

  const buildOrderRecord = (orderData, orderResultData, orderItems, originalSubtotal, originalDiscount) => {
    const originalTotal = orderData.orderTotal

    return {
      originalId: orderData.originalId,
      customer: orderData.customer,
      coupon: orderData.coupon,
      orderData,
      bonifiqResult: orderResultData,
      originalSubtotal,
      originalDiscount,
      originalTotal,
      currentTotal: originalTotal,
      status: 'Concluído',
      statusClass: 'completed',
      items: orderItems.map(item => ({
        id: item.id,
        originalId: item.originalId || item.id,
        name: item.name,
        quantity: item.quantity,
        cancelledQuantity: 0,
        price: item.price,
        originalPrice: item.originalPrice ?? item.price,
        icon: item.icon,
        brand: item.brand || null,
        category: item.category || null,
        isRewardProduct: item.isRewardProduct || false,
        rewardLabel: item.rewardLabel || null,
      })),
      cancellations: [],
    }
  }

  // =========================================================================
  // HANDLERS DO PDV
  // =========================================================================
  const handleSelectCustomer = async (cust) => {
    setCustomer(cust)
    setOrderNotice(null)
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
    setCustomerRewardsSummary(null)
    setShowRewardsSummaryModal(false)
    setIsRewardsSummaryLoading(false)
    setManualDiscount(0)

    if (cust) {
      setShowRewardsSummaryModal(true)
      setIsRewardsSummaryLoading(true)

      try {
        // ======== CHAMADA BONIFIQ: /rewards/available ========
        const result = await BonifiQ.getAvailableRewards(
          cust.document,
          0,
          0
        )
        setCustomerRewardsSummary(result)
      } catch (err) {
        console.error(err)
        setCustomerRewardsSummary({
          availablePoints: 0,
          availableCashback: 0,
          errorMessage: 'Erro ao consultar saldo BonifiQ',
        })
      } finally {
        setIsRewardsSummaryLoading(false)
      }
    } else {
      setCurrentStep(1)
    }
  }

  const handleAddProduct = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    // Reseta recompensa quando carrinho muda
    setManualDiscount(0)
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
  }

  const handleRemoveItem = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId))
    setManualDiscount(0)
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
  }

  const handleUpdateQuantity = (itemId, newQty) => {
    if (newQty < 1) {
      handleRemoveItem(itemId)
      return
    }
    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQty } : item
    ))
    setManualDiscount(0)
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
  }

  const handleClearCart = () => {
    setCartItems([])
    setManualDiscount(0)
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
  }

  // =========================================================================
  // HANDLERS DA INTEGRAÇÃO BONIFIQ
  // =========================================================================
  const handleRewardSelected = (reward) => {
    setSelectedReward(reward)
    setRedeemResult(null)
    if (!reward) setPendingRedeem(null)
  }

  const handleManualDiscountChange = (value) => {
    const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : 0
    setManualDiscount(roundCurrency(Math.min(Math.max(0, normalizedValue), subtotal)))
    setSelectedReward(null)
    setRedeemResult(null)
    setPendingRedeem(null)
  }

  const handleContinueToPayment = () => {
    if (!customer || cartItems.length === 0) return
    setCurrentStep(2)
  }

  const handleBackToSelection = async () => {
    if (isProcessing || isCancellingReward) return

    if (redeemResult) {
      const redeemData = redeemResult.data || redeemResult.result
      const redeemedRewardId = redeemData?.rewardId

      if (!redeemedRewardId) {
        alert('Não foi possível identificar a recompensa para realizar o estorno')
        return
      }

      setIsCancellingReward(true)
      let cancelResult
      try {
        cancelResult = await BonifiQ.cancelReward(redeemedRewardId)
      } catch (error) {
        console.error(error)
        alert('Erro de comunicação ao estornar a recompensa')
        setIsCancellingReward(false)
        return
      }

      if (cancelResult.hasError) {
        alert('Erro ao estornar recompensa: ' + (cancelResult.errorMessage || cancelResult.errorCode))
        setIsCancellingReward(false)
        return
      }

      // O produto concedido pelo resgate deixa de existir no carrinho após o estorno.
      setCartItems(prev => prev.filter(item => !item.isRewardProduct))
    }

    setManualDiscount(0)
    setSelectedReward(null)
    setCashbackValue(0)
    setRedeemResult(null)
    setPendingRedeem(null)
    setCurrentStep(1)
    setIsCancellingReward(false)
  }

  const findRewardCatalogProduct = (reward) => PRODUCTS.find(product =>
    String(product.id).toLowerCase() === String(reward?.externalProductId).toLowerCase()
  )

  const buildRewardCartItem = (reward, redeemData, catalogProduct) => {
    const quantity = 1
    const finalUnitPrice = BonifiQ.calculateProductRewardUnitPrice(
      reward,
      redeemData,
      catalogProduct.price,
      quantity
    )

    return {
      ...catalogProduct,
      id: `reward-${redeemData.rewardId}-${redeemData.externalProductId}`,
      originalId: redeemData.externalProductId,
      name: reward.productDisplayName || catalogProduct.name,
      quantity,
      price: finalUnitPrice,
      originalPrice: catalogProduct.price,
      productDiscountTotal: BonifiQ.isFreeGiftReward(reward)
        ? catalogProduct.price * quantity
        : Number(redeemData.productDiscountTotal || 0),
      isRewardProduct: true,
      rewardLabel: BonifiQ.getProductDiscountDescription(reward),
    }
  }

  const handleRedeemReward = async (reward, requestedCashbackValue = null) => {
    const rewardToRedeem = reward || selectedReward
    if (!rewardToRedeem || redeemResult || isProcessing) return

    const cashbackToRedeem = rewardToRedeem.isCashback
      ? Number(requestedCashbackValue ?? rewardToRedeem.maxCashbackForCurrentPurchase)
      : null

    setSelectedReward(rewardToRedeem)
    if (rewardToRedeem.isCashback) setCashbackValue(cashbackToRedeem)
    setPendingRedeem({ reward: rewardToRedeem, cashbackValue: cashbackToRedeem })

    // Precisa validar? (em produção, verificar shouldValidateCustomer)
    const needsValidation = true // Simulado

    if (needsValidation) {
      setTransactionId(`PDV-${Date.now()}`)
      setShowValidationModal(true)
      return
    }

    await processRedeem(rewardToRedeem, cashbackToRedeem)
  }

  const handleFinalizeSale = async () => {
    if (cartItems.length === 0 || isProcessing || isCancellingReward) return

    // O fechamento nunca dispara um resgate implicitamente.
    if (selectedReward && !redeemResult) {
      alert('Aplique ou remova o benefício BonifiQ antes de finalizar a venda')
      return
    }

    const redeemData = redeemResult?.data || redeemResult?.result
    await processOrder(redeemData?.externalCode || null)
  }

  const handleValidationComplete = async () => {
    setShowValidationModal(false)
    await processRedeem(pendingRedeem?.reward, pendingRedeem?.cashbackValue)
  }

  const handleValidationCancel = () => {
    setShowValidationModal(false)
    setPendingRedeem(null)
    setSelectedReward(null)
    setCashbackValue(0)
    setCurrentStep(2)
  }

  // =========================================================================
  // PROCESSAMENTO BONIFIQ
  // =========================================================================
  const processRedeem = async (rewardOverride = null, cashbackOverride = null) => {
    const rewardToRedeem = rewardOverride || pendingRedeem?.reward || selectedReward
    const cashbackToRedeem = cashbackOverride ?? pendingRedeem?.cashbackValue ?? cashbackValue
    if (!rewardToRedeem) return

    setIsProcessing(true)

    const originalKey = `${rewardToRedeem.id}-${customer.document}-${Date.now()}`

    const isProductReward = BonifiQ.isProductDiscountReward(rewardToRedeem)
    const catalogProduct = isProductReward ? findRewardCatalogProduct(rewardToRedeem) : null

    if (isProductReward && !catalogProduct) {
      alert('O produto da recompensa não existe no catálogo deste PDV')
      setPendingRedeem(null)
      setSelectedReward(null)
      setIsProcessing(false)
      return
    }

    // RewardType=5 usa o endpoint dedicado do PR #2310.
    const result = isProductReward
      ? await BonifiQ.redeemProductDiscountReward(
          rewardToRedeem.id,
          customer.document,
          {
            externalProductId: rewardToRedeem.externalProductId,
            quantity: 1,
            productPrice: catalogProduct.price,
            productDiscountPrice: null,
            hasPromotion: false,
          },
          originalKey
        )
      : await BonifiQ.redeemReward(
          rewardToRedeem.id,
          customer.document,
          rewardToRedeem.isCashback ? cashbackToRedeem : null,
          originalKey
        )

    if (result.hasError) {
      alert('Erro ao resgatar recompensa: ' + (result.errorMessage || result.errorCode))
      setPendingRedeem(null)
      setSelectedReward(null)
      setIsProcessing(false)
      return
    }

    setRedeemResult(result)
    
    // Suporta tanto formato mock (data) quanto produção (result)
    const redeemData = result.data || result.result

    if (isProductReward) {
      const rewardCartItem = buildRewardCartItem(rewardToRedeem, redeemData, catalogProduct)
      setCartItems(prev => [...prev, rewardCartItem])
    }

    // O resgate termina aqui. O pedido só será criado pela ação explícita de finalizar.
    setPendingRedeem(null)
    setCurrentStep(2)
    setIsProcessing(false)
  }

  const processOrder = async (couponCode = null, options = {}) => {
    setIsProcessing(true)

    const orderId = `PDV-${Date.now()}`
    const now = new Date().toISOString()
    const orderItems = options.orderItems || cartItems
    const orderSubtotal = roundCurrency(orderItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    ))
    const orderManualDiscount = roundCurrency(Math.min(appliedManualDiscount, orderSubtotal))
    const orderBonifiqBaseTotal = roundCurrency(orderSubtotal - orderManualDiscount)
    const orderBonifiqDiscount = roundCurrency(Math.min(
      options.bonifiqDiscountOverride ?? bonifiqDiscount,
      orderBonifiqBaseTotal
    ))
    const orderTotalDiscount = roundCurrency(orderManualDiscount + orderBonifiqDiscount)
    const orderTotal = roundCurrency(Math.max(0, orderBonifiqBaseTotal - orderBonifiqDiscount))

    // ======== CHAMADA BONIFIQ: /orders ========
    const orderData = {
      originalId: orderId,
      orderPlacementDate: now,
      orderCompletedDate: now,
      orderStatus: 'Concluído',
      isCancelledOrReturned: false,
      isCompleted: true,
      orderTotal, // Valor líquido pago (produtos - desconto manual - BonifiQ)
      coupon: couponCode, // ExternalCode da recompensa
      customer: {
        originalId: customer.document,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        isEnrolled: true,
      },
      products: orderItems.map(item => ({
        originalId: item.originalId || item.id,
        title: item.name,  // API espera "Title", não "Name"
        quantity: item.quantity,
        price: item.price,
        // ProductPrice é o valor efetivamente pago pela linha no contrato /orders.
        productPrice: item.price,
        productDiscountPrice: item.originalPrice > item.price ? item.price : null,
        isActive: true,
        url: null,
        imageUrl: null,
        productBrand: item.brand || null,
        productCategory: item.category || null,
      })),
      // Informações adicionais do PDV
      paymentMethod: {
        originalId: 'DINHEIRO',
        name: 'Dinheiro',
      },
      branch: {
        originalId: 'LOJA-001',
        name: 'Loja Centro',
      },
      salesPerson: {
        originalId: 'VENDEDOR-001',
        name: 'João Silva',
      },
    }

    const result = await BonifiQ.createOrder(orderData)

    if (result.hasError) {
      alert('Erro ao registrar pedido: ' + result.errorMessage)
      setIsProcessing(false)
      return
    }

    // Suporta tanto formato mock (data) quanto produção (result)
    const orderResultData = result.data || result.result || { 
      originalId: orderId, 
      orderTotal
    }
    const orderRecord = buildOrderRecord(
      orderData,
      orderResultData,
      orderItems,
      orderSubtotal,
      orderTotalDiscount
    )
    setOrders(prev => [orderRecord, ...prev])
    setOrderResult(orderResultData)
    setIsProcessing(false)
  }

  // =========================================================================
  // NOVA VENDA
  // =========================================================================
  const handleNewSale = () => {
    setCurrentStep(1)
    setCustomer(null)
    setCartItems([])
    setManualDiscount(0)
    setSelectedReward(null)
    setCashbackValue(0)
    setRedeemResult(null)
    setPendingRedeem(null)
    setOrderResult(null)
    setCustomerRewardsSummary(null)
    setShowRewardsSummaryModal(false)
    setIsRewardsSummaryLoading(false)
    setTransactionId('')
    setIsCancellingReward(false)
    setShowOrdersScreen(false)
    setOrderNotice(null)
  }

  const handleViewOrders = () => {
    setOrderResult(null)
    setShowOrdersScreen(true)
    setOrderNotice(null)
  }

  const handleBackToPdv = () => {
    setShowOrdersScreen(false)
    setOrderNotice(null)
  }

  const handleCancelOrder = async (order) => {
    setProcessingOrderId(order.originalId)
    setOrderNotice(null)

    const cancelledDate = new Date().toISOString()
    const result = await BonifiQ.cancelOrder(order.originalId, cancelledDate, 'Cancelado')

    if (result.hasError) {
      setOrderNotice({
        type: 'error',
        message: 'Erro ao cancelar pedido na BonifiQ: ' + (result.errorMessage || result.errorCode || 'erro desconhecido'),
      })
      setProcessingOrderId(null)
      return
    }

    setOrders(prev => prev.map(existingOrder => {
      if (existingOrder.originalId !== order.originalId) return existingOrder

      return {
        ...existingOrder,
        status: 'Cancelado',
        statusClass: 'cancelled',
        currentTotal: 0,
        items: existingOrder.items.map(item => ({
          ...item,
          cancelledQuantity: item.quantity,
        })),
        cancellations: [
          ...existingOrder.cancellations,
          {
            type: 'total',
            cancelledAt: cancelledDate,
          },
        ],
      }
    }))
    setOrderNotice({ type: 'success', message: 'Cancelamento enviado para a BonifiQ' })
    setProcessingOrderId(null)
  }

  const handlePartialCancel = async (order, draftQuantities) => {
    const selectedQuantities = order.items.reduce((acc, item) => {
      const activeQuantity = Math.max(0, item.quantity - (item.cancelledQuantity || 0))
      const quantity = Math.max(0, Math.min(activeQuantity, Number(draftQuantities[item.id]) || 0))
      if (quantity > 0) acc[item.id] = quantity
      return acc
    }, {})

    if (Object.keys(selectedQuantities).length === 0) return

    const remainingItems = order.items.map(item => ({
      ...item,
      cancelledQuantity: (item.cancelledQuantity || 0) + (selectedQuantities[item.id] || 0),
    }))
    const allItemsCancelled = remainingItems.every(item => item.cancelledQuantity >= item.quantity)

    if (allItemsCancelled) {
      await handleCancelOrder(order)
      return
    }

    setProcessingOrderId(order.originalId)
    setOrderNotice(null)

    const { currentTotal } = calculateOrderTotals(
      remainingItems,
      order.originalSubtotal,
      order.originalDiscount
    )
    const now = new Date().toISOString()
    const valueToRefund = Math.max(0, Number((order.currentTotal - currentTotal).toFixed(2)))
    const cancelKey = `PARTIAL-${order.originalId}-${Date.now()}`

    if (valueToRefund <= 0) {
      setOrderNotice({
        type: 'error',
        message: 'O valor do cancelamento parcial precisa ser maior que zero',
      })
      setProcessingOrderId(null)
      return
    }

    const result = await BonifiQ.partialCancelOrder(order.originalId, valueToRefund, cancelKey)

    if (result.hasError) {
      setOrderNotice({
        type: 'error',
        message: 'Erro ao cancelar parcialmente na BonifiQ: ' + (result.errorMessage || result.errorCode || 'erro desconhecido'),
      })
      setProcessingOrderId(null)
      return
    }

    setOrders(prev => prev.map(existingOrder => {
      if (existingOrder.originalId !== order.originalId) return existingOrder

      return {
        ...existingOrder,
        orderData: {
          ...existingOrder.orderData,
          orderStatus: 'Parcialmente cancelado',
          orderTotal: currentTotal,
        },
        bonifiqResult: result.data || result.result || existingOrder.bonifiqResult,
        currentTotal,
        status: 'Parcialmente cancelado',
        statusClass: 'partial',
        items: remainingItems,
        cancellations: [
          ...existingOrder.cancellations,
          {
            type: 'partial',
            cancelledAt: now,
            items: selectedQuantities,
            valueToRefund,
            cancelKey,
          },
        ],
      }
    }))
    setOrderNotice({ type: 'success', message: 'Cancelamento parcial enviado para a BonifiQ' })
    setProcessingOrderId(null)
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  if (showOrdersScreen) {
    return (
      <>
        <Header />
        <div className="container">
          <OrdersScreen
            orders={orders}
            onBack={handleBackToPdv}
            onNewSale={handleNewSale}
            onCancelOrder={handleCancelOrder}
            onPartialCancel={handlePartialCancel}
            isProcessing={!!processingOrderId}
            processingOrderId={processingOrderId}
            notice={orderNotice}
          />
        </div>
      </>
    )
  }
  
  // Tela de sucesso
  if (orderResult) {
    return (
      <>
        <Header />
        <div className="container">
          <SuccessScreen
            orderResult={orderResult}
            onNewSale={handleNewSale}
            onViewOrders={handleViewOrders}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="pdv-actions-bar">
          <button className="btn btn-secondary" onClick={handleViewOrders}>
            Pedidos feitos ({orders.length})
          </button>
        </div>
        <StepIndicator currentStep={currentStep} />
        
        {currentStep === 1 ? (
          <div className="pdv-layout sale-setup-layout">
            <div>
              <ProductsGrid onAddProduct={handleAddProduct} />
            </div>

            <aside className="cart-section card">
              <div className="cart-header">
                <div>
                  <span className="panel-eyebrow">Etapa 1 de 2</span>
                  <h2>🧾 Cliente e carrinho</h2>
                </div>
                {cartItems.length > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleClearCart}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              <CustomerSelector
                selectedCustomer={customer}
                onSelectCustomer={handleSelectCustomer}
              />

              <CartItems
                items={cartItems}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
              />

              {cartItems.length > 0 && (
                <div className="setup-subtotal">
                  <span>Subtotal</span>
                  <strong>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
              )}

              <div className="setup-next-action">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleContinueToPayment}
                  disabled={!customer || cartItems.length === 0}
                >
                  Ir para pagamento <span>→</span>
                </button>
                {(!customer || cartItems.length === 0) && (
                  <small>
                    {!customer && cartItems.length === 0
                      ? 'Selecione o cliente e adicione produtos.'
                      : !customer
                        ? 'Selecione um cliente para continuar.'
                        : 'Adicione pelo menos um produto.'}
                  </small>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="pdv-layout checkout-layout">
            <section className="checkout-review card">
              <div className="checkout-review-header">
                <div>
                  <span className="panel-eyebrow">Resumo da compra</span>
                  <h2>Cliente e produtos</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBackToSelection}
                  disabled={isProcessing || isCancellingReward}
                >
                  {isCancellingReward ? '⏳ Estornando benefício...' : '← Editar seleção'}
                </button>
              </div>

              <CustomerSelector
                selectedCustomer={customer}
                onSelectCustomer={handleSelectCustomer}
                readOnly
              />
              <CartItems
                items={cartItems}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                readOnly
              />
              {redeemResult && (
                <div className="checkout-edit-lock">
                  ↩️ Ao editar a seleção, o benefício será estornado automaticamente.
                </div>
              )}
            </section>

            <aside className="cart-section checkout-panel card">
              <PaymentSection
                subtotal={subtotal}
                manualDiscount={appliedManualDiscount}
                total={total}
                onManualDiscountChange={handleManualDiscountChange}
                disabled={isProcessing || !!redeemResult}
              />

              <BonifiQSection
                customer={customer}
                purchaseValue={bonifiqBaseTotal}
                discountValue={appliedManualDiscount}
                cartItems={cartItems}
                catalogProducts={PRODUCTS}
                selectedReward={selectedReward}
                onRewardSelected={handleRewardSelected}
                onCashbackValueChange={setCashbackValue}
                onRedeem={handleRedeemReward}
                isRedeemed={!!redeemResult}
                isProcessing={isProcessing}
                disabled={isProcessing || !!redeemResult}
              />

              <CartTotals
                subtotal={subtotal}
                manualDiscount={appliedManualDiscount}
                bonifiqBaseTotal={bonifiqBaseTotal}
                bonifiqDiscount={bonifiqDiscount}
                bonifiqDiscountLabel={bonifiqDiscountLabel}
                total={total}
              />

              <div className="cart-actions">
                <button
                  className="btn btn-success"
                  onClick={handleFinalizeSale}
                  disabled={isProcessing || isCancellingReward || (!!selectedReward && !redeemResult)}
                  style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                >
                  {isProcessing ? '⏳ Processando...' : '✅ Finalizar Venda em Dinheiro'}
                </button>
                {selectedReward && !redeemResult && (
                  <small className="cart-action-hint">
                    Conclua ou cancele a validação do benefício antes de finalizar.
                  </small>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Resumo BonifiQ ao identificar CPF */}
      {showRewardsSummaryModal && (
        <RewardsSummaryModal
          rewardsSummary={customerRewardsSummary}
          isLoading={isRewardsSummaryLoading}
          onConfirm={() => setShowRewardsSummaryModal(false)}
        />
      )}

      {/* Modal de Validação BonifiQ */}
      {showValidationModal && (
        <ValidationModal
          customer={customer}
          transactionId={transactionId}
          onValidated={handleValidationComplete}
          onCancel={handleValidationCancel}
        />
      )}
    </>
  )
}

export default App
