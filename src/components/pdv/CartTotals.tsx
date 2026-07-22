import { formatCents } from '../../pdv/money'

interface Props { subtotalCents: number; manualDiscountCents: number; bonifiqBaseCents: number; bonifiqDiscountCents: number; bonifiqDiscountLabel: string; totalCents: number }

export function CartTotals(props: Props) {
  return <div className="totals-section">
    <div className="totals-row subtotal"><span>Valor dos produtos</span><span>{formatCents(props.subtotalCents)}</span></div>
    {props.manualDiscountCents > 0 && <div className="totals-row discount"><span>Desconto manual</span><span>-{formatCents(props.manualDiscountCents)}</span></div>}
    <div className="totals-row net-base"><span>Base para BonifiQ</span><span>{formatCents(props.bonifiqBaseCents)}</span></div>
    {props.bonifiqDiscountCents > 0 && <div className="totals-row discount"><span>{props.bonifiqDiscountLabel || 'Desconto BonifiQ'}</span><span>-{formatCents(props.bonifiqDiscountCents)}</span></div>}
    <div className="totals-row total"><span>Total líquido</span><span>{formatCents(props.totalCents)}</span></div>
  </div>
}
