import { describe, expect, it } from 'vitest'
import { integrationFlowReducer, initialIntegrationState } from './flowReducer'
import { CannotUseReason, RewardType, type AvailableReward } from './types'

const reward: AvailableReward = { id: 1, title: 'R$ 10', rewardType: RewardType.FixedValueDiscount, value: 10, points: 100, canUse: true, cannotUseReason: CannotUseReason.CanUse, rewardCanBeCumulative: true, isCashback: false, canSelectValue: false, availableCashback: 0, maxCashbackForCurrentPurchase: 0 }

describe('reducer do fluxo BonifiQ', () => {
  it('preserva chaves idempotentes ao entrar em erro e retry', () => {
    const prepared = integrationFlowReducer(initialIntegrationState, { type: 'PREPARE_REDEEM', reward, cashbackCents: 0, transactionId: 'T1', originalKey: 'K1' })
    const failed = integrationFlowReducer(prepared, { type: 'ERROR', message: 'timeout', retryAction: 'redeem' })
    const retrying = integrationFlowReducer(failed, { type: 'REDEEMING' })
    expect(retrying).toMatchObject({ originalKey: 'K1', transactionId: 'T1', selectedReward: reward, phase: 'redeeming' })
  })

  it('registra validação do cliente e limpa ao abandonar o resgate', () => {
    const validated = integrationFlowReducer(initialIntegrationState, { type: 'CUSTOMER_VALIDATED' })
    expect(validated.customerValidated).toBe(true)
    expect(integrationFlowReducer(validated, { type: 'CLEAR_REWARD' }).customerValidated).toBe(false)
  })
})
