import { useState, useEffect } from 'react'
import * as BonifiQ from '../../services/bonifiq'

/**
 * Modal de validação de identidade (OTP)
 * Envia um código por SMS/Email e valida a resposta do cliente
 */
export function ValidationModal({ customer, transactionId, onValidated, onCancel }) {
  const [step, setStep] = useState('sending') // sending, input, validating
  const [code, setCode] = useState('')
  const [sentCode, setSentCode] = useState('') // Para demonstração
  const [error, setError] = useState('')

  useEffect(() => {
    const sendChallenge = async () => {
      // ======== CHAMADA BONIFIQ: /customers/{id}/challenge ========
      const result = await BonifiQ.sendChallenge(
        customer.document,
        transactionId
      )

      if (result.success) {
        setSentCode(result.code) // Em produção, o código não é retornado
        setStep('input')
      } else {
        setError(result.friendlyErrorMessage)
        setStep('input')
      }
    }

    sendChallenge()
  }, [customer, transactionId])

  const handleValidate = async () => {
    if (code.length < 4 || code.length > 6) {
      setError('Digite o código de 4 a 6 dígitos')
      return
    }

    setStep('validating')
    setError('')

    // ======== CHAMADA BONIFIQ: /customers/{id}/challengevalidate ========
    const result = await BonifiQ.validateChallenge(
      customer.document,
      transactionId,
      code
    )

    if (result.success) {
      onValidated()
    } else {
      setError(result.friendlyErrorMessage)
      setStep('input')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>🔐 Validação de Identidade</h3>
        <p>
          {step === 'sending' 
            ? 'Enviando código de validação...'
            : `Um código foi enviado para o celular de ${customer.name}`
          }
        </p>

        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            ⏳ Enviando...
          </div>
        )}

        {step === 'input' && (
          <>
            {/* Mostrar código para demonstração */}
            {sentCode && (
              <div style={{ 
                background: '#fef3c7', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '13px',
                color: '#92400e'
              }}>
                🎯 <strong>Demo:</strong> O código enviado é <strong>{sentCode}</strong>
              </div>
            )}

            <input
              type="text"
              className="input modal-input"
              placeholder="0000 ou 000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && handleValidate()}
              autoFocus
            />

            {error && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={onCancel}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleValidate}>
                Validar
              </button>
            </div>
          </>
        )}

        {step === 'validating' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            ⏳ Validando...
          </div>
        )}
      </div>
    </div>
  )
}
