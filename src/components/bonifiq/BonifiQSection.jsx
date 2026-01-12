import { useState, useEffect } from 'react'
import * as BonifiQ from '../../services/bonifiq'

/**
 * Seção de recompensas BonifiQ
 * Este componente encapsula toda a lógica de consulta e seleção de recompensas
 */
export function BonifiQSection({ 
  customer, 
  purchaseValue, 
  onRewardSelected,
  selectedReward,
  cashbackValue,
  onCashbackValueChange,
  disabled
}) {
  const [loading, setLoading] = useState(false)
  const [rewardsData, setRewardsData] = useState(null)
  const [error, setError] = useState(null)

  // Consulta recompensas quando cliente ou valor mudam
  useEffect(() => {
    if (!customer || purchaseValue <= 0) {
      setRewardsData(null)
      return
    }

    const fetchRewards = async () => {
      setLoading(true)
      setError(null)
      try {
        // ======== CHAMADA BONIFIQ: /rewards/available ========
        const result = await BonifiQ.getAvailableRewards(
          customer.document,
          purchaseValue,
          0 // sem outros descontos
        )
        setRewardsData(result)
      } catch (err) {
        setError('Erro ao consultar recompensas')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
  }, [customer, purchaseValue])

  if (!customer || purchaseValue <= 0) {
    return null
  }

  if (loading) {
    return (
      <div className="bonifiq-section">
        <div className="bonifiq-loading">
          ⏳ Consultando recompensas...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bonifiq-section">
        <div className="bonifiq-no-rewards" style={{ color: '#ef4444' }}>
          {error}
        </div>
      </div>
    )
  }

  if (!rewardsData || !rewardsData.hasRewards) {
    return (
      <div className="bonifiq-section">
        <div className="bonifiq-header">
          <h3>Recompensas</h3>
          <div className="bonifiq-points">
            <span>Pontos:</span>
            <span className="bonifiq-points-value">{rewardsData?.availablePoints || 0}</span>
          </div>
        </div>
        <div className="bonifiq-no-rewards">
          😕 Nenhuma recompensa disponível para este cliente no momento
        </div>
      </div>
    )
  }

  const handleSelectReward = (reward) => {
    if (disabled || !reward.canUse) return
    
    if (selectedReward?.id === reward.id) {
      onRewardSelected(null) // Deseleciona
    } else {
      onRewardSelected(reward)
      if (reward.isCashback) {
        onCashbackValueChange(reward.maxCashbackForCurrentPurchase)
      }
    }
  }

  return (
    <div className="bonifiq-section">
      <div className="bonifiq-header">
        <h3>Recompensas Disponíveis</h3>
        <div className="bonifiq-points">
          <span>Pontos:</span>
          <span className="bonifiq-points-value">{rewardsData.availablePoints}</span>
        </div>
      </div>

      <div className="bonifiq-rewards">
        {rewardsData.rewards.map(reward => (
          <div
            key={reward.id}
            className={`bonifiq-reward ${!reward.canUse ? 'disabled' : ''} ${selectedReward?.id === reward.id ? 'selected' : ''}`}
            onClick={() => handleSelectReward(reward)}
          >
            <div className="bonifiq-reward-info">
              <div className="bonifiq-reward-title">
                {reward.isCashback ? '💰' : '🏷️'} {reward.title}
              </div>
              {!reward.isCashback && (
                <div className="bonifiq-reward-points">{reward.points} pontos</div>
              )}
              {reward.isCashback && (
                <div className="bonifiq-reward-points">
                  Saldo: {reward.availableCashback.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              )}
              <div className="bonifiq-reward-requirements">{reward.requirements}</div>
            </div>
            {reward.canUse && !reward.isCashback && (
              <div className="bonifiq-reward-value">
                {reward.rewardType === 0 ? `${reward.value}%` : reward.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
            {reward.canUse && reward.isCashback && (
              <div className="bonifiq-reward-value">
                até {reward.maxCashbackForCurrentPurchase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
            {!reward.canUse && (
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {reward.isCashback 
                  ? (reward.availableCashback > 0 ? 'Valor mínimo não atingido' : 'Sem saldo')
                  : (rewardsData.availablePoints >= reward.points 
                      ? (reward.requirements || 'Requisitos não atendidos')
                      : 'Pontos insuficientes')
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Seletor de valor para Cashback */}
      {selectedReward?.isCashback && (
        <div className="bonifiq-cashback-slider">
          <label>Quanto cashback deseja usar?</label>
          <input
            type="range"
            min={1}
            max={selectedReward.maxCashbackForCurrentPurchase}
            step={1}
            value={cashbackValue}
            onChange={(e) => onCashbackValueChange(parseFloat(e.target.value))}
            disabled={disabled}
          />
          <div className="bonifiq-cashback-value">
            {cashbackValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
      )}

      {selectedReward && rewardsData.shouldValidateCustomer && (
        <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
          ⚠️ Será necessário validar a identidade do cliente ao finalizar
        </div>
      )}
    </div>
  )
}
