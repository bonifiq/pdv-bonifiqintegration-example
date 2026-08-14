import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CannotUseReason, ProductDiscountMode, RewardType, type AvailableReward, type AvailableRewardsResponse } from '../../bonifiq/types'
import { BonifiQSection } from './BonifiQSection'

const reward = (overrides: Partial<AvailableReward>): AvailableReward => ({
  id: 1,
  title: 'R$ 10,00 de desconto',
  rewardType: RewardType.FixedValueDiscount,
  value: 10,
  points: 100,
  canUse: true,
  cannotUseReason: CannotUseReason.CanUse,
  rewardCanBeCumulative: true,
  isCashback: false,
  canSelectValue: false,
  availableCashback: 0,
  maxCashbackForCurrentPurchase: 0,
  ...overrides,
})

const rewardsData: AvailableRewardsResponse = {
  rewards: [
    reward({ id: 1, title: 'R$ 10,00 de desconto' }),
    reward({ id: 2, title: 'Cashback da compra', rewardType: RewardType.Cashback, isCashback: true, canSelectValue: true, availableCashback: 30, maxCashbackForCurrentPurchase: 20 }),
    reward({ id: 3, title: 'Caneca de brinde', rewardType: RewardType.ProductDiscount, canUse: false, cannotUseReason: CannotUseReason.NotEnoughPoints, externalProductId: 'P009', productDisplayName: 'Caneca', productDiscountMode: ProductDiscountMode.FreeGift, productDiscountValue: 0 }),
  ],
  availablePoints: 500,
  canUseReward: true,
  hasRewards: true,
  cashbackEnabled: true,
  availableCashback: 30,
  maxCashbackForCurrentPurchase: 20,
  shouldValidateCustomer: false,
  shouldValidateCustomerSignup: false,
}

describe('BonifiQSection', () => {
  it('mostra todas as recompensas juntas no popup, sem filtros por categoria', async () => {
    const user = userEvent.setup()

    render(<BonifiQSection
      rewardsData={rewardsData}
      loading={false}
      selectedReward={null}
      catalogProducts={[{ id: 'P009', name: 'Caneca', priceCents: 2990, icon: '☕' }]}
      onConfirmReward={vi.fn(async () => undefined)}
      onRemoveReward={vi.fn(async () => undefined)}
      isRedeemed={false}
      canRemoveReward={false}
      disabled={false}
    />)

    await user.click(screen.getByRole('button', { name: /Escolher benefício/ }))

    expect(screen.getByRole('heading', { name: 'Benefícios disponíveis' })).toBeVisible()
    expect(screen.getByText('3 benefícios encontrados')).toBeVisible()
    expect(screen.getByText('2 podem ser resgatados agora')).toBeVisible()
    expect(screen.getByText('R$ 10,00 de desconto')).toBeVisible()
    expect(screen.getByText('Cashback da compra')).toBeVisible()
    expect(screen.getByText('Caneca de brinde')).toBeVisible()
    expect(screen.getByText('Pontos insuficientes')).toBeVisible()
    expect(screen.queryByLabelText('Filtrar recompensas')).not.toBeInTheDocument()
  })
})
