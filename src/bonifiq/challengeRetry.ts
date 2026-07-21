import type { ChallengeRequest } from './types'

interface CustomerContact {
  phone?: string | null
  email?: string | null
}

export function buildChallengeContactRetry(
  request: ChallengeRequest,
  customer: CustomerContact,
  details: unknown,
): ChallengeRequest | null {
  if (!details || typeof details !== 'object') return null
  const response = details as Record<string, unknown>
  const phone = response.shouldInformPhone === true ? customer.phone : null
  const email = response.shouldInformEmail === true ? customer.email : null
  if (!phone && !email) return null
  return {
    customerId: request.customerId,
    transactionId: request.transactionId,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  }
}
