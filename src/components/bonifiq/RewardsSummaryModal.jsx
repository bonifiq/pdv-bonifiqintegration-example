/**
 * Popup informativo com o saldo BonifiQ retornado em /rewards/available.
 */
export function RewardsSummaryModal({ rewardsSummary, isLoading, onConfirm }) {
  const availablePoints = rewardsSummary?.availablePoints || 0
  const availableCashback = rewardsSummary?.availableCashback || 0
  const customer = rewardsSummary?.customer
  const currentTier = customer?.currentTier

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Saldo BonifiQ</h3>
        {isLoading ? (
          <p>Consultando saldo BonifiQ...</p>
        ) : (
          <div className="rewards-summary">
            {rewardsSummary?.errorMessage && (
              <p style={{ color: '#ef4444' }}>{rewardsSummary.errorMessage}</p>
            )}
            {currentTier && (
              <div
                className="rewards-summary-tier"
                style={{ '--tier-color': currentTier.color || '#2563eb' }}
              >
                <div className="rewards-summary-tier-icon">
                  {currentTier.iconUrl ? (
                    <img src={currentTier.iconUrl} alt="" />
                  ) : (
                    <span>★</span>
                  )}
                </div>
                <div className="rewards-summary-tier-info">
                  <span>Nível atual{customer?.name ? ` de ${customer.name}` : ''}</span>
                  <strong>{currentTier.name}</strong>
                </div>
              </div>
            )}
            <div className="rewards-summary-row">
              <span>Quantidade de pontos</span>
              <strong>{availablePoints}</strong>
            </div>
            <div className="rewards-summary-row">
              <span>Saldo de Cashback</span>
              <strong>
                {availableCashback.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </strong>
            </div>
          </div>
        )}
        <div className="modal-buttons">
          <button className="btn btn-primary" onClick={onConfirm} disabled={isLoading}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
