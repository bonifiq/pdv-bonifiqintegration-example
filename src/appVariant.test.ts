import { describe, expect, it } from 'vitest'
import { resolveAppVariant } from './appVariant'

describe('resolveAppVariant', () => {
  it.each(['/linxpos', '/linxpos/', 'linxpos', '/LINXPOS/'])('abre o PDV Linx em %s', pathname => {
    expect(resolveAppVariant(pathname)).toBe('linx')
  })

  it.each(['/', '', '/outra-rota'])('mantém o PDV padrão em %s', pathname => {
    expect(resolveAppVariant(pathname)).toBe('default')
  })
})
