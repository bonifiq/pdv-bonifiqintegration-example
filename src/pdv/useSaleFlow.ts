import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { bonifiqClient } from '../bonifiq/client'
import { buildChallengeContactRetry } from '../bonifiq/challengeRetry'
import { integrationFlowReducer, initialIntegrationState } from '../bonifiq/flowReducer'
import { calculateProductRewardUnitPriceCents, calculateRewardDiscountCents, getProductRewardDescription, isFreeGift, isProductReward, shouldRunCustomerChallenge } from '../bonifiq/rewardRules'
import { DEMO_SCENARIOS, setActiveScenario, type DemoScenarioId } from '../bonifiq/scenarios'
import { traceLocalEvent } from '../bonifiq/trace'
import type { AvailableReward, OrderCustomerInput, OrderRequest, OrderResponse, RedeemResponse } from '../bonifiq/types'
import { CUSTOMERS_DATABASE } from '../data/customers'
import { PRODUCTS } from '../data/products'
import { clampCents, fromCents, toCents } from './money'
import { allocateOrderProductTotals } from './orderProducts'
import { allocatePartialRefundProducts } from './partialCancellation'
import type { CartItem, CatalogProduct, MoneyCents, Notice, OrderRecord, PdvCustomer } from './types'

const makeOperationId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function useSaleFlow() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [customer, setCustomer] = useState<PdvCustomer | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [manualDiscountCents, setManualDiscountCents] = useState<MoneyCents>(0)
  const [integration, dispatchIntegration] = useReducer(integrationFlowReducer, initialIntegrationState)
  const [showRewardsSummary, setShowRewardsSummary] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [orderNotice, setOrderNotice] = useState<Notice | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [activeScenario, setScenarioState] = useState<DemoScenarioId | null>(null)
  const rewardsRequestId = useRef(0)

  const subtotalCents = useMemo(() => cartItems.reduce((total, item) => total + item.priceCents * item.quantity, 0), [cartItems])
  const appliedManualDiscountCents = clampCents(manualDiscountCents, 0, subtotalCents)
  const bonifiqBaseCents = Math.max(0, subtotalCents - appliedManualDiscountCents)
  const bonifiqDiscountCents = calculateRewardDiscountCents(integration.selectedReward, integration.cashbackCents, bonifiqBaseCents)
  const totalCents = Math.max(0, bonifiqBaseCents - bonifiqDiscountCents)

  const resetReward = useCallback(() => dispatchIntegration({ type: 'RESET' }), [])

  const loadRewards = useCallback(async () => {
    if (!customer || integration.redeem) return
    const requestId = ++rewardsRequestId.current
    dispatchIntegration({ type: 'REWARDS_LOADING' })
    const result = await bonifiqClient.getAvailableRewards({
      customerId: customer.document,
      purchaseValue: fromCents(subtotalCents),
      discountValue: fromCents(appliedManualDiscountCents),
      products: cartItems.map(item => ({
        originalId: item.originalId || item.id,
        lineId: item.id,
        title: item.name,
        quantity: item.quantity,
        productPrice: fromCents(item.originalPriceCents ?? item.priceCents),
        productDiscountPrice: (item.originalPriceCents ?? item.priceCents) > item.priceCents ? fromCents(item.priceCents) : null,
        isActive: true,
        productBrand: item.brand || null,
        productCategory: item.category || null,
      })),
    })
    if (requestId !== rewardsRequestId.current) return
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'rewards' })
      return
    }
    dispatchIntegration({ type: 'REWARDS_LOADED', rewards: result.data })
  }, [appliedManualDiscountCents, cartItems, customer, integration.redeem, subtotalCents])

  const cartSignature = cartItems.map(item => `${item.id}:${item.quantity}:${item.priceCents}`).join('|')
  useEffect(() => {
    if (!customer || integration.redeem) return
    void loadRewards()
  }, [customer?.document, cartSignature, appliedManualDiscountCents, integration.redeem, loadRewards])

  const clearSale = useCallback(() => {
    setCurrentStep(1)
    setCustomer(null)
    setCartItems([])
    setManualDiscountCents(0)
    resetReward()
    setShowRewardsSummary(false)
    setOrderResult(null)
    setShowOrders(false)
    setOrderNotice(null)
  }, [resetReward])

  const selectCustomer = (selected: PdvCustomer | null): void => {
    setCustomer(selected)
    setManualDiscountCents(0)
    resetReward()
    setOrderNotice(null)
    setShowRewardsSummary(Boolean(selected))
    if (!selected) setCurrentStep(1)
  }

  const addProduct = (product: CatalogProduct): void => {
    setCartItems(previous => {
      const existing = previous.find(item => item.id === product.id && !item.isRewardProduct)
      return existing
        ? previous.map(item => item.id === product.id && !item.isRewardProduct ? { ...item, quantity: item.quantity + 1 } : item)
        : [...previous, { ...product, quantity: 1 }]
    })
    setManualDiscountCents(0)
    resetReward()
  }

  const removeItem = (itemId: string): void => {
    setCartItems(previous => previous.filter(item => item.id !== itemId))
    setManualDiscountCents(0)
    resetReward()
  }

  const updateQuantity = (itemId: string, quantity: number): void => {
    if (quantity < 1) return removeItem(itemId)
    setCartItems(previous => previous.map(item => item.id === itemId ? { ...item, quantity } : item))
    setManualDiscountCents(0)
    resetReward()
  }

  const clearCart = (): void => {
    setCartItems([])
    setManualDiscountCents(0)
    resetReward()
  }

  const changeManualDiscount = (value: number): void => {
    setManualDiscountCents(clampCents(toCents(value), 0, subtotalCents))
    resetReward()
  }

  const findCatalogProduct = (reward: AvailableReward): CatalogProduct | undefined => PRODUCTS.find(product => (
    product.id.toLowerCase() === String(reward.externalProductId || '').toLowerCase()
  ))

  const buildRewardCartItem = (reward: AvailableReward, redeem: RedeemResponse, product: CatalogProduct): CartItem => {
    const quantity = 1
    const priceCents = calculateProductRewardUnitPriceCents(reward, redeem, product.priceCents, quantity)
    return {
      ...product,
      id: `reward-${redeem.rewardId}-${redeem.externalProductId || reward.externalProductId}`,
      originalId: redeem.externalProductId || reward.externalProductId || product.id,
      name: reward.productDisplayName || product.name,
      quantity,
      priceCents,
      originalPriceCents: product.priceCents,
      productDiscountTotalCents: isFreeGift(reward) ? product.priceCents : toCents(redeem.productDiscountTotal),
      isRewardProduct: true,
      rewardLabel: getProductRewardDescription(reward),
    }
  }

  const processRedeem = useCallback(async (reward: AvailableReward, cashbackCents: MoneyCents, originalKey: string) => {
    dispatchIntegration({ type: 'REDEEMING' })
    const catalogProduct = isProductReward(reward) ? findCatalogProduct(reward) : undefined
    if (isProductReward(reward) && !catalogProduct) {
      dispatchIntegration({ type: 'ERROR', message: 'O SKU retornado pela BonifiQ não existe no catálogo deste PDV.', retryAction: 'redeem' })
      return
    }

    const result = isProductReward(reward)
      ? await bonifiqClient.redeemProductDiscountReward({
          rewardId: reward.id,
          customerId: customer!.document,
          originalKey,
          product: {
            externalProductId: reward.externalProductId!,
            quantity: 1,
            productPrice: fromCents(catalogProduct!.priceCents),
            productDiscountPrice: null,
            hasPromotion: false,
          },
        })
      : await bonifiqClient.redeemReward({
          rewardId: reward.id,
          customerId: customer!.document,
          originalKey,
          value: reward.isCashback ? fromCents(cashbackCents) : null,
        })

    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'redeem' })
      return
    }
    if (isProductReward(reward) && catalogProduct) setCartItems(previous => [...previous, buildRewardCartItem(reward, result.data, catalogProduct)])
    dispatchIntegration({ type: 'REWARD_APPLIED', redeem: result.data })
  }, [customer])

  const createChallenge = useCallback(async (reward: AvailableReward, cashbackCents: MoneyCents, transactionId: string, originalKey: string) => {
    dispatchIntegration({ type: 'CHALLENGE_SENDING' })
    const shouldValidateSignup = Boolean(integration.rewards?.shouldValidateCustomerSignup)
    const request = {
      customerId: customer!.document,
      transactionId,
      ...(shouldValidateSignup ? {
        document: customer!.document,
        name: customer!.name,
        email: customer!.email,
        phone: customer!.phone,
      } : {}),
    }
    let result = await bonifiqClient.sendChallenge(request)
    if (!result.ok && result.httpStatus !== undefined && result.httpStatus < 400) {
      const retryRequest = buildChallengeContactRetry(request, customer!, result.error.details)
      if (retryRequest) result = await bonifiqClient.sendChallenge(retryRequest)
    }
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'challenge' })
      return
    }
    dispatchIntegration({ type: 'CHALLENGE_READY', challenge: result.data })
  }, [customer, integration.rewards?.shouldValidateCustomerSignup])

  const confirmReward = async (reward: AvailableReward, cashbackValue: number | null): Promise<void> => {
    const cashbackCents = reward.isCashback ? toCents(cashbackValue || 0) : 0
    const transactionId = makeOperationId('PDV-OTP')
    const originalKey = makeOperationId(`PDV-REWARD-${reward.id}`)
    dispatchIntegration({ type: 'PREPARE_REDEEM', reward, cashbackCents, transactionId, originalKey })
    if (shouldRunCustomerChallenge(integration.rewards)) {
      await createChallenge(reward, cashbackCents, transactionId, originalKey)
    } else {
      await processRedeem(reward, cashbackCents, originalKey)
    }
  }

  const validateCode = async (code: string): Promise<void> => {
    if (!customer || !integration.transactionId || !integration.originalKey || !integration.selectedReward) return
    dispatchIntegration({ type: 'CODE_VALIDATING' })
    const result = await bonifiqClient.validateChallenge({ customerId: customer.document, transactionId: integration.transactionId, code })
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'validation' })
      return
    }
    dispatchIntegration({ type: 'CUSTOMER_VALIDATED' })
    await processRedeem(integration.selectedReward, integration.cashbackCents, integration.originalKey)
  }

  const cancelPendingReward = (): void => {
    traceLocalEvent({
      operation: 'Resgate abandonado',
      reason: 'O operador abandonou a validação antes da criação do RewardId; por isso nenhuma chamada de estorno foi necessária.',
      context: {
        phase: integration.phase,
        rewardConfigurationId: integration.selectedReward?.id || null,
        rewardTitle: integration.selectedReward?.title || null,
        originalKey: integration.originalKey,
      },
      result: {
        rewardCreated: false,
        rewardCancellationRequired: false,
      },
    })
    dispatchIntegration({ type: 'CLEAR_REWARD' })
  }

  const backToSelection = useCallback(async () => {
    if (integration.phase === 'cancelling-reward' || integration.phase === 'submitting-order') return
    if (integration.redeem) {
      dispatchIntegration({ type: 'REWARD_CANCELLING' })
      const result = await bonifiqClient.cancelReward(integration.redeem.rewardId)
      if (!result.ok) {
        dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'cancel-reward' })
        return
      }
      setCartItems(previous => previous.filter(item => !item.isRewardProduct))
    }
    setManualDiscountCents(0)
    dispatchIntegration({ type: 'CLEAR_REWARD' })
    setCurrentStep(1)
  }, [integration.phase, integration.redeem])

  const buildOrderCustomer = (): OrderCustomerInput => {
    const rewardsCustomer = integration.rewards?.customer
    return {
      originalId: rewardsCustomer?.originalId || customer!.document,
      name: rewardsCustomer?.name || customer!.name,
      email: rewardsCustomer?.email || customer!.email,
      phone: rewardsCustomer?.phone || customer!.phone,
      document: rewardsCustomer?.document || customer!.document,
      isEnrolled: integration.rewards?.shouldValidateCustomerSignup
        ? integration.customerValidated
        : rewardsCustomer?.isEnrolled ?? true,
    }
  }

  const finalizeSale = useCallback(async () => {
    if (!customer || cartItems.length === 0 || (integration.selectedReward && !integration.redeem)) return
    dispatchIntegration({ type: 'ORDER_SUBMITTING' })
    const orderId = makeOperationId('PDV-ORDER')
    const now = new Date().toISOString()
    const productTotals = allocateOrderProductTotals(cartItems, totalCents)
    const orderData: OrderRequest = {
      originalId: orderId,
      orderPlacementDate: now,
      orderCompletedDate: now,
      orderStatus: 'Concluído',
      isCancelledOrReturned: false,
      isCompleted: true,
      orderTotal: fromCents(totalCents),
      coupon: integration.redeem?.externalCode || null,
      customer: buildOrderCustomer(),
      products: cartItems.map((item, index) => ({
        originalId: item.originalId || item.id,
        title: item.name,
        productPrice: fromCents(productTotals[index]),
        isActive: true,
        productBrand: item.brand || null,
        productCategory: item.category || null,
      })),
      paymentMethods: [{ originalId: 'DINHEIRO', name: 'Dinheiro', paidAmount: fromCents(totalCents) }],
      branch: { originalId: 'LOJA-001', name: 'Loja Centro' },
      salesPerson: { originalId: 'VENDEDOR-001', name: 'João Silva' },
    }
    const result = await bonifiqClient.createOrder(orderData)
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'order' })
      return
    }
    const record: OrderRecord = {
      originalId: orderId,
      customer: orderData.customer,
      coupon: orderData.coupon,
      orderData,
      bonifiqResult: result.data,
      originalSubtotalCents: subtotalCents,
      originalDiscountCents: appliedManualDiscountCents + bonifiqDiscountCents,
      originalTotalCents: totalCents,
      currentTotalCents: totalCents,
      status: 'Concluído',
      statusClass: 'completed',
      items: cartItems.map(item => ({ ...item, cancelledQuantity: 0 })),
      cancellations: [],
    }
    setOrders(previous => [record, ...previous])
    setOrderResult(result.data)
  }, [appliedManualDiscountCents, bonifiqDiscountCents, cartItems, customer, integration.customerValidated, integration.redeem, integration.rewards?.customer, integration.rewards?.shouldValidateCustomerSignup, integration.selectedReward, subtotalCents, totalCents])

  const retryIntegration = async (): Promise<void> => {
    if (integration.retryAction === 'rewards') return loadRewards()
    if (integration.retryAction === 'challenge' && integration.selectedReward && integration.transactionId && integration.originalKey) return createChallenge(integration.selectedReward, integration.cashbackCents, integration.transactionId, integration.originalKey)
    if (integration.retryAction === 'redeem' && integration.selectedReward && integration.originalKey) return processRedeem(integration.selectedReward, integration.cashbackCents, integration.originalKey)
    if (integration.retryAction === 'order') return finalizeSale()
    if (integration.retryAction === 'cancel-reward') return backToSelection()
  }

  const dismissIntegrationError = (): void => {
    if (integration.retryAction === 'validation' && integration.challenge) {
      dispatchIntegration({ type: 'CHALLENGE_READY', challenge: integration.challenge })
      return
    }
    dispatchIntegration({ type: 'CLEAR_REWARD' })
  }

  const newSale = (): void => clearSale()
  const viewOrders = (): void => { setOrderResult(null); setShowOrders(true); setOrderNotice(null) }
  const backToPdv = (): void => { setShowOrders(false); setOrderNotice(null) }

  const cancelOrder = async (order: OrderRecord): Promise<void> => {
    setProcessingOrderId(order.originalId)
    setOrderNotice(null)
    const cancelledDate = new Date().toISOString()
    const result = await bonifiqClient.cancelOrder(order.originalId, cancelledDate, 'Cancelado')
    if (!result.ok) {
      setOrderNotice({ type: 'error', message: result.error.friendlyMessage })
      setProcessingOrderId(null)
      return
    }
    setOrders(previous => previous.map(existing => existing.originalId !== order.originalId ? existing : {
      ...existing,
      status: 'Cancelado',
      statusClass: 'cancelled',
      currentTotalCents: 0,
      items: existing.items.map(item => ({ ...item, cancelledQuantity: item.quantity })),
      cancellations: [...existing.cancellations, { type: 'total', cancelledAt: cancelledDate }],
    }))
    setOrderNotice({ type: 'success', message: 'Cancelamento enviado para a BonifiQ.' })
    setProcessingOrderId(null)
  }

  const partialCancel = async (order: OrderRecord, draftQuantities: Record<string, number>): Promise<void> => {
    const selected = Object.fromEntries(order.items.map(item => {
      const active = Math.max(0, item.quantity - item.cancelledQuantity)
      return [item.id, Math.max(0, Math.min(active, Number(draftQuantities[item.id]) || 0))]
    }).filter(([, quantity]) => Number(quantity) > 0)) as Record<string, number>
    if (Object.keys(selected).length === 0) return
    const remaining = order.items.map(item => ({ ...item, cancelledQuantity: item.cancelledQuantity + (selected[item.id] || 0) }))
    if (remaining.every(item => item.cancelledQuantity >= item.quantity)) return cancelOrder(order)
    setProcessingOrderId(order.originalId)
    const activeSubtotalCents = remaining.reduce((total, item) => total + item.priceCents * Math.max(0, item.quantity - item.cancelledQuantity), 0)
    const proportionalDiscountCents = order.originalSubtotalCents > 0 ? Math.round(order.originalDiscountCents * activeSubtotalCents / order.originalSubtotalCents) : 0
    const currentTotalCents = Math.max(0, activeSubtotalCents - Math.min(activeSubtotalCents, proportionalDiscountCents))
    const refundCents = Math.max(0, order.currentTotalCents - currentTotalCents)
    if (refundCents <= 0) {
      setOrderNotice({ type: 'error', message: 'O valor do cancelamento parcial precisa ser maior que zero.' })
      setProcessingOrderId(null)
      return
    }
    const cancelKey = makeOperationId(`PARTIAL-${order.originalId}`)
    const result = await bonifiqClient.partialCancelOrder(order.originalId, {
      valueToRefund: fromCents(refundCents),
      cancelKey,
      products: allocatePartialRefundProducts(order.items, selected, refundCents),
    })
    if (!result.ok) {
      setOrderNotice({ type: 'error', message: result.error.friendlyMessage })
      setProcessingOrderId(null)
      return
    }
    const now = new Date().toISOString()
    setOrders(previous => previous.map(existing => existing.originalId !== order.originalId ? existing : {
      ...existing,
      orderData: { ...existing.orderData, orderStatus: 'Parcialmente cancelado', orderTotal: fromCents(currentTotalCents) },
      bonifiqResult: result.data,
      currentTotalCents,
      status: 'Parcialmente cancelado',
      statusClass: 'partial',
      items: remaining,
      cancellations: [...existing.cancellations, { type: 'partial', cancelledAt: now, items: selected, valueToRefund: fromCents(refundCents), cancelKey }],
    }))
    setOrderNotice({ type: 'success', message: 'Cancelamento parcial enviado para a BonifiQ.' })
    setProcessingOrderId(null)
  }

  const applyScenario = (scenarioId: DemoScenarioId): void => {
    const scenario = DEMO_SCENARIOS.find(item => item.id === scenarioId)!
    setActiveScenario(scenarioId)
    setScenarioState(scenarioId)
    rewardsRequestId.current += 1
    setCurrentStep(1)
    setCustomer(CUSTOMERS_DATABASE.find(item => item.document === scenario.customerDocument) || null)
    setCartItems(scenario.productIds.map(id => PRODUCTS.find(product => product.id === id)!).filter(Boolean).map(product => ({ ...product, quantity: 1 })))
    setManualDiscountCents(0)
    resetReward()
    setOrderResult(null)
    setShowOrders(false)
    setShowRewardsSummary(true)
  }

  const isBusy = ['sending-challenge', 'validating-code', 'redeeming', 'cancelling-reward', 'submitting-order'].includes(integration.phase)
  const validationOpen = ['sending-challenge', 'awaiting-code', 'validating-code'].includes(integration.phase)
    || (integration.phase === 'error' && integration.retryAction === 'validation')

  return {
    currentStep, customer, cartItems, subtotalCents, appliedManualDiscountCents, bonifiqBaseCents, bonifiqDiscountCents, totalCents,
    integration, showRewardsSummary, orderResult, orders, showOrders, orderNotice, processingOrderId, activeScenario,
    isBusy, validationOpen,
    selectCustomer, addProduct, removeItem, updateQuantity, clearCart, changeManualDiscount,
    continueToPayment: () => customer && cartItems.length > 0 && setCurrentStep(2),
    backToSelection, confirmReward, validateCode, cancelPendingReward, finalizeSale,
    retryIntegration, dismissIntegrationError,
    closeRewardsSummary: () => setShowRewardsSummary(false),
    newSale, viewOrders, backToPdv, cancelOrder, partialCancel, applyScenario,
  }
}
