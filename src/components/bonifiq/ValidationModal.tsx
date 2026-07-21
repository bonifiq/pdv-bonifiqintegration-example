import { useState } from 'react'
import type { IntegrationPhase } from '../../bonifiq/flowReducer'
import type { ChallengeResponse } from '../../bonifiq/types'
import type { PdvCustomer } from '../../pdv/types'

interface Props {
  customer: PdvCustomer
  phase: IntegrationPhase
  challenge: ChallengeResponse | null
  error: string | null
  onValidate: (code: string) => Promise<void>
  onCancel: () => void
}

export function ValidationModal({ customer, phase, challenge, error, onValidate, onCancel }: Props) {
  const [code, setCode] = useState('')
  const isSending = phase === 'sending-challenge'
  const isValidating = phase === 'validating-code'
  const submit = () => code.length >= 4 && void onValidate(code)
  return <div className="modal-overlay">
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="validation-title">
      <h3 id="validation-title">🔐 Validação de identidade</h3>
      <p>{isSending ? 'Gerando código de validação...' : `Informe o código de ${customer.name}`}</p>
      {isSending ? <div className="modal-loading">⏳ Gerando código...</div> : <>
        {challenge?.code && <div className="received-token">🔑 <strong>Código para digitar:</strong> <strong>{challenge.code}</strong></div>}
        <input className="input modal-input" aria-label="Código de validação" placeholder="0000 ou 000000" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} onKeyDown={event => event.key === 'Enter' && submit()} autoFocus />
        {error && <div className="validation-error">{error}</div>}
        <div className="modal-buttons"><button className="btn btn-secondary" onClick={onCancel}>Abandonar resgate</button><button className="btn btn-primary" onClick={submit} disabled={isValidating || code.length < 4}>{isValidating ? 'Validando...' : 'Validar'}</button></div>
      </>}
    </div>
  </div>
}
