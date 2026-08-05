import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bonifiqClient } from '../bonifiq/client'
import { clearIntegrationTrace } from '../bonifiq/trace'
import { CannotUseReason, RewardType, type AvailableRewardsRequest } from '../bonifiq/types'
import { useSaleFlow } from './useSaleFlow'

beforeEach(() => {
  vi.restoreAllMocks()
  clearIntegrationTrace()
})

describe('fluxo completo da venda', () => {
  it('consulta benefícios com valor bruto e mantém a base líquida local', async () => {
    let lastRequest: AvailableRewardsRequest | null = null
    let lastReason = ''
    const getAvailableRewards = vi.spyOn(bonifiqClient, 'getAvailableRewards').mockImplementation(async (request, context) => {
      lastRequest = request
      lastReason = context.reason
      const canUse = request.purchaseValue >= 90
      return {
        ok: true,
        data: {
          customer: null,
          rewards: [{
            id: 90,
            title: 'Benefício com mínimo de R$ 90',
            rewardType: RewardType.FixedValueDiscount,
            value: 10,
            points: 100,
            canUse,
            cannotUseReason: canUse ? CannotUseReason.CanUse : CannotUseReason.MinimumValueNotReached,
            requirements: 'Válido para compras acima de R$ 90,00',
            rewardCanBeCumulative: true,
            isCashback: false,
            canSelectValue: false,
            availableCashback: 0,
            maxCashbackForCurrentPurchase: 0,
          }],
          availablePoints: 500,
          canUseReward: canUse,
          hasRewards: true,
          cashbackEnabled: false,
          availableCashback: 0,
          maxCashbackForCurrentPurchase: 0,
          shouldValidateCustomer: false,
          shouldValidateCustomerSignup: false,
        },
      }
    })

    const { result } = renderHook(() => useSaleFlow())
    act(() => {
      result.current.selectCustomer({ document: '12345678900', name: 'Cliente Teste', email: 'teste@example.com', phone: '11999999999' })
      result.current.addProduct({ id: 'TEST-100', name: 'Produto de R$ 100', priceCents: 10000, icon: '🧪' })
    })
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'))

    act(() => result.current.changeManualDiscount(20))
    await waitFor(() => expect(lastRequest?.discountValue).toBe(20))

    expect(lastRequest).toMatchObject({ purchaseValue: 100, discountValue: 20 })
    expect(result.current.subtotalCents).toBe(10000)
    expect(result.current.bonifiqBaseCents).toBe(8000)
    expect(result.current.integration.rewards?.rewards[0]).toMatchObject({ canUse: true })
    expect(getAvailableRewards).toHaveBeenCalledTimes(2)
    expect(getAvailableRewards.mock.calls[0][1].reason).toBe('Carrinho alterado; revalidar elegibilidade e benefícios.')
    expect(lastReason).toBe('Desconto manual alterado; revalidar elegibilidade e limites.')
  })

  it('resgata brinde e envia ExternalCode como coupon do pedido', async () => {
    const sendChallenge = vi.spyOn(bonifiqClient, 'sendChallenge')
    const validateChallenge = vi.spyOn(bonifiqClient, 'validateChallenge')
    const redeemReward = vi.spyOn(bonifiqClient, 'redeemReward')
    const createOrder = vi.spyOn(bonifiqClient, 'createOrder')
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('gift'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 5)!
    await act(() => result.current.confirmReward(reward, null))
    expect(result.current.integration.phase).toBe('awaiting-code')
    const code = result.current.integration.challenge!.code!
    await act(() => result.current.validateCode(code))
    expect(result.current.integration.phase).toBe('reward-applied')
    expect(result.current.cartItems.some(item => item.originalId === 'P009' && item.priceCents === 0)).toBe(true)
    await act(() => result.current.finalizeSale())
    expect(result.current.orders[0].coupon).toBe(result.current.integration.redeem!.externalCode)
    expect(sendChallenge).toHaveBeenCalledWith(expect.any(Object), { reason: 'A recompensa escolhida exige validação de identidade antes do resgate.' })
    expect(validateChallenge).toHaveBeenCalledWith(expect.any(Object), { reason: 'O operador informou o código recebido; validar a identidade antes do resgate.' })
    expect(redeemReward).toHaveBeenCalledWith(expect.any(Object), { reason: 'Código validado; registrar o uso da recompensa escolhida.' })
    expect(createOrder).toHaveBeenCalledWith(expect.any(Object), { reason: 'Pagamento em dinheiro confirmado; registrar a venda líquida e sua pontuação.' })
    act(() => result.current.newSale())
  })

  it('aplica desconto de produto localmente em uma linha separada de uma unidade', async () => {
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('product-discount'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 6)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))

    expect(result.current.integration.phase).toBe('reward-applied')
    expect(result.current.integration.redeem).toMatchObject({ externalProductId: 'P001' })
    expect(result.current.integration.redeem).not.toHaveProperty('productDiscountTotal')
    expect(result.current.cartItems.filter(item => (item.originalId || item.id) === 'P001')).toHaveLength(2)
    expect(result.current.cartItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ isRewardProduct: true, quantity: 1, originalPriceCents: 4990, priceCents: 3992 }),
    ]))
  })

  it('adiciona produto ausente com preço final fixo de R$ 0,01 e o envia no pedido', async () => {
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('fixed-price-product'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 461)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))

    expect(result.current.cartItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P002', quantity: 1, priceCents: 12990 }),
      expect.objectContaining({ originalId: 'P009', isRewardProduct: true, quantity: 1, originalPriceCents: 2990, priceCents: 1 }),
    ]))
    await act(() => result.current.finalizeSale())
    expect(result.current.orders[0]).toMatchObject({ coupon: result.current.integration.redeem!.externalCode })
    expect(result.current.orders[0].orderData.products).toEqual(expect.arrayContaining([
      expect.objectContaining({ originalId: 'P009', productPrice: 0.01 }),
    ]))
  })

  it('estorna e remove a recompensa aplicada sem sair da etapa de pagamento', async () => {
    const cancelReward = vi.spyOn(bonifiqClient, 'cancelReward')
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('gift'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    act(() => result.current.continueToPayment())
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 5)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))
    const rewardId = result.current.integration.redeem!.rewardId

    expect(result.current.currentStep).toBe(2)
    expect(result.current.cartItems.some(item => item.isRewardProduct)).toBe(true)

    await act(() => result.current.removeReward())

    expect(cancelReward).toHaveBeenCalledWith(rewardId, { reason: 'O operador removeu o benefício aplicado; estornar antes de limpar a recompensa do PDV.' })
    expect(result.current.currentStep).toBe(2)
    expect(result.current.cartItems.some(item => item.isRewardProduct)).toBe(false)
    expect(result.current.integration.selectedReward).toBeNull()
    expect(result.current.integration.redeem).toBeNull()
  })

  it('mantém a recompensa aplicada quando o estorno falha', async () => {
    vi.spyOn(bonifiqClient, 'cancelReward').mockResolvedValue({
      ok: false,
      error: { code: 'CANCEL_FAILED', message: 'Falha no estorno', friendlyMessage: 'Não foi possível estornar a recompensa.', retryable: true },
    })
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('gift'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    act(() => result.current.continueToPayment())
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 5)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))

    await act(() => result.current.removeReward())

    expect(result.current.integration.retryAction).toBe('remove-reward')
    expect(result.current.integration.redeem).not.toBeNull()
    expect(result.current.cartItems.some(item => item.isRewardProduct)).toBe(true)
  })

  it('adiciona desconto fixo como uma unidade nova mesmo com máximo configurado maior', async () => {
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('fixed-price-product'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 463)!
    expect(reward.productMaxUnitsPerRedeem).toBe(3)
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))

    expect(result.current.cartItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ originalId: 'P004', isRewardProduct: true, quantity: 1, originalPriceCents: 3990, priceCents: 2990 }),
    ]))
  })

  it('estorna automaticamente quando o SKU retornado pelo redeem diverge do /available', async () => {
    vi.spyOn(bonifiqClient, 'redeemReward').mockResolvedValue({
      ok: true,
      data: { rewardId: 9876, externalCode: 'EXT-MISMATCH', originalKey: 'KEY-MISMATCH', externalProductId: 'P010' },
    })
    const cancelReward = vi.spyOn(bonifiqClient, 'cancelReward').mockResolvedValue({
      ok: true,
      data: { id: 9876, externalCode: 'EXT-MISMATCH', isCanceled: true, redeemDate: new Date().toISOString() },
    })

    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('gift'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 5)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))

    expect(cancelReward).toHaveBeenCalledWith(9876, { reason: 'O SKU retornado divergiu do /available; desfazer o resgate automaticamente.' })
    expect(result.current.cartItems.some(item => item.isRewardProduct)).toBe(false)
  })

  it('pula OTP quando ShouldValidateCustomer=false', async () => {
    const getAvailableRewards = vi.spyOn(bonifiqClient, 'getAvailableRewards')
    const redeemReward = vi.spyOn(bonifiqClient, 'redeemReward')
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('no-validation'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 1)!
    await act(() => result.current.confirmReward(reward, null))
    expect(result.current.integration.phase).toBe('reward-applied')
    expect(result.current.integration.challenge).toBeNull()
    expect(getAvailableRewards).toHaveBeenCalledWith(expect.any(Object), { reason: 'Cenário carregado; consultar benefícios para o cliente e carrinho definidos.' })
    expect(redeemReward).toHaveBeenCalledWith(expect.any(Object), { reason: 'A BonifiQ dispensou OTP; registrar o uso da recompensa escolhida.' })
  })

  it('reutiliza OriginalKey no retry de redeem', async () => {
    const redeemReward = vi.spyOn(bonifiqClient, 'redeemReward')
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('redeem-failure'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 1)!
    await act(() => result.current.confirmReward(reward, null))
    await act(() => result.current.validateCode(result.current.integration.challenge!.code!))
    expect(result.current.integration.retryAction).toBe('redeem')
    const originalKey = result.current.integration.originalKey
    await act(() => result.current.retryIntegration())
    expect(result.current.integration.phase).toBe('reward-applied')
    expect(result.current.integration.originalKey).toBe(originalKey)
    expect(redeemReward).toHaveBeenLastCalledWith(expect.any(Object), { reason: 'O resgate anterior falhou; repetir com a mesma OriginalKey.' })
  })
})
