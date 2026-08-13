import { useEffect, useState } from 'react'
import { getCannotUseReason, getProductRewardDescription, isFreeGift, isProductReward } from '../../bonifiq/rewardRules'
import { RewardType, type AvailableReward, type AvailableRewardsResponse } from '../../bonifiq/types'
import type { CatalogProduct } from '../../pdv/types'

type RewardKind = 'products' | 'discounts' | 'cashback'

interface Props {
  rewardsData: AvailableRewardsResponse | null
  loading: boolean
  selectedReward: AvailableReward | null
  catalogProducts: CatalogProduct[]
  onConfirmReward: (reward: AvailableReward, cashbackValue: number | null) => Promise<void>
  onRemoveReward: () => Promise<void>
  isRedeemed: boolean
  canRemoveReward: boolean
  disabled: boolean
}

const currency = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function BonifiQSection({ rewardsData, loading, selectedReward, catalogProducts, onConfirmReward, onRemoveReward, isRedeemed, canRemoveReward, disabled }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rewardToConfirm, setRewardToConfirm] = useState<AvailableReward | null>(null)
  const [cashbackValue, setCashbackValue] = useState(0)

  useEffect(() => {
    if (!pickerOpen) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && (rewardToConfirm ? setRewardToConfirm(null) : setPickerOpen(false))
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [pickerOpen, rewardToConfirm])

  const rewards = rewardsData?.rewards || []
  const productExists = (reward: AvailableReward) => !isProductReward(reward) || catalogProducts.some(product => product.id.toLowerCase() === String(reward.externalProductId || '').toLowerCase())
  const category = (reward: AvailableReward): RewardKind => reward.isCashback ? 'cashback' : isProductReward(reward) ? 'products' : 'discounts'
  const selectable = rewards.filter(reward => reward.canUse && productExists(reward))
  const displayedRewards = [...rewards].sort((left, right) => Number(right.canUse && productExists(right)) - Number(left.canUse && productExists(left)))

  const valueLabel = (reward: AvailableReward) => {
    if (reward.isCashback) return `Até ${currency(reward.maxCashbackForCurrentPurchase)}`
    if (isProductReward(reward)) return getProductRewardDescription(reward)
    if (reward.rewardType === RewardType.PercentDiscount) return `${reward.value}% de desconto`
    return currency(reward.value)
  }
  const costLabel = (reward: AvailableReward) => reward.isCashback ? `Saldo ${currency(reward.availableCashback)}` : reward.points > 0 ? `${reward.points} pontos` : 'Sem custo em pontos'
  const openConfirmation = (reward: AvailableReward) => {
    if (disabled || !reward.canUse || !productExists(reward)) return
    setRewardToConfirm(reward)
    setCashbackValue(reward.isCashback ? reward.maxCashbackForCurrentPurchase : 0)
  }
  const closePicker = () => { setRewardToConfirm(null); setPickerOpen(false) }

  if (loading && !rewardsData) return <div className="bonifiq-section bonifiq-section-state"><div className="bonifiq-loading"><span className="bonifiq-loading-dot" />Consultando benefícios...</div></div>

  const header = <div className="bonifiq-header"><div className="bonifiq-heading"><span className="bonifiq-brand-mark">B</span><div><small>BonifiQ</small><h3>Benefícios</h3></div></div><div className="bonifiq-balances"><div className="bonifiq-balance-item"><span className="bonifiq-balance-icon">◆</span><span><small>Pontos</small><strong>{rewardsData?.availablePoints || 0}</strong></span></div>{Number(rewardsData?.availableCashback || 0) > 0 && <div className="bonifiq-balance-item cashback"><span className="bonifiq-balance-icon">$</span><span><small>Cashback</small><strong>{currency(rewardsData!.availableCashback)}</strong></span></div>}</div></div>

  return <>
    <section className="bonifiq-section">
      {header}
      {!rewardsData?.hasRewards ? <div className="bonifiq-no-rewards"><span>✨</span><div><strong>Nenhum benefício disponível</strong><small>A venda ainda deve ser registrada para pontuação.</small></div></div> : selectedReward ? <>
        <div className="bonifiq-selected-reward">
          <div className="bonifiq-selected-icon">{isFreeGift(selectedReward) ? '🎁' : isProductReward(selectedReward) ? '🛍️' : selectedReward.isCashback ? '💰' : '🏷️'}</div>
          <div className="bonifiq-selected-content"><small>{isRedeemed ? 'Recompensa resgatada' : 'Resgate em andamento'}</small><strong>{selectedReward.title}</strong><span>{valueLabel(selectedReward)} · {costLabel(selectedReward)}</span></div>
          {isRedeemed && <div className="bonifiq-selected-actions"><button type="button" className="bonifiq-clear-button" aria-label="Remover Recompensa" title="Remover Recompensa" disabled={!canRemoveReward} onClick={() => void onRemoveReward()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor" /></svg></button></div>}
        </div>
        {isRedeemed && <div className="bonifiq-redeemed-status"><span>✓</span><div><strong>Benefício aplicado</strong><small>Agora você pode finalizar a venda.</small></div></div>}
      </> : <button type="button" className="bonifiq-picker-trigger" onClick={() => setPickerOpen(true)} disabled={disabled || !selectable.length}><span className="bonifiq-picker-trigger-icon">✨</span><span className="bonifiq-picker-trigger-copy"><strong>Escolher benefício</strong><small>{selectable.length} disponível(is) para este cliente</small></span><span className="bonifiq-picker-trigger-arrow">›</span></button>}
    </section>

    {pickerOpen && <div className="reward-picker-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && closePicker()}>
      {rewardToConfirm ? <div className="reward-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reward-confirm-title">
        <div className="reward-confirm-icon">{isFreeGift(rewardToConfirm) ? '🎁' : isProductReward(rewardToConfirm) ? '🛍️' : rewardToConfirm.isCashback ? '💰' : '🏷️'}</div><span className="reward-confirm-eyebrow">Confirmar benefício</span><h2 id="reward-confirm-title">{rewardToConfirm.title}</h2><p>Ao confirmar, o benefício será resgatado imediatamente para esta venda.</p>
        <div className="reward-confirm-summary"><div><span>Benefício</span><strong>{valueLabel(rewardToConfirm)}</strong></div><div><span>Custo</span><strong>{costLabel(rewardToConfirm)}</strong></div></div>
        {rewardToConfirm.isCashback && <div className="reward-confirm-cashback"><div><label htmlFor="reward-cashback">Cashback a utilizar</label><strong>{currency(cashbackValue)}</strong></div><input id="reward-cashback" type="range" min={1} max={rewardToConfirm.maxCashbackForCurrentPurchase} step={1} value={cashbackValue} onChange={event => setCashbackValue(Number(event.target.value))} /></div>}
        {rewardsData?.shouldValidateCustomer && <div className="reward-confirm-validation">🔐 A identidade do cliente será validada antes do resgate.</div>}
        <div className="reward-confirm-actions"><button className="btn btn-secondary" onClick={() => setRewardToConfirm(null)}>Voltar</button><button className="btn reward-confirm-submit" disabled={disabled} onClick={async () => { await onConfirmReward(rewardToConfirm, rewardToConfirm.isCashback ? cashbackValue : null); closePicker() }}>Confirmar e resgatar</button></div>
      </div> : <div className="reward-picker-modal" role="dialog" aria-modal="true" aria-labelledby="reward-picker-title">
        <header className="reward-picker-header"><div><span className="reward-picker-eyebrow">BonifiQ · {rewardsData?.availablePoints || 0} pontos</span><h2 id="reward-picker-title">Benefícios disponíveis</h2><p>Confira todas as opções e escolha uma para aplicar à venda.</p></div><button className="reward-picker-close" aria-label="Fechar lista de recompensas" onClick={closePicker}>×</button></header>
        <div className="reward-picker-overview"><div><strong>{rewards.length} {rewards.length === 1 ? 'benefício encontrado' : 'benefícios encontrados'}</strong><span>Todas as recompensas aparecem juntas nesta lista.</span></div><span className="reward-picker-available-count">{selectable.length} {selectable.length === 1 ? 'pode ser resgatado agora' : 'podem ser resgatados agora'}</span></div>
        <div className="reward-picker-grid">{displayedRewards.map(reward => {
          const exists = productExists(reward); const enabled = reward.canUse && exists; const kind = category(reward)
          return <button type="button" key={reward.id} className={`reward-picker-card ${!enabled ? 'disabled' : ''}`} onClick={() => openConfirmation(reward)} disabled={disabled || !enabled}>
            <span className="reward-picker-card-topline"><span className="reward-picker-card-icon">{isFreeGift(reward) ? '🎁' : isProductReward(reward) ? '🛍️' : reward.isCashback ? '💰' : '🏷️'}</span><span className={`reward-picker-card-type ${kind}`}>{isFreeGift(reward) ? 'Brinde' : isProductReward(reward) ? 'Produto' : reward.isCashback ? 'Cashback' : 'Desconto'}</span></span>
            <strong className="reward-picker-card-title">{reward.title}</strong>{isProductReward(reward) && <span className="reward-picker-product-name">{reward.productDisplayName || reward.externalProductId}</span>}
            <span className="reward-picker-card-footer"><span><small>Custo</small><strong>{costLabel(reward)}</strong></span><span className="reward-picker-benefit"><small>Benefício</small><strong>{valueLabel(reward)}</strong></span></span>
            {!enabled && <span className="reward-picker-unavailable">{!exists ? 'SKU não encontrado no catálogo do PDV' : getCannotUseReason(reward)}</span>}
          </button>
        })}</div>
      </div>}
    </div>}
  </>
}
