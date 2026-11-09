import type { NamedReferenceInput, OrderPaymentMethodInput } from '../bonifiq/types'

export interface PdvStore {
  id: string
  label: string
  branch: NamedReferenceInput
  tradePolicy: NamedReferenceInput
}

/**
 * Lojas do PDV de demonstração. Cada loja tem uma política comercial, que pode ser usada em regras de pontos extras
 * (ex.: mais pontos na loja full price) e, no futuro, em regras de resgate.
 */
export const PDV_STORES: PdvStore[] = [
  {
    id: 'centro',
    label: 'Loja Centro · Full price',
    branch: { originalId: 'LOJA-001', name: 'Loja Centro' },
    tradePolicy: { originalId: 'FULLPRICE', name: 'Full price' },
  },
  {
    id: 'outlet',
    label: 'Loja Outlet · Outlet',
    branch: { originalId: 'LOJA-002', name: 'Loja Outlet' },
    tradePolicy: { originalId: 'OUTLET', name: 'Outlet' },
  },
]

export const DEFAULT_STORE_ID = PDV_STORES[0].id

export const PDV_SALES_PERSON: NamedReferenceInput = { originalId: 'VENDEDOR-001', name: 'João Silva' }

export const findStore = (storeId: string): PdvStore => PDV_STORES.find(store => store.id === storeId) ?? PDV_STORES[0]

/** Única forma de pagamento desta versão. O valor pago só é conhecido ao finalizar a venda. */
export const cashPayment = (paidAmount?: number): OrderPaymentMethodInput => ({
  originalId: 'DINHEIRO',
  name: 'Dinheiro',
  ...(paidAmount === undefined ? {} : { paidAmount }),
})
