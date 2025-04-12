import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Toplam malzeme sayısı
    const totalItems = await prisma.material.count();
    
    // Toplam stok miktarı
    const totalQuantity = await prisma.material.aggregate({
      _sum: {
        quantity: true
      }
    });
    
    // Kategori sayısı
    const categories = await prisma.material.groupBy({
      by: ['category']
    });
    
    // Kritik stoklar
    const lowStockItems = await prisma.material.count({
      where: {
        quantity: {
          lte: prisma.material.minQuantity,
          gt: 0
        }
      }
    });
    
    // Tükenmiş stoklar
    const outOfStockItems = await prisma.material.count({
      where: {
        quantity: 0
      }
    });
    
    // Kategori bazında stoklar
    const categoryStats = await prisma.material.groupBy({
      by: ['category'],
      _sum: {
        quantity: true
      },
      _count: {
        id: true
      }
    });
    
    // Kategori bazında stok değerleri (varsayılan birim fiyat)
    const formattedCategoryStats = await Promise.all(
      categoryStats.map(async (cat) => {
        // Kategorideki malzemelerin değerini hesapla
        const materials = await prisma.material.findMany({
          where: {
            category: cat.category
          },
          select: {
            id: true,
            quantity: true
          }
        });
        
        // Varsayılan değer (daha sonra gerçek birim fiyatları eklenebilir)
        const totalValue = materials.reduce((sum, mat) => {
          const unitPrice = 100; // Varsayılan birim fiyat
          return sum + (mat.quantity * unitPrice);
        }, 0);
        
        return {
          category: cat.category,
          totalQuantity: cat._sum.quantity,
          itemCount: cat._count.id,
          totalValue
        };
      })
    );
    
    // Kategori bazında kritik stoklar
    const categoryLowStock = await Promise.all(
      categories.map(async (cat) => {
        const lowStock = await prisma.material.count({
          where: {
            category: cat.category,
            quantity: {
              lte: prisma.material.minQuantity,
              gt: 0
            }
          }
        });
        
        const outOfStock = await prisma.material.count({
          where: {
            category: cat.category,
            quantity: 0
          }
        });
        
        const total = await prisma.material.count({
          where: {
            category: cat.category
          }
        });
        
        return {
          category: cat.category,
          lowStock,
          outOfStock,
          normalStock: total - lowStock - outOfStock,
          total
        };
      })
    );
    
    // En çok kullanılan malzemeler (son 30 gün)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const materialUsage = await prisma.materialMovement.groupBy({
      by: ['materialId'],
      where: {
        type: 'OUT',
        createdAt: {
          gte: oneMonthAgo
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });
    
    // Malzeme bilgilerini ekle
    const topUsedMaterials = await Promise.all(
      materialUsage.map(async (usage) => {
        const material = await prisma.material.findUnique({
          where: {
            id: usage.materialId
          },
          select: {
            name: true,
            code: true,
            category: true
          }
        });
        
        return {
          id: usage.materialId,
          name: material?.name || 'Bilinmeyen Malzeme',
          code: material?.code || '',
          category: material?.category || '',
          usedQuantity: usage._sum.quantity
        };
      })
    );
    
    // Bekleyen siparişler
    const pendingOrders = await prisma.purchaseRequest.count({
      where: {
        status: 'PENDING'
      }
    });
    
    // Bugün beklenen teslimatlar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const deliveryToday = await prisma.purchaseRequestItem.count({
      where: {
        estimatedDelivery: {
          gte: today,
          lt: tomorrow
        },
        status: 'ORDERED'
      }
    });
    
    // Toplam envanter değeri (varsayılan birim fiyatlar)
    const totalValue = formattedCategoryStats.reduce((sum, cat) => sum + cat.totalValue, 0);
    
    // Son aya göre değişim (varsayılan)
    const valueTrend = 5; // Varsayılan %5 artış
    
    // Tüm malzemeleri getir
    const materials = await prisma.material.findMany({
      orderBy: [
        {
          quantity: 'asc' // Önce en az stok olanlar
        },
        {
          name: 'asc' // Sonra alfabetik
        }
      ]
    });
    
    // Son malzeme hareketleri
    const movements = await prisma.materialMovement.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });
    
    return res.status(200).json({
      totalItems,
      totalQuantity: totalQuantity._sum?.quantity || 0,
      categoryCount: categories.length,
      lowStockItems,
      outOfStockItems,
      categoryStats: formattedCategoryStats,
      categoryLowStock,
      pendingOrders,
      deliveryToday,
      totalValue,
      valueTrend,
      materials,
      movements,
      topUsedMaterials
    });
  } catch (error) {
    console.error('Inventory dashboard error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
