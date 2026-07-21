import type { CatalogProduct } from '../pdv/types'

export const PRODUCTS: CatalogProduct[] = [
  { id: 'P001', name: 'Camiseta Básica', priceCents: 4990, icon: '👕', brand: { originalId: 'MARCA-001', name: 'Básicos Co.' }, category: { originalId: 'CAT-001', name: 'Camisetas' } },
  { id: 'P002', name: 'Calça Jeans', priceCents: 12990, icon: '👖', brand: { originalId: 'MARCA-002', name: 'Denim House' }, category: { originalId: 'CAT-002', name: 'Calças' } },
  { id: 'P003', name: 'Tênis Casual', priceCents: 19990, icon: '👟', brand: { originalId: 'MARCA-003', name: 'SportStep' }, category: { originalId: 'CAT-003', name: 'Tênis' } },
  { id: 'P004', name: 'Boné Esportivo', priceCents: 3990, icon: '🧢', brand: { originalId: 'MARCA-003', name: 'SportStep' }, category: { originalId: 'CAT-004', name: 'Bonés' } },
  { id: 'P005', name: 'Mochila Urban', priceCents: 8990, icon: '🎒', brand: { originalId: 'MARCA-004', name: 'UrbanBags' }, category: { originalId: 'CAT-005', name: 'Mochilas' } },
  { id: 'P006', name: 'Relógio Digital', priceCents: 15990, icon: '⌚', brand: { originalId: 'MARCA-005', name: 'TechTime' }, category: { originalId: 'CAT-006', name: 'Relógios' } },
  { id: 'P007', name: 'Óculos de Sol', priceCents: 7990, icon: '🕶️', brand: { originalId: 'MARCA-006', name: 'SunVision' }, category: { originalId: 'CAT-007', name: 'Óculos' } },
  { id: 'P008', name: 'Jaqueta Couro', priceCents: 29990, icon: '🧥', brand: { originalId: 'MARCA-007', name: 'LeatherStyle' }, category: { originalId: 'CAT-008', name: 'Jaquetas' } },
  { id: 'P009', name: 'Caneca BonifiQ', priceCents: 2990, icon: '☕', availableForSale: false, brand: { originalId: 'MARCA-BONIFIQ', name: 'BonifiQ' }, category: { originalId: 'CAT-BRINDES', name: 'Brindes' } },
  { id: 'P010', name: 'Squeeze BonifiQ', priceCents: 3490, icon: '🥤', availableForSale: false, brand: { originalId: 'MARCA-BONIFIQ', name: 'BonifiQ' }, category: { originalId: 'CAT-BRINDES', name: 'Brindes' } },
]
