import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    
    // Sipariş var mı kontrol et
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Canias ERP ile entegrasyon
    const stockCheckResults = [];
    let hasAllStock = true;
    let shortageCount = 0;
    
    // İlk olarak local veritabanından stok kontrolü yap
    for (const orderMaterial of order.materials) {
      const material = orderMaterial.material;
      const requiredQuantity = orderMaterial.quantity;
      
      // Stokta ayrılmış malzemeleri bul
      const allocatedQuantity = await prisma.materialAllocation.aggregate({
        _sum: {
          quantity: true
        },
        where: {
          materialId: material.id,
          released: false // Henüz serbest bırakılmamış
        }
      });
      
      const totalAllocated = allocatedQuantity._sum?.quantity || 0;
      const availableQuantity = material.quantity - totalAllocated;
      const isAvailable = availableQuantity >= requiredQuantity;
      
      if (!isAvailable) {
        hasAllStock = false;
        shortageCount++;
      }
      
      stockCheckResults.push({
        id: material.id,
        code: material.code,
        name: material.name,
        requiredQuantity,
        inStock: material.quantity,
        allocated: totalAllocated,
        available: availableQuantity,
        isAvailable,
        shortageAmount: isAvailable ? 0 : requiredQuantity - availableQuantity
      });
      
      // Canias ERP entegrasyonu (Bu örnek için simüle ediliyor)
      try {
        // ERP'ye stok kontrolü için istek at
        // const erpResponse = await axios.post('https://erp-api.example.com/check-stock', {
        //   materialCode: material.code,
        //   requiredQuantity
        // });
        
        // ERP'den gelen stok verilerini ekle
        // stockCheckResults[stockCheckResults.length - 1].erpStock = erpResponse.data.stock;
        // stockCheckResults[stockCheckResults.length - 1].erpAvailable = erpResponse.data.available;
      } catch (erpError) {
        console.error('ERP integration error:', erpError);
        // ERP hatası durumunda local verilere güven
      }
    }
    
    // Stok kontrolü sonuçlarını kaydet
    const stockCheck = await prisma.stockCheck.create({
      data: {
        orderId: id,
        checkedBy: {
          connect: { id: session.user.id }
        },
        hasAllItems: hasAllStock,
        shortageCount,
        results: stockCheckResults
      }
    });
    
    // Eksik malzemeler varsa bildirim oluştur
    if (!hasAllStock) {
      await prisma.notification.create({
        data: {
          title: 'Stok Eksikliği',
          content: `${order.orderNumber} numaralı sipariş için ${shortageCount} kalem malzemede stok eksikliği tespit edildi.`,
          type: 'STOCK_SHORTAGE',
          severity: 'MEDIUM',
          targetDepartment: 'INVENTORY'
        }
      });
      
      // Sipariş notuna da ekle
      await prisma.note.create({
        data: {
          orderId: id,
          content: `Stok kontrolü yapıldı. ${shortageCount} kalem malzemede eksiklik tespit edildi.`,
          severity: 'MEDIUM',
          userId: session.user.id
        }
      });
    } else {
      // Tüm stoklar yeterli ise not ekle
      await prisma.note.create({
        data: {
          orderId: id,
          content: `Stok kontrolü yapıldı. Tüm malzemeler stokta mevcut.`,
          severity: 'LOW',
          userId: session.user.id
        }
      });
    }
    
    return res.status(200).json({
      id: stockCheck.id,
      date: stockCheck.createdAt,
      hasAllStock,
      shortageCount,
      items: stockCheckResults
    });
  } catch (error) {
    console.error('Stock check error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
