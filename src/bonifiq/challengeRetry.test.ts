import { describe, expect, it } from 'vitest'
import { buildChallengeContactRetry } from './challengeRetry'

describe('retry do challenge por contato ausente', () => {
  it('envia somente os contatos pedidos e mantém a transação', () => {
    expect(buildChallengeContactRetry(
      { customerId: '123', transactionId: 'T1' },
      { phone: '11999999999', email: 'teste@example.com' },
      { shouldInformPhone: true, shouldInformEmail: false },
    )).toEqual({ customerId: '123', transactionId: 'T1', phone: '11999999999' })
  })

  it('não repete quando o contato pedido não está disponível', () => {
    expect(buildChallengeContactRetry(
      { customerId: '123', transactionId: 'T1' },
      { phone: null, email: null },
      { shouldInformPhone: true },
    )).toBeNull()
  })
})
