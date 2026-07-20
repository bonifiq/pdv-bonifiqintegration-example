/**
 * Pagamento da venda. Nesta versão da demo, somente dinheiro está disponível.
 */
export function PaymentSection({
  subtotal,
  manualDiscount,
  total,
  onManualDiscountChange,
  disabled = false,
}) {
  const formatCurrency = value => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <section className="payment-section">
      <div className="payment-section-header">
        <div>
          <span className="payment-eyebrow">Forma de pagamento</span>
          <h2>Pagamento</h2>
        </div>
        <span className="payment-step-badge">Etapa 2 de 2</span>
      </div>

      <div className="payment-method-card selected" aria-label="Forma de pagamento selecionada: Dinheiro">
        <span className="payment-method-icon">💵</span>
        <span className="payment-method-copy">
          <strong>Dinheiro</strong>
          <small>Única forma disponível nesta versão</small>
        </span>
        <span className="payment-method-check">✓</span>
      </div>

      <div className="manual-discount-card">
        <div className="manual-discount-heading">
          <div>
            <label htmlFor="manual-discount">Desconto manual</label>
            <small>Opcional · aplicado antes da BonifiQ</small>
          </div>
          {manualDiscount > 0 && (
            <button
              type="button"
              onClick={() => onManualDiscountChange(0)}
              disabled={disabled}
            >
              Remover
            </button>
          )}
        </div>

        <div className="manual-discount-input-wrap">
          <span>R$</span>
          <input
            id="manual-discount"
            type="number"
            min="0"
            max={subtotal}
            step="0.01"
            inputMode="decimal"
            value={manualDiscount}
            onChange={event => onManualDiscountChange(event.target.value)}
            disabled={disabled}
            aria-describedby="manual-discount-limit"
          />
        </div>
        <small id="manual-discount-limit" className="manual-discount-limit">
          Máximo disponível: {formatCurrency(subtotal)}
        </small>
      </div>

      <div className="cash-total-card">
        <span>Valor a receber em dinheiro</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
    </section>
  )
}
