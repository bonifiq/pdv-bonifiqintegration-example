import { useState } from 'react'

// Componentes do PDV (puro PDV, sem BonifiQ)
import { 
  Header, 
  StepIndicator, 
  CustomerSelector, 
  ProductsGrid, 
  CartItems, 
  CartTotals, 
  SuccessScreen 
} from './components/pdv'

// Componentes da BonifiQ (integração separada)
import { BonifiQSection, ValidationModal } from './components/bonifiq'

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

  // =========================================================================
  // ESTADO DA INTEGRAÇÃO BONIFIQ
  // =========================================================================
  const [selectedReward, setSelectedReward] = useState(null)
  const [cashbackValue, setCashbackValue] = useState(0)
  const [redeemResult, setRedeemResult] = useState(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // =========================================================================
  // CÁLCULOS DO CARRINHO
  // =========================================================================
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  // Calcula desconto baseado na recompensa selecionada
  let discount = 0
  let discountLabel = ''
  if (selectedReward && !redeemResult) {
    if (selectedReward.isCashback) {
      discount = cashbackValue
      discountLabel = 'Cashback BonifiQ'
    } else if (selectedReward.rewardType === 0) {
      discount = subtotal * (selectedReward.value / 100)
      discountLabel = `Desconto ${selectedReward.value}% BonifiQ`
    } else {
      discount = selectedReward.value
      discountLabel = 'Desconto BonifiQ'
    }
  } else if (redeemResult) {
    discount = BonifiQ.calculateDiscount(redeemResult.data, subtotal)
    discountLabel = 'Desconto BonifiQ (aplicado)'
  }

  const total = subtotal - discount

  // =========================================================================
  // HANDLERS DO PDV
  // =========================================================================
  const handleSelectCustomer = (cust) => {
    setCustomer(cust)
    setSelectedReward(null)
    setRedeemResult(null)
    if (cust) {
      setCurrentStep(2)
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
      orderTotal: total, // Valor pago (com desconto aplicado)
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
    setTransactionId('')
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  
  // Tela de sucesso
  if (orderResult) {
    return (
      <>
        <Header />
        <div className="container">
          <SuccessScreen orderResult={orderResult} onNewSale={handleNewSale} />
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container">
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
                purchaseValue={subtotal}
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
                discount={discount}
                discountLabel={discountLabel}
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
