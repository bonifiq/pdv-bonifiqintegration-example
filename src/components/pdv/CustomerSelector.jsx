import { useState } from 'react'
import { CUSTOMERS_DATABASE } from '../../data/customers'

/**
 * Componente de seleção de cliente por CPF
 */
export function CustomerSelector({ onSelectCustomer, selectedCustomer }) {
  const [document, setDocument] = useState('')
  const [error, setError] = useState('')

  const handleSearch = () => {
    const cleaned = document.replace(/\D/g, '')
    const customer = CUSTOMERS_DATABASE.find(c => c.document === cleaned)
    
    if (customer) {
      setError('')
      onSelectCustomer(customer)
    } else {
      setError('Cliente não encontrado')
    }
  }

  if (selectedCustomer) {
    return (
      <div className="customer-section">
        <label>Cliente Selecionado</label>
        <div className="customer-info">
          <div className="customer-avatar">
            {selectedCustomer.name.charAt(0)}
          </div>
          <div>
            <div className="customer-name">{selectedCustomer.name}</div>
            <div className="customer-doc">CPF: {selectedCustomer.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => onSelectCustomer(null)} style={{ marginTop: '8px' }}>
          Alterar Cliente
        </button>
      </div>
    )
  }

  return (
    <div className="customer-section">
      <label>Identificar Cliente</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="input"
          placeholder="Digite o CPF do cliente"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary" onClick={handleSearch}>
          Buscar
        </button>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{error}</span>}
      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
        💡 Clientes de teste: 12345678900, 98765432100, 11122233344
      </div>
    </div>
  )
}
