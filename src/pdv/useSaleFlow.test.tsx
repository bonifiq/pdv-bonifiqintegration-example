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
    vi.spyOn(bonifiqClient, 'getAvailableRewards').mockImplementation(async request => {
      lastRequest = request
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
  })

  it('resgata brinde e envia ExternalCode como coupon do pedido', async () => {
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
    expect(result.current.cartItems.filter(item => item.originalId === 'P001')).toEqual(expect.arrayContaining([
      expect.objectContaining({ isRewardProduct: true, quantity: 1, originalPriceCents: 4990, priceCents: 3992 }),
    ]))
  })

  it('pula OTP quando ShouldValidateCustomer=false', async () => {
    const { result } = renderHook(() => useSaleFlow())
    act(() => result.current.applyScenario('no-validation'))
    await waitFor(() => expect(result.current.integration.phase).toBe('ready'), { timeout: 3000 })
    const reward = result.current.integration.rewards!.rewards.find(item => item.id === 1)!
    await act(() => result.current.confirmReward(reward, null))
    expect(result.current.integration.phase).toBe('reward-applied')
    expect(result.current.integration.challenge).toBeNull()
  })

  it('reutiliza OriginalKey no retry de redeem', async () => {
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
  })
})
