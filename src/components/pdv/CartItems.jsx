/**
 * Itens do carrinho de compras
 */
export function CartItems({ items, onRemoveItem, onUpdateQuantity, readOnly = false }) {
  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <p>🛒 Carrinho vazio</p>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Clique em um produto para adicionar</p>
      </div>
    )
  }

  return (
    <div className="cart-items">
      {items.map(item => (
        <div key={item.id} className="cart-item">
          <div className="cart-item-info">
            <div className="cart-item-icon">{item.icon}</div>
            <div>
              <div className="cart-item-name">{item.name}</div>
              {item.isRewardProduct && (
                <div className="cart-item-reward-badge">🎁 {item.rewardLabel}</div>
              )}
              <div className="cart-item-qty">
                {!readOnly && !item.isRewardProduct && (
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    ➖
                  </button>
                )}
                {item.quantity}x
                {!readOnly && !item.isRewardProduct && (
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    ➕
                  </button>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="cart-item-prices">
              {item.originalPrice > item.price && (
                <span className="cart-item-original-price">
                  {(item.originalPrice * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
              <span className="cart-item-price">
              {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {!readOnly && !item.isRewardProduct && (
              <button className="cart-item-remove" onClick={() => onRemoveItem(item.id)}>
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
