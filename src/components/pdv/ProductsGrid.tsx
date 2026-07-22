import { PRODUCTS } from '../../data/products'
import { formatCents } from '../../pdv/money'
import type { CatalogProduct } from '../../pdv/types'

export function ProductsGrid({ onAddProduct }: { onAddProduct: (product: CatalogProduct) => void }) {
  return (
    <div className="products-section">
      <h2>🛍️ Produtos</h2>
      <div className="products-grid">
        {PRODUCTS.filter(product => product.availableForSale !== false).map(product => (
          <button type="button" key={product.id} className="product-card" onClick={() => onAddProduct(product)}>
            <div className="product-image">{product.icon}</div><div className="product-name">{product.name}</div><div className="product-price">{formatCents(product.priceCents)}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
