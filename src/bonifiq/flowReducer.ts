import type { AvailableReward, AvailableRewardsResponse, ChallengeResponse, RedeemResponse } from './types'
import type { MoneyCents } from '../pdv/types'

export type IntegrationPhase =
  | 'idle'
  | 'loading-rewards'
  | 'ready'
  | 'sending-challenge'
  | 'awaiting-code'
  | 'validating-code'
  | 'redeeming'
  | 'reward-applied'
  | 'cancelling-reward'
  | 'submitting-order'
  | 'error'

export type RetryAction = 'rewards' | 'challenge' | 'validation' | 'redeem' | 'order' | 'cancel-reward'

export interface IntegrationFlowState {
  phase: IntegrationPhase
  rewards: AvailableRewardsResponse | null
  selectedReward: AvailableReward | null
  cashbackCents: MoneyCents
  transactionId: string | null
  originalKey: string | null
  challenge: ChallengeResponse | null
  customerValidated: boolean
  redeem: RedeemResponse | null
  error: string | null
  retryAction: RetryAction | null
}

export const initialIntegrationState: IntegrationFlowState = {
  phase: 'idle',
  rewards: null,
  selectedReward: null,
  cashbackCents: 0,
  transactionId: null,
  originalKey: null,
  challenge: null,
  customerValidated: false,
  redeem: null,
  error: null,
  retryAction: null,
}

export type IntegrationAction =
  | { type: 'RESET' }
  | { type: 'REWARDS_LOADING' }
  | { type: 'REWARDS_LOADED'; rewards: AvailableRewardsResponse }
  | { type: 'PREPARE_REDEEM'; reward: AvailableReward; cashbackCents: MoneyCents; transactionId: string; originalKey: string }
  | { type: 'CHALLENGE_SENDING' }
  | { type: 'CHALLENGE_READY'; challenge: ChallengeResponse }
  | { type: 'CODE_VALIDATING' }
  | { type: 'CUSTOMER_VALIDATED' }
  | { type: 'REDEEMING' }
  | { type: 'REWARD_APPLIED'; redeem: RedeemResponse }
  | { type: 'REWARD_CANCELLING' }
  | { type: 'ORDER_SUBMITTING' }
  | { type: 'ERROR'; message: string; retryAction: RetryAction }
  | { type: 'CLEAR_REWARD' }

export function integrationFlowReducer(state: IntegrationFlowState, action: IntegrationAction): IntegrationFlowState {
  switch (action.type) {
    case 'RESET': return initialIntegrationState
    case 'REWARDS_LOADING': return { ...state, phase: 'loading-rewards', error: null, retryAction: null }
    case 'REWARDS_LOADED': return { ...state, phase: 'ready', rewards: action.rewards, error: null, retryAction: null }
    case 'PREPARE_REDEEM': return {
      ...state,
      phase: 'ready',
      selectedReward: action.reward,
      cashbackCents: action.cashbackCents,
      transactionId: action.transactionId,
      originalKey: action.originalKey,
      challenge: null,
      customerValidated: false,
      redeem: null,
      error: null,
      retryAction: null,
    }
    case 'CHALLENGE_SENDING': return { ...state, phase: 'sending-challenge', error: null, retryAction: null }
    case 'CHALLENGE_READY': return { ...state, phase: 'awaiting-code', challenge: action.challenge, error: null, retryAction: null }
    case 'CODE_VALIDATING': return { ...state, phase: 'validating-code', error: null, retryAction: null }
    case 'CUSTOMER_VALIDATED': return { ...state, customerValidated: true }
    case 'REDEEMING': return { ...state, phase: 'redeeming', error: null, retryAction: null }
    case 'REWARD_APPLIED': return { ...state, phase: 'reward-applied', redeem: action.redeem, challenge: null, error: null, retryAction: null }
    case 'REWARD_CANCELLING': return { ...state, phase: 'cancelling-reward', error: null, retryAction: null }
    case 'ORDER_SUBMITTING': return { ...state, phase: 'submitting-order', error: null, retryAction: null }
    case 'ERROR': return { ...state, phase: 'error', error: action.message, retryAction: action.retryAction }
    case 'CLEAR_REWARD': return {
      ...state,
      phase: state.rewards ? 'ready' : 'idle',
      selectedReward: null,
      cashbackCents: 0,
      transactionId: null,
      originalKey: null,
      challenge: null,
      customerValidated: false,
      redeem: null,
      error: null,
      retryAction: null,
    }
  }
}
