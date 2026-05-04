/**
 * Seção de totais do carrinho
 */
export function CartTotals({
  subtotal,
  birthdayDiscount,
  birthdayDiscountPercent,
  bonifiqBaseTotal,
  bonifiqDiscount,
  bonifiqDiscountLabel,
  total,
}) {
  const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="totals-section">
      <div className="totals-row subtotal">
        <span>Valor dos produtos</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {birthdayDiscount > 0 && (
        <div className="totals-row discount">
          <span>Desconto de Aniversário ({birthdayDiscountPercent}%)</span>
          <span>-{formatCurrency(birthdayDiscount)}</span>
        </div>
      )}
      <div className="totals-row net-base">
        <span>Base para BonifiQ</span>
        <span>{formatCurrency(bonifiqBaseTotal)}</span>
      </div>
      {bonifiqDiscount > 0 && (
        <div className="totals-row discount">
          <span>{bonifiqDiscountLabel || 'Desconto BonifiQ'}</span>
          <span>-{formatCurrency(bonifiqDiscount)}</span>
        </div>
      )}
      <div className="totals-row total">
        <span>Total líquido</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
