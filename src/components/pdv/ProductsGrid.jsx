import { PRODUCTS } from '../../data/products'

/**
 * Grid de produtos disponíveis para venda
 */
export function ProductsGrid({ onAddProduct }) {
  return (
    <div className="products-section">
      <h2>🛍️ Produtos</h2>
      <div className="products-grid">
        {PRODUCTS.map(product => (
          <div 
            key={product.id} 
            className="product-card"
            onClick={() => onAddProduct(product)}
          >
            <div className="product-image">{product.icon}</div>
            <div className="product-name">{product.name}</div>
            <div className="product-price">
              {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
