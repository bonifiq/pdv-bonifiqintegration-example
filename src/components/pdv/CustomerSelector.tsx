import { useState } from 'react'
import { CUSTOMERS_DATABASE } from '../../data/customers'
import type { PdvCustomer } from '../../pdv/types'

interface Props {
  onSelectCustomer: (customer: PdvCustomer | null) => void
  selectedCustomer: PdvCustomer | null
  readOnly?: boolean
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer, readOnly = false }: Props) {
  const [document, setDocument] = useState('')
  const [error, setError] = useState('')
  const handleSearch = () => {
    const customer = CUSTOMERS_DATABASE.find(item => item.document === document.replace(/\D/g, ''))
    if (customer) { setError(''); onSelectCustomer(customer) } else setError('Cliente não encontrado')
  }
  if (selectedCustomer) return (
    <div className="customer-section">
      <label>Cliente selecionado <span className="responsibility-badge pdv">Responsabilidade do PDV</span></label>
      <div className="customer-info">
        <div className="customer-avatar">{selectedCustomer.name.charAt(0)}</div>
        <div><div className="customer-name">{selectedCustomer.name}</div><div className="customer-doc">CPF: {selectedCustomer.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div></div>
      </div>
      {!readOnly && <button className="btn btn-secondary" onClick={() => onSelectCustomer(null)} style={{ marginTop: 8 }}>Alterar cliente</button>}
    </div>
  )
  return (
    <div className="customer-section">
      <label>Identificar cliente <span className="responsibility-badge pdv">Responsabilidade do PDV</span></label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Digite o CPF do cliente" value={document} onChange={event => setDocument(event.target.value)} onKeyDown={event => event.key === 'Enter' && handleSearch()} />
        <button className="btn btn-primary" onClick={handleSearch}>Buscar</button>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{error}</span>}
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>💡 Use um cenário guiado acima ou informe um CPF de teste.</div>
    </div>
  )
}
