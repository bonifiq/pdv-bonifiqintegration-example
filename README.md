# PDV Example - Demonstração de Integração BonifiQ
Esse repositório visa demonstrar como funciona a integração da BonifiQ a um PDV já existente.
Nesse projeto foi criado o mock simples de um PDV, onde a BonifiQ se integra para conceder bonificações, cashback, etc.

![Saiba mais](https://developers.bonifiq.com.br/guias/pos-integration)

Esta é uma aplicação de demonstração de um PDV (Ponto de Venda) com integração BonifiQ. O objetivo é mostrar como a BonifiQ pode ser integrada de forma desacoplada a um sistema de PDV existente.

## 🚀 Como Executar

```bash
# Clonar o repositório
git clone https://github.com/bonifiq/loyalty.git

# Entrar na pasta do projeto
cd pdv-example

# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📦 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção na pasta `dist/` |
| `npm run preview` | Visualiza o build de produção localmente |

## 🛠️ Tecnologias

- **React 18** - Biblioteca para interfaces de usuário
- **Vite 5** - Build tool e dev server
- **JavaScript (ES Modules)** - Linguagem de programação
- **CSS Puro** - Estilização sem frameworks

## 👥 Clientes de Teste

Use os seguintes CPFs para testar diferentes cenários:

| CPF | Cliente | Pontos | Cashback |
|-----|---------|--------|----------|
| `12345678900` | Maria Silva | 1500 | R$ 25,00 |
| `98765432100` | João Santos | 350 | R$ 0,00 |
| `11122233344` | Ana Costa | 50 | R$ 100,00 |

## 🏗️ Arquitetura

A aplicação foi projetada com **separação clara entre PDV e BonifiQ**:

```
pdv-example/
├── index.html                          # HTML principal
├── package.json                        # Dependências e scripts
├── vite.config.js                      # Configuração do Vite
│
└── src/
    ├── App.jsx                         # Orquestrador principal (PDV + BonifiQ)
    ├── index.css                       # Estilos globais
    ├── main.jsx                        # Entry point React
    │
    ├── data/                           # 📦 Dados simulados
    │   ├── products.js                 # Catálogo de produtos
    │   └── customers.js                # Base de clientes
    │
    ├── components/
    │   ├── pdv/                        # 🛒 Componentes do PDV (sem BonifiQ)
    │   │   ├── Header.jsx              # Cabeçalho da aplicação
    │   │   ├── StepIndicator.jsx       # Indicador de etapas
    │   │   ├── CustomerSelector.jsx    # Seleção de cliente por CPF
    │   │   ├── ProductsGrid.jsx        # Grid de produtos
    │   │   ├── CartItems.jsx           # Itens do carrinho
    │   │   ├── CartTotals.jsx          # Totais e descontos
    │   │   ├── SuccessScreen.jsx       # Tela de sucesso
    │   │   └── index.js                # Exportação centralizada
    │   │
    │   └── bonifiq/                    # 🎁 Componentes BonifiQ (integração)
    │       ├── BonifiQSection.jsx      # Seção de recompensas
    │       ├── ValidationModal.jsx     # Modal de validação OTP
    │       └── index.js                # Exportação centralizada
    │
    └── services/
        └── bonifiq/                    # 🔌 Serviço BonifiQ (ISOLADO)
            ├── mockData.js             # Dados mockados para demo
            ├── api.mock.js             # ⚠️ Implementação MOCK (simulação)
            ├── api.production.js       # ✅ Implementação PRODUÇÃO (HTTP)
            ├── helpers.js              # Funções auxiliares
            └── index.js                # Exportação + switch mock/prod
```

### Componentes do PDV (sem BonifiQ)

Estes componentes são **puro PDV** e não conhecem a BonifiQ:

- `Header` - Cabeçalho com informações da loja
- `StepIndicator` - Indicador de etapa da venda
- `CustomerSelector` - Seleção de cliente por CPF
- `ProductsGrid` - Grid de produtos disponíveis
- `CartItems` - Itens do carrinho
- `CartTotals` - Subtotal, desconto e total
- `SuccessScreen` - Tela de venda finalizada

### Componentes da BonifiQ (integração)

Estes componentes encapsulam toda a lógica de integração:

- `BonifiQSection` - Seção de recompensas disponíveis
- `ValidationModal` - Modal de validação de identidade (OTP)

### Serviço de Integração

A pasta `services/bonifiq/` contém **toda a comunicação com a API da BonifiQ**, completamente isolada do resto da aplicação:

- **mockData.js** - Dados mockados que simulam respostas do backend
- **api.mock.js** - Implementação mock para demonstração
- **api.production.js** - Implementação real com chamadas HTTP
- **helpers.js** - Funções utilitárias (cálculo de desconto, formatação, etc.)
- **index.js** - Exportação centralizada e switch mock/produção

```javascript
// Em produção, substitua as funções mock por chamadas reais à API
// Base URL: https://api.bonifiq.com.br/v1/pvt/POS

import * as BonifiQ from './services/bonifiq'

// Consultar recompensas
const rewards = await BonifiQ.getAvailableRewards(customerId, purchaseValue)

// Enviar código de validação
await BonifiQ.sendChallenge(customerId, transactionId)

// Validar código
await BonifiQ.validateChallenge(customerId, transactionId, code)

// Resgatar recompensa
await BonifiQ.redeemReward(rewardId, customerId, value, originalKey)

// Criar pedido
await BonifiQ.createOrder(orderData)

// Cancelar recompensa (estorno)
await BonifiQ.cancelReward(rewardId)

// Cancelar pedido
await BonifiQ.cancelOrder(orderId, cancelledDate)
```

## 🔄 Fluxo de Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUXO DO PDV                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Identificar Cliente (CPF)                                   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔌 BonifiQ: POST /rewards/available                      │   │
│  │     - Consulta recompensas disponíveis                   │   │
│  │     - Exibe pontos, cashback e descontos                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  2. Adicionar Produtos ao Carrinho                              │
│         │                                                        │
│         ▼                                                        │
│  3. Selecionar Recompensa (opcional)                            │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔌 BonifiQ: POST /customers/{id}/challenge              │   │
│  │     - Envia código de validação por SMS/Email            │   │
│  │                                                          │   │
│  │  🔌 BonifiQ: POST /customers/{id}/challengevalidate      │   │
│  │     - Valida o código informado pelo cliente             │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔌 BonifiQ: POST /rewards/{id}/redeem                   │   │
│  │     - Resgata a recompensa selecionada                   │   │
│  │     - Retorna ExternalCode para vincular ao pedido       │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  4. Aplicar Desconto no PDV                                     │
│         │                                                        │
│         ▼                                                        │
│  5. Finalizar Pagamento                                         │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔌 BonifiQ: POST /orders                                │   │
│  │     - Registra o pedido na BonifiQ                       │   │
│  │     - Cliente ganha pontos pela compra                   │   │
│  │     - Vincula recompensa ao pedido (ExternalCode)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  6. Exibir Confirmação (pontos ganhos)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 💡 Pontos de Integração no Código

### 1. Consulta de Recompensas

```jsx
// BonifiQSection.jsx
useEffect(() => {
  const fetchRewards = async () => {
    // ======== CHAMADA BONIFIQ: /rewards/available ========
    const result = await BonifiQ.getAvailableRewards(
      customer.document,
      purchaseValue,
      0 // sem outros descontos
    )
    setRewardsData(result)
  }
  fetchRewards()
}, [customer, purchaseValue])
```

### 2. Validação de Identidade

```jsx
// ValidationModal.jsx
useEffect(() => {
  // ======== CHAMADA BONIFIQ: /customers/{id}/challenge ========
  const result = await BonifiQ.sendChallenge(customer.document, transactionId)
}, [])

const handleValidate = async () => {
  // ======== CHAMADA BONIFIQ: /customers/{id}/challengevalidate ========
  const result = await BonifiQ.validateChallenge(customer.document, transactionId, code)
}
```

### 3. Resgate de Recompensa

```jsx
// App.jsx - processRedeem
const originalKey = `${selectedReward.id}-${customer.document}-${Date.now()}`

// ======== CHAMADA BONIFIQ: /rewards/{id}/redeem ========
const result = await BonifiQ.redeemReward(
  selectedReward.id,
  customer.document,
  selectedReward.isCashback ? cashbackValue : null,
  originalKey
)

// O ExternalCode deve ser enviado no campo Coupon do pedido
const externalCode = result.data.externalCode
```

### 4. Registro do Pedido

```jsx
// App.jsx - processOrder
// ======== CHAMADA BONIFIQ: /orders ========
const orderData = {
  originalId: orderId,
  orderPlacementDate: now,
  orderCompletedDate: now,
  isCompleted: true,
  orderTotal: total, // Valor PAGO (com desconto aplicado)
  coupon: couponCode, // ExternalCode da recompensa
  customer: { ... },
  products: [ ... ],
}

const result = await BonifiQ.createOrder(orderData)
```

## 🎨 Identificação Visual

A seção de BonifiQ é visualmente distinta do resto do PDV:

- Fundo azul gradiente
- Borda azul
- Badge "🎁 BonifiQ" no topo
- Ícones específicos para recompensas

Isso ajuda a demonstrar claramente onde está a integração e facilita a compreensão do que é PDV vs. o que é BonifiQ.

## 🔧 Adaptando para Produção

### Alternando entre Mock e Produção

Para alternar entre mock e produção, edite o arquivo `src/services/bonifiq/index.js`:

```javascript
// ============================================
// 🔀 ALTERE AQUI PARA MUDAR ENTRE MOCK/PROD:
// ============================================

// Para MOCK (demonstração):
import * as api from './api.mock'

// Para PRODUÇÃO:
// import * as api from './api.production'
```

### Configurando Credenciais

Para usar em produção, configure suas credenciais no arquivo `src/services/bonifiq/api.production.js`:

```javascript
// Obtenha suas credenciais no painel da BonifiQ:
// Menu > Configurações > API > Credenciais Private API
const API_USERNAME = 'SEU-USUARIO-API'
const API_PASSWORD = 'SUA-SENHA-API'
```

A autenticação usa **Basic Auth** (Base64 de `username:password`).

### Normalização de Campos

A API BonifiQ usa **PascalCase** (ex: `HasRewards`, `CanUse`), mas o frontend usa **camelCase** (ex: `hasRewards`, `canUse`). O arquivo `api.production.js` já inclui funções de normalização automática:

- `normalizeKeys()` - Converte resposta da API (PascalCase → camelCase)
- `pascalizeKeys()` - Converte dados para envio (camelCase → PascalCase)

### Campos Calculados pela API

> **IMPORTANTE:** Em produção, a API já retorna todos os campos calculados. Você **NÃO** precisa calcular nada no PDV!

Campos que a API retorna prontos:
- `canUse` - Se o cliente pode usar esta recompensa
- `maxCashbackForCurrentPurchase` - Máximo de cashback permitido
- `hasRewards` - Se há alguma recompensa disponível
- `shouldValidateCustomer` - Se precisa validar identidade

## 📚 Documentação da API

### Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/rewards/available` | Consulta recompensas disponíveis |
| `POST` | `/customers/{id}/challenge` | Envia código OTP |
| `POST` | `/customers/{id}/challengevalidate` | Valida código OTP |
| `POST` | `/rewards/{id}/redeem` | Resgata recompensa |
| `DELETE` | `/rewards/{id}` | Cancela/estorna recompensa |
| `POST` | `/orders` | Registra pedido |
| `POST` | `/orders/{id}/cancel` | Cancela pedido |

### Links Úteis

- [Swagger API](https://api.bonifiq.com.br/apidocs/private/index.html?url=/swagger/Private%20APIs/swagger.json#/POS)
- [Central de Ajuda](https://suporte.bonifiq.com.br)

## 📄 Licença

Este exemplo é fornecido como demonstração e pode ser usado livremente como base para integrações com a BonifiQ.