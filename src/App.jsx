import { useState } from 'react'

// Componentes do PDV (puro PDV, sem BonifiQ)
import { 
  Header, 
  StepIndicator, 
  CustomerSelector, 
  ProductsGrid, 
  CartItems, 
  CartTotals, 
  SuccessScreen,
  OrdersScreen
} from './components/pdv'

// Componentes da BonifiQ (integração separada)
import { BonifiQSection, RewardsSummaryModal, ValidationModal } from './components/bonifiq'

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

  // =========================================================================
  // CÁLCULOS DO CARRINHO
  // =========================================================================
  const roundCurrency = (value) => Number(value.toFixed(2))
  const BIRTHDAY_DISCOUNT_PERCENT = 5
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const birthdayDiscount = roundCurrency(subtotal * (BIRTHDAY_DISCOUNT_PERCENT / 100))
  const bonifiqBaseTotal = roundCurrency(subtotal - birthdayDiscount)
  
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
    } else {
      bonifiqDiscount = roundCurrency(Math.min(selectedReward.value, bonifiqBaseTotal))
      bonifiqDiscountLabel = 'Desconto BonifiQ'
    }
  } else if (redeemResult) {
    bonifiqDiscount = roundCurrency(Math.min(BonifiQ.calculateDiscount(redeemResult.data, bonifiqBaseTotal), bonifiqBaseTotal))
    bonifiqDiscountLabel = 'Desconto BonifiQ (aplicado)'
  }

  const totalDiscount = roundCurrency(birthdayDiscount + bonifiqDiscount)
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

  const buildOrderRecord = (orderData, orderResultData) => {
    const originalSubtotal = subtotal
    const originalTotal = orderData.orderTotal
    const originalDiscount = totalDiscount

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
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        cancelledQuantity: 0,
        price: item.price,
        icon: item.icon,
        brand: item.brand || null,
        category: item.category || null,
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
    setCustomerRewardsSummary(null)
    setShowRewardsSummaryModal(false)
    setIsRewardsSummaryLoading(false)

    if (cust) {
      setCurrentStep(2)
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
    setSelectedReward(null)
    setRedeemResult(null)
  }

  const handleRemoveItem = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId))
    setSelectedReward(null)
    setRedeemResult(null)
  }

  const handleUpdateQuantity = (itemId, newQty) => {
    if (newQty < 1) {
      handleRemoveItem(itemId)
      return
    }
    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQty } : item
    ))
    setSelectedReward(null)
    setRedeemResult(null)
  }

  const handleClearCart = () => {
    setCartItems([])
    setSelectedReward(null)
    setRedeemResult(null)
  }

  // =========================================================================
  // HANDLERS DA INTEGRAÇÃO BONIFIQ
  // =========================================================================
  const handleRewardSelected = (reward) => {
    setSelectedReward(reward)
    setRedeemResult(null)
  }

  const handleFinalizeSale = async () => {
    if (cartItems.length === 0) return

    setCurrentStep(3)

    // Se tem recompensa selecionada e não foi resgatada ainda
    if (selectedReward && !redeemResult) {
      // Precisa validar? (em produção, verificar shouldValidateCustomer)
      const needsValidation = true // Simulado

      if (needsValidation) {
        setTransactionId(`PDV-${Date.now()}`)
        setShowValidationModal(true)
        return
      }

      // Se não precisa validar, resgata direto
      await processRedeem()
    } else {
      // Não tem recompensa, finaliza direto
      await processOrder()
    }
  }

  const handleValidationComplete = async () => {
    setShowValidationModal(false)
    await processRedeem()
  }

  const handleValidationCancel = () => {
    setShowValidationModal(false)
    setCurrentStep(2)
  }

  // =========================================================================
  // PROCESSAMENTO BONIFIQ
  // =========================================================================
  const processRedeem = async () => {
    setIsProcessing(true)

    const originalKey = `${selectedReward.id}-${customer.document}-${Date.now()}`

    // ======== CHAMADA BONIFIQ: /rewards/{id}/redeem ========
    const result = await BonifiQ.redeemReward(
      selectedReward.id,
      customer.document,
      selectedReward.isCashback ? cashbackValue : null,
      originalKey
    )

    if (result.hasError) {
      alert('Erro ao resgatar recompensa: ' + (result.errorMessage || result.errorCode))
      setIsProcessing(false)
      return
    }

    setRedeemResult(result)
    
    // Continua para finalizar o pedido
    // Suporta tanto formato mock (data) quanto produção (result)
    const redeemData = result.data || result.result
    await processOrder(redeemData.externalCode)
  }

  const processOrder = async (couponCode = null) => {
    setIsProcessing(true)

    const orderId = `PDV-${Date.now()}`
    const now = new Date().toISOString()

    // ======== CHAMADA BONIFIQ: /orders ========
    const orderData = {
      originalId: orderId,
      orderPlacementDate: now,
      orderCompletedDate: now,
      orderStatus: 'Concluído',
      isCancelledOrReturned: false,
      isCompleted: true,
      orderTotal: total, // Valor líquido pago (produtos - aniversário - BonifiQ)
      coupon: couponCode, // ExternalCode da recompensa
      customer: {
        originalId: customer.document,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        isEnrolled: true,
      },
      products: cartItems.map(item => ({
        originalId: item.id,
        title: item.name,  // API espera "Title", não "Name"
        quantity: item.quantity,
        price: item.price,
        productPrice: item.price,
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
      orderTotal: total 
    }
    const orderRecord = buildOrderRecord(orderData, orderResultData)
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
    setSelectedReward(null)
    setCashbackValue(0)
    setRedeemResult(null)
    setOrderResult(null)
    setCustomerRewardsSummary(null)
    setShowRewardsSummaryModal(false)
    setIsRewardsSummaryLoading(false)
    setTransactionId('')
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
        
        <div className="pdv-layout">
          {/* Coluna da esquerda - Produtos */}
          <div>
            <ProductsGrid onAddProduct={handleAddProduct} />
          </div>

          {/* Coluna da direita - Carrinho e BonifiQ */}
          <div className="cart-section card">
            <div className="cart-header">
              <h2>🧾 Carrinho</h2>
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

            {/* Seleção de Cliente */}
            <CustomerSelector 
              selectedCustomer={customer} 
              onSelectCustomer={handleSelectCustomer} 
            />

            {/* Itens do Carrinho */}
            <CartItems 
              items={cartItems} 
              onRemoveItem={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
            />

            {/* ========================================== */}
            {/* INTEGRAÇÃO BONIFIQ - Seção de Recompensas */}
            {/* ========================================== */}
            {customer && cartItems.length > 0 && (
              <BonifiQSection
                customer={customer}
                purchaseValue={bonifiqBaseTotal}
                selectedReward={selectedReward}
                onRewardSelected={handleRewardSelected}
                cashbackValue={cashbackValue}
                onCashbackValueChange={setCashbackValue}
                disabled={isProcessing || !!redeemResult}
              />
            )}

            {/* Totais */}
            {cartItems.length > 0 && (
              <CartTotals 
                subtotal={subtotal} 
                birthdayDiscount={birthdayDiscount}
                birthdayDiscountPercent={BIRTHDAY_DISCOUNT_PERCENT}
                bonifiqBaseTotal={bonifiqBaseTotal}
                bonifiqDiscount={bonifiqDiscount}
                bonifiqDiscountLabel={bonifiqDiscountLabel}
                total={total}
              />
            )}

            {/* Botão Finalizar */}
            {cartItems.length > 0 && customer && (
              <div className="cart-actions">
                <button 
                  className="btn btn-success" 
                  onClick={handleFinalizeSale}
                  disabled={isProcessing}
                  style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                >
                  {isProcessing ? '⏳ Processando...' : '✅ Finalizar Venda'}
                </button>
              </div>
            )}
          </div>
        </div>
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
