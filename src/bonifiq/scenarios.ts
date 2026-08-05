export type DemoScenarioId =
  | 'standard'
  | 'cashback'
  | 'no-rewards'
  | 'no-validation'
  | 'gift'
  | 'product-discount'
  | 'fixed-price-product'
  | 'product-missing'
  | 'redeem-failure'

export interface DemoScenario {
  id: DemoScenarioId
  title: string
  description: string
  customerDocument: string
  productIds: string[]
  expected: string
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: 'standard', title: 'Desconto com OTP', description: 'Compra elegível e validação de identidade.', customerDocument: '12345678900', productIds: ['P002'], expected: 'Selecionar R$ 10 ou R$ 30 de desconto.' },
  { id: 'cashback', title: 'Cashback', description: 'Cliente com saldo alto e poucos pontos.', customerDocument: '11122233344', productIds: ['P003'], expected: 'Escolher quanto do cashback utilizar.' },
  { id: 'no-rewards', title: 'Sem recompensa', description: 'A venda continua e ainda deve gerar pedido.', customerDocument: '98765432100', productIds: ['P001'], expected: 'Finalizar sem aplicar benefício.' },
  { id: 'no-validation', title: 'Sem OTP', description: 'Resgate direto quando a API dispensa validação.', customerDocument: '98765432100', productIds: ['P002'], expected: 'Confirmar e aplicar sem abrir o popup de código.' },
  { id: 'gift', title: 'Brinde', description: 'Produto oculto entra no carrinho após o resgate.', customerDocument: '12345678900', productIds: ['P001'], expected: 'Resgatar a Caneca BonifiQ.' },
  { id: 'product-discount', title: 'Desconto em produto', description: 'RewardType 5 altera o preço da linha resgatada.', customerDocument: '12345678900', productIds: ['P001'], expected: 'Aplicar 20% na Camiseta Básica.' },
  { id: 'fixed-price-product', title: 'Produto por R$ 0,01', description: 'O produto configurado é adicionado mesmo sem estar previamente no carrinho.', customerDocument: '12345678900', productIds: ['P002'], expected: 'Adicionar a Caneca P009 por R$ 0,01.' },
  { id: 'product-missing', title: 'Produto ausente', description: 'A recompensa referencia um SKU inexistente no PDV.', customerDocument: '12345678900', productIds: ['P001'], expected: 'Benefício indisponível com motivo explícito.' },
  { id: 'redeem-failure', title: 'Falha e retry', description: 'Primeira tentativa falha para demonstrar retry idempotente.', customerDocument: '12345678900', productIds: ['P002'], expected: 'Tentar novamente usando a mesma OriginalKey.' },
]

let activeScenario: DemoScenarioId = 'standard'
export const getActiveScenario = (): DemoScenarioId => activeScenario
export const setActiveScenario = (scenario: DemoScenarioId): void => { activeScenario = scenario }
