import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearIntegrationTrace } from '../bonifiq/trace'
import { useSaleFlow } from './useSaleFlow'

beforeEach(clearIntegrationTrace)

describe('fluxo completo da venda', () => {
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
