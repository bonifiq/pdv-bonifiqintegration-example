import type { MoneyCents } from './types'

export const toCents = (value: number): MoneyCents => Math.round((Number(value) || 0) * 100)
export const fromCents = (value: MoneyCents): number => Number((value / 100).toFixed(2))
export const clampCents = (value: MoneyCents, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): MoneyCents => (
  Math.min(Math.max(Math.round(value), minimum), maximum)
)
export const allocateCentsProportionally = (totalCents: MoneyCents, weights: number[]): MoneyCents[] => {
  const safeTotal = Math.max(0, Math.round(totalCents))
  const safeWeights = weights.map(weight => Math.max(0, weight))
  const weightTotal = safeWeights.reduce((total, weight) => total + weight, 0)
  if (weightTotal <= 0) return safeWeights.map(() => 0)

  const exactShares = safeWeights.map(weight => safeTotal * weight / weightTotal)
  const allocations = exactShares.map(Math.floor)
  let remainder = safeTotal - allocations.reduce((total, value) => total + value, 0)
  const priority = exactShares.map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
  for (let index = 0; index < remainder; index += 1) allocations[priority[index].index] += 1
  return allocations
}
export const formatCents = (value: MoneyCents): string => fromCents(value).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
