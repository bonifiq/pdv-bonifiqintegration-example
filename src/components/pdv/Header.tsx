import { PDV_STORES } from '../../pdv/saleContext'

interface Props {
  storeId: string
  onStoreChange: (storeId: string) => void
  disabled?: boolean
}

export function Header({ storeId, onStoreChange, disabled = false }: Props) {
  const now = new Date()
  return (
    <header className="header">
      <div className="header-logo"><span>PDV</span> Demo</div>
      <div className="header-info">
        <label className="header-store" title="Loja e política comercial enviadas na consulta, no resgate e no pedido">
          🏬
          <select aria-label="Loja" value={storeId} onChange={event => onStoreChange(event.target.value)} disabled={disabled}>
            {PDV_STORES.map(store => <option key={store.id} value={store.id}>{store.label}</option>)}
          </select>
        </label>
        <span>📅 {now.toLocaleDateString('pt-BR')}</span>
        <span>🕐 {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>👤 Vendedor: João</span>
      </div>
    </header>
  )
}
