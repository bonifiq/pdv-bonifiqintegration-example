# Cookbook de API

Os exemplos usam a raiz `<BONIFIQ_BASE_URL>`, normalmente terminada em `/v1/pvt`. Use credenciais apenas em um ambiente seguro.

## Consultar recompensas

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/available' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId": "12345678900",
    "PurchaseValue": 129.90,
    "DiscountValue": 0,
    "Products": [{
      "OriginalId": "P001",
      "LineId": "P001",
      "Title": "Camiseta Básica",
      "Quantity": 1,
      "ProductPrice": 49.90,
      "ProductDiscountPrice": 39.90,
      "IsActive": true
    }]
  }'
```

Resposta relevante:

```json
{
  "Customer": {
    "OriginalId": "12345678900",
    "Name": "Maria Silva",
    "CurrentTier": { "Name": "Nível Ouro", "Color": "#d97706" }
  },
  "ShouldValidateCustomer": true,
  "AvailablePoints": 1500,
  "Rewards": [{
    "Id": 6,
    "RewardType": 5,
    "CanUse": true,
    "CannotUseReason": 0,
    "ExternalProductId": "P001",
    "ProductDisplayName": "Camiseta Básica",
    "ProductDiscountMode": 0,
    "ProductDiscountValue": 20,
    "ProductMaxUnitsPerRedeem": 2
  }]
}
```

`PurchaseValue` é o total bruto. `DiscountValue` leva descontos próprios do PDV separadamente. Para `RewardType=5`, `Products` é obrigatório na prática para modos diferentes de `FreeGift`: a BonifiQ usa `ProductDiscountPrice ?? ProductPrice` como preço efetivo e bloqueia promoção quando a recompensa não é cumulativa. Mesmo que `ProductMaxUnitsPerRedeem` seja maior, o redeem POS desta versão confirma exatamente uma unidade.

## Cliente TypeScript

Toda operação usa a mesma interface:

```ts
const result = await bonifiqClient.getAvailableRewards(request)

if (!result.ok) {
  showError(result.error.friendlyMessage)
  return
}

const { rewards, customer, shouldValidateCustomer } = result.data
```

O cliente HTTP converte PascalCase na fronteira. O restante do PDV usa contratos camelCase tipados.

## Challenge e validação

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/customers/12345678900/challenge' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{"TransactionId":"PDV-OTP-123"}'
```

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/customers/12345678900/challengevalidate' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{"TransactionId":"PDV-OTP-123","Code":"1234"}'
```

Pule essas chamadas somente quando `ShouldValidateCustomer=false` **e** `ShouldValidateCustomerSignup=false`. Quando a validação for de cadastro, envie também `Document`, `Name` e, se disponíveis, `Email` e `Phone` no challenge.

## Resgatar qualquer recompensa

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/1/redeem' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId":"12345678900",
    "OriginalKey":"PDV-REWARD-1-123",
    "RedeemOrigin":5
  }'
```

Para cashback, `Value` recebe o valor escolhido, limitado por `MaxCashbackForCurrentPurchase`. Para os demais tipos, inclusive `RewardType=5`, omita `Value`.

## Brinde ou desconto em produto

`RewardType=5` usa exatamente o mesmo endpoint POS. Não envie produto, quantidade, preço, promoção ou `ForceGenerateCoupon` no redeem:

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/5/redeem' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId":"12345678900",
    "OriginalKey":"PDV-REWARD-5-123",
    "RedeemOrigin":5
  }'
```

Resposta POS relevante:

```json
{
  "Result": {
    "RewardId": 123,
    "ExternalCode": "BNF-EXTERNAL-CODE",
    "OriginalKey": "PDV-REWARD-5-123",
    "ExternalProductId": "P001"
  }
}
```

| `ProductDiscountMode` | Significado | Preço final da linha |
|---:|---|---|
| `0` | Percentual | `preço efetivo - arredondar(preço efetivo × valor / 100)` |
| `1` | Preço final fixo | `ProductDiscountValue` |
| `2` | Brinde | Zero |
| `3` | Valor fixo | `máximo(0, preço efetivo - ProductDiscountValue)` |

O POS não recebe `ProductDiscountTotal`: esse campo pertence somente ao fluxo de checkout online. O PDV calcula o valor financeiro em centavos usando os dados de `/available`, valida o `ExternalProductId` devolvido e adiciona uma linha separada de quantidade `1`. Produtos de brinde podem estar ocultos da venda direta, mas precisam existir no catálogo local.

## Registrar pedido

```json
{
  "OriginalId": "PDV-ORDER-123",
  "OrderTotal": 119.90,
  "Coupon": "EXTERNAL-CODE-DO-REDEEM",
  "IsCompleted": true,
  "Customer": {
    "OriginalId": "12345678900",
    "Name": "Maria Silva",
    "Document": "12345678900",
    "IsEnrolled": true
  },
  "Products": [{
    "OriginalId": "P002",
    "Title": "Calça Jeans",
    "ProductPrice": 119.90,
    "IsActive": true
  }],
  "PaymentMethods": [{
    "OriginalId": "DINHEIRO",
    "Name": "Dinheiro",
    "PaidAmount": 119.90
  }]
}
```

`OrderTotal` é o valor líquido e `Coupon` recebe o `ExternalCode` escalar do resgate. O `Customer` do pedido é um DTO de criação: campos retornados pela consulta, como `Id` e `CurrentTier`, não devem ser reenviados. Em `Products`, use somente os campos aceitos por `CreateProductRequest`; quantidade e preço promocional pertencem aos contratos de consulta/resgate, não ao pedido. Como esse contrato não possui `Quantity`, o exemplo usa `ProductPrice` como o total líquido da linha e distribui descontos em centavos para a soma dos produtos fechar exatamente com `OrderTotal`.

## Cancelamento parcial

```json
{
  "ValueToRefund": 25.90,
  "CancelKey": "PDV-PARTIAL-123",
  "Products": [{
    "OriginalId": "P002",
    "ValueToRefund": 25.90
  }]
}
```

A soma de `Products[].ValueToRefund` deve ser exatamente igual a `ValueToRefund` após o arredondamento monetário. `ShouldRefundRedeem` só deve ser enviado quando o PDV quiser sobrescrever explicitamente a configuração do tenant.
