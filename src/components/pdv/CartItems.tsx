import { formatCents } from '../../pdv/money'
import type { CartItem } from '../../pdv/types'

interface Props { items: CartItem[]; onRemoveItem: (id: string) => void; onUpdateQuantity: (id: string, quantity: number) => void; readOnly?: boolean }

export function CartItems({ items, onRemoveItem, onUpdateQuantity, readOnly = false }: Props) {
  if (!items.length) return <div className="cart-empty"><p>🛒 Carrinho vazio</p><p style={{ fontSize: 13, marginTop: 8 }}>Clique em um produto para adicionar</p></div>
  return <div className="cart-items">{items.map(item => (
    <div key={item.id} className="cart-item">
      <div className="cart-item-info"><div className="cart-item-icon">{item.icon}</div><div>
        <div className="cart-item-name">{item.name}</div>
        {item.isRewardProduct && <div className="cart-item-reward-badge">🎁 {item.rewardLabel}</div>}
        <div className="cart-item-qty">
          {!readOnly && !item.isRewardProduct && <button aria-label={`Diminuir ${item.name}`} onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>➖</button>}
          {item.quantity}x
          {!readOnly && !item.isRewardProduct && <button aria-label={`Aumentar ${item.name}`} onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>➕</button>}
        </div>
      </div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="cart-item-prices">
          {(item.originalPriceCents ?? item.priceCents) > item.priceCents && <span className="cart-item-original-price">{formatCents((item.originalPriceCents ?? item.priceCents) * item.quantity)}</span>}
          <span className="cart-item-price">{formatCents(item.priceCents * item.quantity)}</span>
        </div>
        {!readOnly && !item.isRewardProduct && <button className="cart-item-remove" aria-label={`Remover ${item.name}`} onClick={() => onRemoveItem(item.id)}>✕</button>}
      </div>
    </div>
  ))}</div>
}
