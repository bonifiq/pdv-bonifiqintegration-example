import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { OrderResponse } from '../../bonifiq/types'
import type { OrderRecord } from '../../pdv/types'
import { SuccessScreen, formatAvailability, formatExpiration } from './SuccessScreen'

const order: OrderRecord = {
  originalId: 'ORDER-199',
  customer: { originalId: '12345678900', name: 'Maria Silva', document: '12345678900', isEnrolled: true },
  coupon: null,
  orderData: {
    originalId: 'ORDER-199',
    orderPlacementDate: '2026-07-21T12:00:00.000Z',
    orderCompletedDate: '2026-07-21T12:00:00.000Z',
    orderStatus: 'Concluído',
    isCancelledOrReturned: false,
    isCompleted: true,
    orderTotal: 199,
    coupon: null,
    customer: { originalId: '12345678900', name: 'Maria Silva', document: '12345678900', isEnrolled: true },
    products: [{ originalId: 'P001', title: 'Produto de teste', productPrice: 199, isActive: true }],
    paymentMethods: [{ originalId: 'DINHEIRO', name: 'Dinheiro', paidAmount: 199 }],
    branch: { originalId: 'LOJA-001', name: 'Loja Centro' },
    salesPerson: { originalId: 'VENDEDOR-001', name: 'João Silva' },
  },
  bonifiqResult: {},
  originalSubtotalCents: 19900,
  originalDiscountCents: 0,
  originalTotalCents: 19900,
  currentTotalCents: 19900,
  status: 'Concluído',
  statusClass: 'completed',
  items: [{ id: 'P001', name: 'Produto de teste', priceCents: 9950, icon: '🛍️', quantity: 2, cancelledQuantity: 0 }],
  cancellations: [],
}

const orderResult: OrderResponse = {
  originalId: 'ORDER-199',
  orderTotal: 199,
  estimatedBonus: {
    generateBonus: true,
    estimatedPoints: 199,
    estimatedCashback: 19.9,
    estimatedCashbackFormatted: 'R$ 19,90',
    daysToAvailable: 7,
    estimatedAvailableDate: '2026-07-28T12:00:00Z',
    expirationDays: 365,
    estimatedExpirationDate: '2027-07-29T02:59:59Z',
  },
}

describe('prazos do bônus estimado', () => {
  it('descreve concessão imediata, sem data e com data', () => {
    expect(formatAvailability(0, '2026-07-21T12:00:00Z')).toBe('Logo após a venda')
    expect(formatAvailability(1, null)).toBe('1 dia após a conclusão')
    expect(formatAvailability(7, '2026-07-28T12:00:00Z')).toBe('Em 7 dias (28/07/2026)')
  })

  it('descreve pontos que não expiram, validade sem data e com data', () => {
    expect(formatExpiration(null)).toBe('Não expiram')
    expect(formatExpiration(30, null)).toBe('30 dias após a concessão')
    expect(formatExpiration(30, '2026-08-28T02:59:59Z')).toBe('Até 27/08/2026 (30 dias)')
  })
})

describe('SuccessScreen', () => {
  it('exibe o cashback da resposta, não inicia timer e reutiliza as ações do pedido', async () => {
    const user = userEvent.setup()
    const onCancelOrder = vi.fn(async () => undefined)
    const onPartialCancel = vi.fn(async () => undefined)

    render(<SuccessScreen order={order} orderResult={orderResult} onNewSale={vi.fn()} onViewOrders={vi.fn()} onCancelOrder={onCancelOrder} onPartialCancel={onPartialCancel} isProcessing={false} processingOrderId={null} notice={null} />)

    expect(screen.getByText('Cashback estimado nesta venda')).toBeVisible()
    expect(screen.getByText('R$ 19,90')).toBeVisible()
    expect(screen.getByText('Em 7 dias (28/07/2026)')).toBeVisible()
    expect(screen.getByText('Até 28/07/2027 (365 dias)')).toBeVisible()
    expect(screen.queryByText(/Nova venda em/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Quantidade de Produto de teste para cancelar'), '1')
    await user.click(screen.getByRole('button', { name: 'Cancelar itens selecionados' }))
    expect(onPartialCancel).toHaveBeenCalledWith(order, { P001: 1 })

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido inteiro' }))
    expect(onCancelOrder).toHaveBeenCalledWith(order)
  })
})
