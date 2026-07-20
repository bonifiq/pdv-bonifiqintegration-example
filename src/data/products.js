/**
 * Dados de produtos do PDV
 * Em produção, esses dados viriam de uma API ou banco de dados
 */
export const PRODUCTS = [
  { 
    id: 'P001', 
    name: 'Camiseta Básica', 
    price: 49.90, 
    icon: '👕',
    brand: { originalId: 'MARCA-001', name: 'Básicos Co.' },
    category: { 
      originalId: 'CAT-001', 
      name: 'Camisetas', 
      description: 'Camisetas masculinas e femininas', 
      parentCategory: { originalId: 'CAT-VEST', name: 'Vestuário', description: 'Roupas em geral' } 
    }
  },
  { 
    id: 'P002', 
    name: 'Calça Jeans', 
    price: 129.90, 
    icon: '👖',
    brand: { originalId: 'MARCA-002', name: 'Denim House' },
    category: { 
      originalId: 'CAT-002', 
      name: 'Calças', 
      description: 'Calças jeans e sociais', 
      parentCategory: { originalId: 'CAT-VEST', name: 'Vestuário', description: 'Roupas em geral' } 
    }
  },
  { 
    id: 'P003', 
    name: 'Tênis Casual', 
    price: 199.90, 
    icon: '👟',
    brand: { originalId: 'MARCA-003', name: 'SportStep' },
    category: { 
      originalId: 'CAT-003', 
      name: 'Tênis', 
      description: 'Tênis esportivos e casuais', 
      parentCategory: { originalId: 'CAT-CALC', name: 'Calçados', description: 'Sapatos e tênis' } 
    }
  },
  { 
    id: 'P004', 
    name: 'Boné Esportivo', 
    price: 39.90, 
    icon: '🧢',
    brand: { originalId: 'MARCA-003', name: 'SportStep' },
    category: { 
      originalId: 'CAT-004', 
      name: 'Bonés', 
      description: 'Bonés e chapéus', 
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' } 
    }
  },
  { 
    id: 'P005', 
    name: 'Mochila Urban', 
    price: 89.90, 
    icon: '🎒',
    brand: { originalId: 'MARCA-004', name: 'UrbanBags' },
    category: { 
      originalId: 'CAT-005', 
      name: 'Mochilas', 
      description: 'Mochilas e bolsas', 
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' } 
    }
  },
  { 
    id: 'P006', 
    name: 'Relógio Digital', 
    price: 159.90, 
    icon: '⌚',
    brand: { originalId: 'MARCA-005', name: 'TechTime' },
    category: { 
      originalId: 'CAT-006', 
      name: 'Relógios', 
      description: 'Relógios digitais e analógicos', 
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' } 
    }
  },
  { 
    id: 'P007', 
    name: 'Óculos de Sol', 
    price: 79.90, 
    icon: '🕶️',
    brand: { originalId: 'MARCA-006', name: 'SunVision' },
    category: { 
      originalId: 'CAT-007', 
      name: 'Óculos', 
      description: 'Óculos de sol e grau', 
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' } 
    }
  },
  { 
    id: 'P008', 
    name: 'Jaqueta Couro', 
    price: 299.90, 
    icon: '🧥',
    brand: { originalId: 'MARCA-007', name: 'LeatherStyle' },
    category: { 
      originalId: 'CAT-008', 
      name: 'Jaquetas', 
      description: 'Jaquetas e casacos', 
      parentCategory: { originalId: 'CAT-VEST', name: 'Vestuário', description: 'Roupas em geral' } 
    }
  },
  {
    id: 'P009',
    name: 'Caneca BonifiQ',
    price: 29.90,
    icon: '☕',
    availableForSale: false,
    brand: { originalId: 'MARCA-BONIFIQ', name: 'BonifiQ' },
    category: {
      originalId: 'CAT-BRINDES',
      name: 'Brindes',
      description: 'Produtos exclusivos de recompensas',
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' }
    }
  },
  {
    id: 'P010',
    name: 'Squeeze BonifiQ',
    price: 34.90,
    icon: '🥤',
    availableForSale: false,
    brand: { originalId: 'MARCA-BONIFIQ', name: 'BonifiQ' },
    category: {
      originalId: 'CAT-BRINDES',
      name: 'Brindes',
      description: 'Produtos exclusivos de recompensas',
      parentCategory: { originalId: 'CAT-ACESS', name: 'Acessórios', description: 'Acessórios diversos' }
    }
  },
]
