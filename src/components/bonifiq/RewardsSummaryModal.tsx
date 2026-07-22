import type { AvailableRewardsResponse } from '../../bonifiq/types'

interface Props { rewardsSummary: AvailableRewardsResponse | null; isLoading: boolean; error?: string | null; onConfirm: () => void }

export function RewardsSummaryModal({ rewardsSummary, isLoading, error, onConfirm }: Props) {
  const tier = rewardsSummary?.customer?.currentTier
  return <div className="modal-overlay"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="balance-title">
    <h3 id="balance-title">Saldo BonifiQ</h3>
    {isLoading ? <p>Consultando saldo BonifiQ...</p> : <div className="rewards-summary">
      {error && <p className="validation-error">{error}</p>}
      {tier && <div className="rewards-summary-tier" style={{ '--tier-color': tier.color || '#2563eb' } as React.CSSProperties}>
        <div className="rewards-summary-tier-icon">{tier.iconUrl ? <img src={tier.iconUrl} alt="" /> : <span>★</span>}</div>
        <div className="rewards-summary-tier-info"><span>Nível atual{rewardsSummary?.customer?.name ? ` de ${rewardsSummary.customer.name}` : ''}</span><strong>{tier.name}</strong></div>
      </div>}
      <div className="rewards-summary-row"><span>Quantidade de pontos</span><strong>{rewardsSummary?.availablePoints || 0}</strong></div>
      <div className="rewards-summary-row"><span>Saldo de cashback</span><strong>{Number(rewardsSummary?.availableCashback || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      {rewardsSummary?.hasRestrictedItems && <>
        <div className="rewards-summary-row"><span>Valor restrito para cashback</span><strong>{Number(rewardsSummary.restrictedValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
        <div className="rewards-summary-row"><span>Valor elegível para cashback</span><strong>{Number(rewardsSummary.eligibleValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      </>}
    </div>}
    <div className="modal-buttons"><button className="btn btn-primary" onClick={onConfirm} disabled={isLoading}>OK</button></div>
  </div></div>
}
