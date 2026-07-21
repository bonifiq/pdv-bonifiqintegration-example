import { formatCents, fromCents } from '../../pdv/money'

interface Props { subtotalCents: number; manualDiscountCents: number; totalCents: number; onManualDiscountChange: (value: number) => void; disabled?: boolean }

export function PaymentSection({ subtotalCents, manualDiscountCents, totalCents, onManualDiscountChange, disabled = false }: Props) {
  return <section className="payment-section">
    <div className="payment-section-header"><div><span className="payment-eyebrow">Forma de pagamento</span><h2>Pagamento</h2></div><span className="payment-step-badge">Etapa 2 de 2</span></div>
    <div className="payment-method-card selected"><span className="payment-method-icon">💵</span><span className="payment-method-copy"><strong>Dinheiro</strong><small>Única forma disponível nesta versão</small></span><span className="payment-method-check">✓</span></div>
    <div className="manual-discount-card">
      <div className="manual-discount-heading"><div><label htmlFor="manual-discount">Desconto manual</label><small>Opcional · aplicado antes da BonifiQ</small></div>{manualDiscountCents > 0 && <button onClick={() => onManualDiscountChange(0)} disabled={disabled}>Remover</button>}</div>
      <div className="manual-discount-input-wrap"><span>R$</span><input id="manual-discount" type="number" min="0" max={fromCents(subtotalCents)} step="0.01" value={fromCents(manualDiscountCents)} onChange={event => onManualDiscountChange(Number(event.target.value))} disabled={disabled} /></div>
      <small className="manual-discount-limit">Máximo disponível: {formatCents(subtotalCents)}</small>
    </div>
    <div className="cash-total-card"><span>Valor a receber em dinheiro</span><strong>{formatCents(totalCents)}</strong></div>
  </section>
}
