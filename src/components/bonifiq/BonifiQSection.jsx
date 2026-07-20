import { useEffect, useState } from 'react'
import * as BonifiQ from '../../services/bonifiq'

/**
 * Seção compacta de recompensas BonifiQ.
 * A lista completa fica em um seletor modal para não aumentar a altura do PDV.
 */
export function BonifiQSection({
  customer,
  purchaseValue,
  onRewardSelected,
  selectedReward,
  onCashbackValueChange,
  onRedeem,
  isRedeemed = false,
  isProcessing = false,
  discountValue = 0,
  cartItems = [],
  catalogProducts = [],
  disabled
}) {
  const [loading, setLoading] = useState(false)
  const [rewardsData, setRewardsData] = useState(null)
  const [error, setError] = useState(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [rewardFilter, setRewardFilter] = useState('all')
  const [rewardToConfirm, setRewardToConfirm] = useState(null)
  const [confirmationCashback, setConfirmationCashback] = useState(0)

  useEffect(() => {
    if (!customer) {
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
          discountValue,
          cartItems.map(item => ({
            originalId: item.originalId || item.id,
            lineId: String(item.id),
            title: item.name,
            isActive: true,
            quantity: item.quantity,
            productPrice: item.originalPrice ?? item.price,
            productDiscountPrice: item.originalPrice > item.price ? item.price : null,
            productBrand: item.brand || null,
            productCategory: item.category || null,
          }))
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
  }, [customer, purchaseValue, discountValue, cartItems])

  useEffect(() => {
    if (!isPickerOpen) return undefined

    const handleKeyDown = event => {
      if (event.key !== 'Escape') return
      if (rewardToConfirm) {
        setRewardToConfirm(null)
      } else {
        setIsPickerOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPickerOpen, rewardToConfirm])

  if (!customer) return null

  const availablePoints = rewardsData?.availablePoints || 0
  const availableCashback = rewardsData?.availableCashback || 0

  const renderBalances = () => (
    <div className="bonifiq-balances">
      <div className="bonifiq-balance-item">
        <span className="bonifiq-balance-icon">◆</span>
        <span>
          <small>Pontos</small>
          <strong className="bonifiq-points-value">{availablePoints}</strong>
        </span>
      </div>
      {availableCashback > 0 && (
        <div className="bonifiq-balance-item cashback">
          <span className="bonifiq-balance-icon">$</span>
          <span>
            <small>Cashback</small>
            <strong className="bonifiq-cashback-balance-value">
              {availableCashback.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </span>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="bonifiq-section bonifiq-section-state">
        <div className="bonifiq-loading">
          <span className="bonifiq-loading-dot" />
          Consultando benefícios...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bonifiq-section bonifiq-section-state">
        <div className="bonifiq-no-rewards error">{error}</div>
      </div>
    )
  }

  const rewards = rewardsData?.rewards || []

  const getCatalogProduct = reward => catalogProducts.find(product =>
    String(product.id).toLowerCase() === String(reward?.externalProductId).toLowerCase()
  )

  const getRewardMeta = reward => {
    const isProductReward = BonifiQ.isProductDiscountReward(reward)
    const isGift = BonifiQ.isFreeGiftReward(reward)
    const catalogProduct = getCatalogProduct(reward)
    const productExistsInPdv = !isProductReward || !!catalogProduct

    return {
      isProductReward,
      isGift,
      catalogProduct,
      productExistsInPdv,
      canSelect: reward.canUse && productExistsInPdv,
      icon: reward.isCashback ? '💰' : (isGift ? '🎁' : isProductReward ? '🛍️' : '🏷️'),
      category: reward.isCashback ? 'cashback' : isProductReward ? 'products' : 'discounts',
    }
  }

  const getRewardValue = reward => {
    if (reward.isCashback) {
      return `Até ${reward.maxCashbackForCurrentPurchase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    }
    if (BonifiQ.isProductDiscountReward(reward)) {
      return BonifiQ.getProductDiscountDescription(reward)
    }
    if (reward.rewardType === 0) return `${reward.value}% de desconto`
    return Number(reward.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getRewardCost = reward => {
    if (reward.isCashback) {
      return `Saldo ${reward.availableCashback.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    }
    return reward.points > 0 ? `${reward.points} pontos` : 'Sem custo em pontos'
  }

  const getUnavailableReason = (reward, meta) => {
    if (!meta.productExistsInPdv) return 'Produto não encontrado neste PDV'
    if (reward.isCashback) return reward.availableCashback > 0 ? 'Valor mínimo não atingido' : 'Sem saldo'
    if (availablePoints < reward.points) return 'Pontos insuficientes'
    return reward.requirements || 'Requisitos não atendidos'
  }

  const selectableRewards = rewards.filter(reward => getRewardMeta(reward).canSelect)
  const filterOptions = [
    { id: 'all', label: 'Todas', count: rewards.length },
    { id: 'products', label: 'Produtos', count: rewards.filter(reward => getRewardMeta(reward).category === 'products').length },
    { id: 'discounts', label: 'Descontos', count: rewards.filter(reward => getRewardMeta(reward).category === 'discounts').length },
    { id: 'cashback', label: 'Cashback', count: rewards.filter(reward => getRewardMeta(reward).category === 'cashback').length },
  ].filter(filter => filter.id === 'all' || filter.count > 0)
  const filteredRewards = rewardFilter === 'all'
    ? rewards
    : rewards.filter(reward => getRewardMeta(reward).category === rewardFilter)

  const handleSelectReward = reward => {
    const meta = getRewardMeta(reward)
    if (disabled || !meta.canSelect) return

    setRewardToConfirm(reward)
    setConfirmationCashback(reward.isCashback ? reward.maxCashbackForCurrentPurchase : 0)
  }

  const handleConfirmReward = () => {
    if (!rewardToConfirm || disabled || isProcessing) return

    const confirmedCashback = rewardToConfirm.isCashback ? confirmationCashback : null
    onRewardSelected(rewardToConfirm)
    if (rewardToConfirm.isCashback) onCashbackValueChange(confirmedCashback)
    onRedeem(rewardToConfirm, confirmedCashback)
    setRewardToConfirm(null)
    setIsPickerOpen(false)
  }

  const closePicker = () => {
    setRewardToConfirm(null)
    setIsPickerOpen(false)
  }

  const renderSectionHeader = title => (
    <div className="bonifiq-header">
      <div className="bonifiq-heading">
        <span className="bonifiq-brand-mark">B</span>
        <div>
          <small>BonifiQ</small>
          <h3>{title}</h3>
        </div>
      </div>
      {renderBalances()}
    </div>
  )

  if (!rewardsData || !rewardsData.hasRewards) {
    return (
      <div className="bonifiq-section">
        {renderSectionHeader('Benefícios')}
        <div className="bonifiq-no-rewards">
          <span>✨</span>
          <div>
            <strong>Nenhum benefício disponível</strong>
            <small>Os saldos continuam visíveis para consulta.</small>
          </div>
        </div>
      </div>
    )
  }

  const selectedMeta = selectedReward ? getRewardMeta(selectedReward) : null

  return (
    <>
      <section className="bonifiq-section">
        {renderSectionHeader('Benefícios')}

        {selectedReward ? (
          <div className="bonifiq-selected-reward">
            <div className="bonifiq-selected-icon">{selectedMeta.icon}</div>
            <div className="bonifiq-selected-content">
              <small>{isRedeemed ? 'Recompensa resgatada' : 'Resgate em andamento'}</small>
              <strong>{selectedReward.title}</strong>
              <span>{getRewardValue(selectedReward)} · {getRewardCost(selectedReward)}</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="bonifiq-picker-trigger"
            onClick={() => setIsPickerOpen(true)}
            disabled={disabled}
          >
            <span className="bonifiq-picker-trigger-icon">✨</span>
            <span className="bonifiq-picker-trigger-copy">
              <strong>Escolher benefício</strong>
              <small>{selectableRewards.length} disponível(is) para este cliente</small>
            </span>
            <span className="bonifiq-picker-trigger-arrow">›</span>
          </button>
        )}

        {selectedReward && isRedeemed && (
          <div className="bonifiq-redeemed-status">
            <span>✓</span>
            <div>
              <strong>Benefício aplicado</strong>
              <small>Agora você pode finalizar a venda.</small>
            </div>
          </div>
        )}

      </section>

      {isPickerOpen && (
        <div
          className="reward-picker-overlay"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closePicker()
          }}
        >
          {rewardToConfirm ? (
            <div className="reward-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reward-confirm-title">
              <div className="reward-confirm-icon">{getRewardMeta(rewardToConfirm).icon}</div>
              <span className="reward-confirm-eyebrow">Confirmar benefício</span>
              <h2 id="reward-confirm-title">{rewardToConfirm.title}</h2>
              <p>
                Ao confirmar, o benefício será resgatado imediatamente para esta venda.
              </p>

              <div className="reward-confirm-summary">
                <div>
                  <span>Benefício</span>
                  <strong>{getRewardValue(rewardToConfirm)}</strong>
                </div>
                <div>
                  <span>Custo</span>
                  <strong>{getRewardCost(rewardToConfirm)}</strong>
                </div>
              </div>

              {rewardToConfirm.isCashback && (
                <div className="reward-confirm-cashback">
                  <div>
                    <label htmlFor="reward-confirm-cashback-value">Cashback a utilizar</label>
                    <strong>
                      {confirmationCashback.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                  <input
                    id="reward-confirm-cashback-value"
                    type="range"
                    min={1}
                    max={rewardToConfirm.maxCashbackForCurrentPurchase}
                    step={1}
                    value={confirmationCashback}
                    onChange={event => setConfirmationCashback(parseFloat(event.target.value))}
                  />
                </div>
              )}

              {rewardsData.shouldValidateCustomer && (
                <div className="reward-confirm-validation">
                  🔐 A identidade do cliente será validada antes do resgate.
                </div>
              )}

              <div className="reward-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRewardToConfirm(null)}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn reward-confirm-submit"
                  onClick={handleConfirmReward}
                  disabled={disabled || isProcessing}
                >
                  {getRewardMeta(rewardToConfirm).isProductReward
                    ? 'Confirmar resgate'
                    : 'Confirmar e aplicar'}
                </button>
              </div>
            </div>
          ) : (
          <div className="reward-picker-modal" role="dialog" aria-modal="true" aria-labelledby="reward-picker-title">
            <header className="reward-picker-header">
              <div>
                <span className="reward-picker-eyebrow">BonifiQ · {availablePoints} pontos</span>
                <h2 id="reward-picker-title">Escolha um benefício</h2>
                <p>Selecione a melhor opção para esta venda.</p>
              </div>
              <button
                type="button"
                className="reward-picker-close"
                aria-label="Fechar lista de recompensas"
                onClick={closePicker}
              >
                ×
              </button>
            </header>

            <div className="reward-picker-filters" aria-label="Filtrar recompensas">
              {filterOptions.map(filter => (
                <button
                  type="button"
                  key={filter.id}
                  className={rewardFilter === filter.id ? 'active' : ''}
                  aria-pressed={rewardFilter === filter.id}
                  onClick={() => setRewardFilter(filter.id)}
                >
                  {filter.label}
                  <span>{filter.count}</span>
                </button>
              ))}
            </div>

            <div className="reward-picker-grid">
              {filteredRewards.map(reward => {
                const meta = getRewardMeta(reward)
                const isSelected = selectedReward?.id === reward.id

                return (
                  <button
                    type="button"
                    key={reward.id}
                    className={`reward-picker-card ${isSelected ? 'selected' : ''} ${!meta.canSelect ? 'disabled' : ''}`}
                    onClick={() => handleSelectReward(reward)}
                    disabled={disabled || !meta.canSelect}
                    aria-pressed={isSelected}
                  >
                    <span className="reward-picker-card-topline">
                      <span className="reward-picker-card-icon">{meta.icon}</span>
                      <span className={`reward-picker-card-type ${meta.category}`}>
                        {meta.isGift ? 'Brinde' : meta.isProductReward ? 'Produto' : reward.isCashback ? 'Cashback' : 'Desconto'}
                      </span>
                      {isSelected && <span className="reward-picker-selected-badge">Selecionada</span>}
                    </span>

                    <strong className="reward-picker-card-title">{reward.title}</strong>
                    {meta.isProductReward && (
                      <span className="reward-picker-product-name">
                        {reward.productDisplayName || meta.catalogProduct?.name || reward.externalProductId}
                      </span>
                    )}
                    {reward.requirements && <span className="reward-picker-requirements">{reward.requirements}</span>}

                    <span className="reward-picker-card-footer">
                      <span>
                        <small>Custo</small>
                        <strong>{getRewardCost(reward)}</strong>
                      </span>
                      <span className="reward-picker-benefit">
                        <small>Benefício</small>
                        <strong>{getRewardValue(reward)}</strong>
                      </span>
                    </span>

                    {!meta.canSelect && (
                      <span className="reward-picker-unavailable">{getUnavailableReason(reward, meta)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          )}
        </div>
      )}
    </>
  )
}
