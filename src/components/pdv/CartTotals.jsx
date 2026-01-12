/**
 * Seção de totais do carrinho
 */
export function CartTotals({ subtotal, discount, discountLabel }) {
  const total = subtotal - discount

  return (
    <div className="totals-section">
      <div className="totals-row subtotal">
        <span>Subtotal</span>
        <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      {discount > 0 && (
        <div className="totals-row discount">
          <span>{discountLabel || 'Desconto BonifiQ'}</span>
          <span>-{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      )}
      <div className="totals-row total">
        <span>Total</span>
        <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </div>
  )
}
