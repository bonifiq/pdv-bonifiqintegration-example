/**
 * Popup informativo com o saldo BonifiQ retornado em /rewards/available.
 */
export function RewardsSummaryModal({ rewardsSummary, isLoading, onConfirm }) {
  const availablePoints = rewardsSummary?.availablePoints || 0
  const availableCashback = rewardsSummary?.availableCashback || 0

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
