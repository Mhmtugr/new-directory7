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

    // İstemcide çevrimdışı kullanım için gerekli verileri hazırla
    const result = {
      timestamp: new Date().toISOString(),
      syncId: `sync_${Date.now()}`,
      user: {
        id: session.user.id,
        name: session.user.name,
        permissions: session.user.permissions || []
      },
      data: {}
    };
    
    // Son 30 günlük aktif siparişler
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    result.data.activeOrders = await prisma.order.findMany({
      where: {
        status: { not: 'COMPLETED' },
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        notes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        productionTasks: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    // Stok özeti
    result.data.inventorySummary = await prisma.material.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { quantity: true }
    });
    
    // Düşük stok uyarıları
    result.data.lowStockItems = await prisma.material.findMany({
      where: {
        quantity: { lte: prisma.material.minQuantity }
      },
      orderBy: { quantity: 'asc' },
      take: 50
    });
    
    // Kullanıcının departmanına göre üretim görevleri
    result.data.departmentTasks = await prisma.productionTask.findMany({
      where: {
        department: session.user.department,
        status: { not: 'COMPLETED' }
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: true,
            deadline: true
          }
        },
        assignedTo: {
          select: { name: true }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 50
    });
    
    // Son 10 rapor
    result.data.recentReports = await prisma.report.findMany({
      where: {
        createdById: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        period: true,
        createdAt: true,
        content: true
      }
    });
    
    // Son yapay zeka etkileşimleri
    result.data.recentAiInteractions = await prisma.aiInteraction.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        query: true,
        response: true,
        createdAt: true
      }
    });
    
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 dakika client cache
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Offline data preparation error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
