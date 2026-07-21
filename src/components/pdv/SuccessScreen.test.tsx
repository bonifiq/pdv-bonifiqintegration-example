import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { OrderResponse } from '../../bonifiq/types'
import type { OrderRecord } from '../../pdv/types'
import { SuccessScreen } from './SuccessScreen'

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
  },
}

describe('SuccessScreen', () => {
  it('exibe o cashback da resposta, não inicia timer e reutiliza as ações do pedido', async () => {
    const user = userEvent.setup()
    const onCancelOrder = vi.fn(async () => undefined)
    const onPartialCancel = vi.fn(async () => undefined)

    render(<SuccessScreen order={order} orderResult={orderResult} onNewSale={vi.fn()} onViewOrders={vi.fn()} onCancelOrder={onCancelOrder} onPartialCancel={onPartialCancel} isProcessing={false} processingOrderId={null} notice={null} />)

    expect(screen.getByText('Cashback ganho nesta venda')).toBeVisible()
    expect(screen.getByText('R$ 19,90')).toBeVisible()
    expect(screen.queryByText(/Nova venda em/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Quantidade de Produto de teste para cancelar'), '1')
    await user.click(screen.getByRole('button', { name: 'Cancelar itens selecionados' }))
    expect(onPartialCancel).toHaveBeenCalledWith(order, { P001: 1 })

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido inteiro' }))
    expect(onCancelOrder).toHaveBeenCalledWith(order)
  })
})
