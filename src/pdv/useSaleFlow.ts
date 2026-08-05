import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { bonifiqClient } from '../bonifiq/client'
import { buildChallengeContactRetry } from '../bonifiq/challengeRetry'
import { integrationFlowReducer, initialIntegrationState } from '../bonifiq/flowReducer'
import { calculateProductRewardDiscountCents, calculateProductRewardUnitPriceCents, calculateRewardDiscountCents, getProductRewardDescription, isProductReward, shouldRunCustomerChallenge } from '../bonifiq/rewardRules'
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

const rewardsRefreshReason = {
  changedSale: 'Dados da venda alterados; atualizar os benefícios disponíveis.',
  selectedCustomer: 'Cliente selecionado; consultar saldo, tier e benefícios para a venda.',
  changedCart: 'Carrinho alterado; revalidar elegibilidade e benefícios.',
  changedDiscount: 'Desconto manual alterado; revalidar elegibilidade e limites.',
  loadedScenario: 'Cenário carregado; consultar benefícios para o cliente e carrinho definidos.',
  cancelledReward: 'Recompensa estornada; atualizar os benefícios disponíveis para a venda.',
  returnedToEdit: 'Operador voltou para a edição; atualizar os benefícios sem o desconto do pagamento.',
  retry: 'A consulta anterior falhou; consultar os benefícios novamente.',
} as const

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
  const nextRewardsRefreshReason = useRef<string>(rewardsRefreshReason.changedSale)

  const subtotalCents = useMemo(() => cartItems.reduce((total, item) => total + item.priceCents * item.quantity, 0), [cartItems])
  const appliedManualDiscountCents = clampCents(manualDiscountCents, 0, subtotalCents)
  const bonifiqBaseCents = Math.max(0, subtotalCents - appliedManualDiscountCents)
  const bonifiqDiscountCents = calculateRewardDiscountCents(integration.selectedReward, integration.cashbackCents, bonifiqBaseCents)
  const totalCents = Math.max(0, bonifiqBaseCents - bonifiqDiscountCents)

  const resetReward = useCallback(() => dispatchIntegration({ type: 'RESET' }), [])

  const loadRewards = useCallback(async (reason: string) => {
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
    }, { reason })
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
    const reason = nextRewardsRefreshReason.current
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedSale
    void loadRewards(reason)
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
    nextRewardsRefreshReason.current = rewardsRefreshReason.selectedCustomer
    setCustomer(selected)
    setManualDiscountCents(0)
    resetReward()
    setOrderNotice(null)
    setShowRewardsSummary(Boolean(selected))
    if (!selected) setCurrentStep(1)
  }

  const addProduct = (product: CatalogProduct): void => {
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedCart
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
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedCart
    setCartItems(previous => previous.filter(item => item.id !== itemId))
    setManualDiscountCents(0)
    resetReward()
  }

  const updateQuantity = (itemId: string, quantity: number): void => {
    if (quantity < 1) return removeItem(itemId)
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedCart
    setCartItems(previous => previous.map(item => item.id === itemId ? { ...item, quantity } : item))
    setManualDiscountCents(0)
    resetReward()
  }

  const clearCart = (): void => {
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedCart
    setCartItems([])
    setManualDiscountCents(0)
    resetReward()
  }

  const changeManualDiscount = (value: number): void => {
    nextRewardsRefreshReason.current = rewardsRefreshReason.changedDiscount
    setManualDiscountCents(clampCents(toCents(value), 0, subtotalCents))
    resetReward()
  }

  const findCatalogProduct = (externalProductId?: string | null): CatalogProduct | undefined => PRODUCTS.find(product => (
    product.id.toLowerCase() === String(externalProductId || '').toLowerCase()
  ))

  const buildRewardCartItem = (reward: AvailableReward, redeem: RedeemResponse, product: CatalogProduct): CartItem => {
    const quantity = 1
    const priceCents = calculateProductRewardUnitPriceCents(reward, product.priceCents)
    return {
      ...product,
      id: `reward-${redeem.rewardId}-${redeem.externalProductId}`,
      originalId: redeem.externalProductId || product.id,
      name: reward.productDisplayName || product.name,
      quantity,
      priceCents,
      originalPriceCents: product.priceCents,
      isRewardProduct: true,
      rewardLabel: getProductRewardDescription(reward),
    }
  }

  const processRedeem = useCallback(async (reward: AvailableReward, cashbackCents: MoneyCents, originalKey: string, reason: string) => {
    dispatchIntegration({ type: 'REDEEMING' })
    const expectedProductId = isProductReward(reward) ? reward.externalProductId : null
    const catalogProduct = isProductReward(reward) ? findCatalogProduct(expectedProductId) : undefined
    if (isProductReward(reward) && !expectedProductId) {
      dispatchIntegration({ type: 'CLEAR_REWARD' })
      dispatchIntegration({ type: 'ERROR', message: 'A BonifiQ não retornou o identificador offline do produto configurado.', retryAction: 'rewards' })
      return
    }
    if (isProductReward(reward) && !catalogProduct) {
      dispatchIntegration({ type: 'CLEAR_REWARD' })
      dispatchIntegration({ type: 'ERROR', message: `O SKU ${expectedProductId} retornado pela BonifiQ não existe no catálogo deste PDV.`, retryAction: 'rewards' })
      return
    }

    const result = await bonifiqClient.redeemReward({
      rewardId: reward.id,
      customerId: customer!.document,
      originalKey,
      value: reward.isCashback ? fromCents(cashbackCents) : null,
    }, { reason })

    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'redeem' })
      return
    }
    if (isProductReward(reward)) {
      const returnedProductId = result.data.externalProductId?.trim()
      if (!returnedProductId || returnedProductId.toLowerCase() !== expectedProductId!.trim().toLowerCase()) {
        dispatchIntegration({ type: 'REWARD_APPLIED', redeem: result.data })
        dispatchIntegration({ type: 'REWARD_CANCELLING' })
        const cancellation = await bonifiqClient.cancelReward(result.data.rewardId, {
          reason: 'O SKU retornado divergiu do /available; desfazer o resgate automaticamente.',
        })
        if (!cancellation.ok) {
          dispatchIntegration({ type: 'ERROR', message: `A configuração do produto mudou após a consulta e o estorno automático falhou: ${cancellation.error.friendlyMessage}`, retryAction: 'cancel-reward' })
          return
        }
        nextRewardsRefreshReason.current = rewardsRefreshReason.cancelledReward
        dispatchIntegration({ type: 'CLEAR_REWARD' })
        dispatchIntegration({ type: 'ERROR', message: 'A configuração do produto mudou após a consulta. O resgate foi estornado; consulte os benefícios novamente.', retryAction: 'rewards' })
        return
      }

      const catalogUnitPriceCents = catalogProduct!.priceCents
      const priceCents = calculateProductRewardUnitPriceCents(reward, catalogUnitPriceCents)
      traceLocalEvent({
        operation: 'Aplicar benefício de produto no carrinho',
        reason: 'A BonifiQ registra o resgate e devolve o SKU offline; o cálculo e a aplicação financeira são responsabilidade do PDV.',
        context: {
          externalProductId: returnedProductId,
          quantity: 1,
          productDiscountMode: reward.productDiscountMode,
          productDiscountValue: reward.productDiscountValue,
          catalogUnitPrice: fromCents(catalogUnitPriceCents),
        },
        result: {
          finalUnitPrice: fromCents(priceCents),
          discountAmount: fromCents(calculateProductRewardDiscountCents(reward, catalogUnitPriceCents)),
          separateCartLine: true,
        },
      })
      setCartItems(previous => [...previous, buildRewardCartItem(reward, result.data, catalogProduct!)])
    }
    dispatchIntegration({ type: 'REWARD_APPLIED', redeem: result.data })
  }, [customer])

  const createChallenge = useCallback(async (reward: AvailableReward, cashbackCents: MoneyCents, transactionId: string, originalKey: string, reason: string) => {
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
    let result = await bonifiqClient.sendChallenge(request, { reason })
    if (!result.ok && result.httpStatus !== undefined && result.httpStatus < 400) {
      const retryRequest = buildChallengeContactRetry(request, customer!, result.error.details)
      if (retryRequest) result = await bonifiqClient.sendChallenge(retryRequest, {
        reason: 'A BonifiQ solicitou dados de contato; reenviar o challenge com o cadastro do PDV.',
      })
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
      await createChallenge(reward, cashbackCents, transactionId, originalKey, 'A recompensa escolhida exige validação de identidade antes do resgate.')
    } else {
      await processRedeem(reward, cashbackCents, originalKey, 'A BonifiQ dispensou OTP; registrar o uso da recompensa escolhida.')
    }
  }

  const validateCode = async (code: string): Promise<void> => {
    if (!customer || !integration.transactionId || !integration.originalKey || !integration.selectedReward) return
    dispatchIntegration({ type: 'CODE_VALIDATING' })
    const validationReason = integration.retryAction === 'validation'
      ? 'A validação anterior falhou; conferir novamente o código informado pelo operador.'
      : 'O operador informou o código recebido; validar a identidade antes do resgate.'
    const result = await bonifiqClient.validateChallenge({ customerId: customer.document, transactionId: integration.transactionId, code }, { reason: validationReason })
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction: 'validation' })
      return
    }
    dispatchIntegration({ type: 'CUSTOMER_VALIDATED' })
    await processRedeem(integration.selectedReward, integration.cashbackCents, integration.originalKey, 'Código validado; registrar o uso da recompensa escolhida.')
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

  const cancelRedeemedReward = useCallback(async (retryAction: 'cancel-reward' | 'remove-reward', reason: string): Promise<boolean> => {
    if (!integration.redeem) return true
    dispatchIntegration({ type: 'REWARD_CANCELLING' })
    const result = await bonifiqClient.cancelReward(integration.redeem.rewardId, { reason })
    if (!result.ok) {
      dispatchIntegration({ type: 'ERROR', message: result.error.friendlyMessage, retryAction })
      return false
    }
    nextRewardsRefreshReason.current = rewardsRefreshReason.cancelledReward
    setCartItems(previous => previous.filter(item => !item.isRewardProduct))
    return true
  }, [integration.redeem])

  const backToSelection = useCallback(async (isRetry = false) => {
    if (integration.phase === 'cancelling-reward' || integration.phase === 'submitting-order') return
    if (integration.redeem) {
      const reason = isRetry
        ? 'A tentativa anterior de estorno falhou; repetir o cancelamento da recompensa.'
        : 'O operador voltou para editar cliente ou carrinho; estornar a recompensa antes da edição.'
      if (!await cancelRedeemedReward('cancel-reward', reason)) return
    } else {
      nextRewardsRefreshReason.current = rewardsRefreshReason.returnedToEdit
    }
    setManualDiscountCents(0)
    dispatchIntegration({ type: 'CLEAR_REWARD' })
    setCurrentStep(1)
  }, [cancelRedeemedReward, integration.phase])

  const removeReward = useCallback(async (isRetry = false) => {
    if (!integration.redeem || integration.phase === 'cancelling-reward' || integration.phase === 'submitting-order') return
    const reason = isRetry
      ? 'A tentativa anterior de estorno falhou; repetir o cancelamento da recompensa.'
      : 'O operador removeu o benefício aplicado; estornar antes de limpar a recompensa do PDV.'
    if (!await cancelRedeemedReward('remove-reward', reason)) return
    dispatchIntegration({ type: 'CLEAR_REWARD' })
  }, [cancelRedeemedReward, integration.phase, integration.redeem])

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

  const finalizeSale = useCallback(async (isRetry = false) => {
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
    const orderReason = isRetry
      ? 'O registro do pedido falhou; enviar novamente a venda concluída para a BonifiQ.'
      : 'Pagamento em dinheiro confirmado; registrar a venda líquida e sua pontuação.'
    const result = await bonifiqClient.createOrder(orderData, { reason: orderReason })
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
    if (integration.retryAction === 'rewards') return loadRewards(rewardsRefreshReason.retry)
    if (integration.retryAction === 'challenge' && integration.selectedReward && integration.transactionId && integration.originalKey) return createChallenge(integration.selectedReward, integration.cashbackCents, integration.transactionId, integration.originalKey, 'A criação do challenge falhou; tentar novamente com o mesmo TransactionId.')
    if (integration.retryAction === 'redeem' && integration.selectedReward && integration.originalKey) return processRedeem(integration.selectedReward, integration.cashbackCents, integration.originalKey, 'O resgate anterior falhou; repetir com a mesma OriginalKey.')
    if (integration.retryAction === 'order') return finalizeSale(true)
    if (integration.retryAction === 'cancel-reward') return backToSelection(true)
    if (integration.retryAction === 'remove-reward') return removeReward(true)
  }

  const dismissIntegrationError = (): void => {
    if (integration.retryAction === 'validation' && integration.challenge) {
      dispatchIntegration({ type: 'CHALLENGE_READY', challenge: integration.challenge })
      return
    }
    if ((integration.retryAction === 'cancel-reward' || integration.retryAction === 'remove-reward') && integration.redeem) return
    dispatchIntegration({ type: 'CLEAR_REWARD' })
  }

  const newSale = (): void => clearSale()
  const viewOrders = (): void => { setOrderResult(null); setShowOrders(true); setOrderNotice(null) }
  const backToPdv = (): void => { setShowOrders(false); setOrderNotice(null) }

  const cancelOrder = async (order: OrderRecord, reason = 'O operador cancelou o pedido inteiro; registrar o cancelamento na BonifiQ.'): Promise<void> => {
    setProcessingOrderId(order.originalId)
    setOrderNotice(null)
    const cancelledDate = new Date().toISOString()
    const result = await bonifiqClient.cancelOrder(order.originalId, cancelledDate, 'Cancelado', { reason })
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
    if (remaining.every(item => item.cancelledQuantity >= item.quantity)) return cancelOrder(order, 'Os itens selecionados esgotam o pedido; registrar um cancelamento integral.')
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
    }, { reason: 'O operador selecionou parte dos itens; registrar a devolução proporcional.' })
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
    nextRewardsRefreshReason.current = rewardsRefreshReason.loadedScenario
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
    backToSelection, removeReward, confirmReward, validateCode, cancelPendingReward, finalizeSale,
    retryIntegration, dismissIntegrationError,
    closeRewardsSummary: () => setShowRewardsSummary(false),
    newSale, viewOrders, backToPdv, cancelOrder, partialCancel, applyScenario,
  }
}
