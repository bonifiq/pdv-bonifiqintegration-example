import { useState, useEffect } from 'react'

const AUTO_RESET_SECONDS = 10

/**
 * Tela de venda finalizada com sucesso
 * Reinicia automaticamente após alguns segundos
 */
export function SuccessScreen({ orderResult, onNewSale, onViewOrders }) {
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS)

  // Auto-reset após countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onNewSale()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onNewSale])

  return (
    <div className="card success-screen">
      <div className="success-icon">✅</div>
      <h2>Venda Concluída!</h2>
      <p style={{ fontSize: '14px', color: '#6b7280' }}>Pedido #{orderResult?.originalId || 'Processado'}</p>
      <div className="success-callout">
        Venda enviada para a BonifiQ
      </div>
      
      <div className="success-details">
        {orderResult?.orderTotal !== undefined && (
          <div className="success-details-row">
            <span>Valor pago</span>
            <span>{orderResult.orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        )}
        {orderResult?.coupon && (
          <div className="success-details-row">
            <span>Cupom utilizado</span>
            <span>{orderResult.coupon}</span>
          </div>
        )}
        {orderResult?.pointsEarned !== undefined && (
          <div className="success-details-row points-earned">
            <span>🎉 Pontos ganhos</span>
            <span>+{orderResult.pointsEarned} pontos</span>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#f3f4f6', 
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#6b7280'
      }}>
        Nova venda em <strong>{countdown}</strong> segundos...
      </div>

      <button 
        className="btn btn-primary" 
        onClick={onNewSale} 
        style={{ width: '100%', marginTop: '16px' }}
      >
        Iniciar Nova Venda Agora
      </button>
      <button
        className="btn btn-secondary"
        onClick={onViewOrders}
        style={{ width: '100%', marginTop: '12px' }}
      >
        Ver pedidos feitos
      </button>
    </div>
  )
}
