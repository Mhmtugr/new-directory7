import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { createAnalysis } from '../../../lib/deepseek';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { reportType, period, customDateRange } = req.body;
    
    if (!reportType || !period) {
      return res.status(400).json({ message: 'Report type and period are required' });
    }
    
    // Dönem için tarih aralığını belirle
    let startDate, endDate;
    
    if (customDateRange && customDateRange.startDate && customDateRange.endDate) {
      startDate = new Date(customDateRange.startDate);
      endDate = new Date(customDateRange.endDate);
    } else {
      endDate = new Date();
      startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'half-year':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1); // Varsayılan: 1 ay
      }
    }
    
    // Rapor verilerini topla
    let reportData = {};
    
    switch (reportType) {
      case 'production':
        reportData = await generateProductionReport(startDate, endDate);
        break;
      case 'inventory':
        reportData = await generateInventoryReport(startDate, endDate);
        break;
      case 'orders':
        reportData = await generateOrdersReport(startDate, endDate);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }
    
    // Önceki dönemle karşılaştırma için verileri topla
    const previousPeriodLength = endDate.getTime() - startDate.getTime();
    const previousPeriodEndDate = new Date(startDate);
    const previousPeriodStartDate = new Date(previousPeriodEndDate.getTime() - previousPeriodLength);
    
    let previousPeriodData = {};
    
    switch (reportType) {
      case 'production':
        previousPeriodData = await generateProductionReport(previousPeriodStartDate, previousPeriodEndDate);
        break;
      case 'inventory':
        previousPeriodData = await generateInventoryReport(previousPeriodStartDate, previousPeriodEndDate);
        break;
      case 'orders':
        previousPeriodData = await generateOrdersReport(previousPeriodStartDate, previousPeriodEndDate);
        break;
      case 'performance':
        previousPeriodData = await generatePerformanceReport(previousPeriodStartDate, previousPeriodEndDate);
        break;
    }
    
    // DeepSeek ile analiz ve rapor oluşturma
    const systemPrompt = `
      Sen tecrübeli bir üretim analisti ve raporlama uzmanısın. Görevin, verilen verileri analiz edip kapsamlı ve profesyonel bir rapor hazırlamak.
      
      Rapor, aşağıdaki bölümleri içermelidir:
      1. Yönetici Özeti - Ana bulguların ve önemli çıkarımların kısa özeti
      2. Analiz Detayları - Verilerin detaylı incelemesi
      3. Karşılaştırmalı Analiz - Önceki dönemle karşılaştırma
      4. Anormallikler ve Dikkat Edilmesi Gereken Noktalar
      5. Öneriler ve Aksiyon Maddeleri
      
      Raporunu bölüm başlıkları ve alt başlıklarla düzenle. Verilerdeki önemli noktaları ve anormal durumları vurgula.
      Analizinde sayısal değerleri, yüzdeleri ve karşılaştırmaları kullan.
      
      Yöneticilerin hızlıca anlayabilmesi için net, özlü ve bilgilendirici bir dil kullan.
      Rapor sadece verileri sunmamalı, aynı zamanda içgörü ve stratejik öneriler de içermelidir.
    `;
    
    const analysisPrompt = `
      ${reportTypeToTitle(reportType)} Raporu (${formatDateRange(startDate, endDate)})
      
      Lütfen aşağıdaki verileri analiz ederek kapsamlı bir rapor hazırla:
      
      Mevcut Dönem Verileri: ${JSON.stringify(reportData)}
      
      Önceki Dönem Verileri: ${JSON.stringify(previousPeriodData)}
      
      Analizinde şunlara dikkat et:
      1. Önemli trendler ve değişimler
      2. Darboğazlar ve sorun alanları 
      3. İyileşme ve başarı noktaları
      4. Gelecek dönem için öngörüler
    `;
    
    const aiAnalysis = await createAnalysis(analysisPrompt, { 
      systemPrompt, 
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const reportContent = aiAnalysis.choices[0].message.content;
    
    // Raporu veritabanına kaydet
    const savedReport = await prisma.report.create({
      data: {
        title: `${reportTypeToTitle(reportType)} Raporu - ${formatDateRange(startDate, endDate)}`,
        type: reportType,
        content: reportContent,
        period: period,
        startDate,
        endDate,
        createdBy: {
          connect: { id: session.user.id }
        },
        rawData: JSON.stringify({ currentPeriod: reportData, previousPeriod: previousPeriodData })
      }
    });
    
    return res.status(200).json({
      success: true,
      report: {
        id: savedReport.id,
        title: savedReport.title,
        content: reportContent,
        createdAt: savedReport.createdAt
      }
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

// Yardımcı fonksiyonlar

async function generateProductionReport(startDate, endDate) {
  // Tamamlanan görev sayısı
  const completedTasks = await prisma.productionTask.count({
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Geciken görev sayısı
  const delayedTasks = await prisma.productionTask.count({
    where: {
      status: 'DELAYED',
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Departman bazında görev dağılımı
  const departmentStats = await prisma.productionTask.groupBy({
    by: ['department'],
    _count: {
      id: true
    },
    _sum: {
      delayInDays: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Görevlerin durum dağılımı
  const statusCounts = await prisma.productionTask.groupBy({
    by: ['status'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Ortalama gecikme süreleri
  const delayStats = await prisma.productionTask.aggregate({
    where: {
      status: 'DELAYED',
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    },
    _avg: {
      delayInDays: true
    },
    _max: {
      delayInDays: true
    }
  });
  
  // En çok gecikme yaşanan siparişler
  const mostDelayedOrders = await prisma.productionTask.groupBy({
    by: ['orderId'],
    _sum: {
      delayInDays: true
    },
    _count: {
      id: true
    },
    where: {
      status: 'DELAYED',
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      _sum: {
        delayInDays: 'desc'
      }
    },
    take: 5
  });
  
  // Sipariş detaylarını ekle
  for (const item of mostDelayedOrders) {
    const order = await prisma.order.findUnique({
      where: { id: item.orderId },
      select: { orderNumber: true, customer: true }
    });
    
    if (order) {
      item.orderNumber = order.orderNumber;
      item.customer = order.customer;
    }
  }
  
  // Tamamlanan iş sayısı - günlük dağılım (zaman serisi)
  const dailyCompletions = await getDailyTimeSeries(startDate, endDate, 'COMPLETED');
  
  return {
    completedTasks,
    delayedTasks,
    departmentStats,
    statusCounts,
    delayStats,
    mostDelayedOrders,
    dailyCompletions
  };
}

async function generateInventoryReport(startDate, endDate) {
  // Düşük stok sayısı
  const lowStockCount = await prisma.material.count({
    where: {
      quantity: {
        lte: prisma.material.minQuantity,
        gt: 0
      }
    }
  });
  
  // Stok tükenmiş sayısı
  const outOfStockCount = await prisma.material.count({
    where: {
      quantity: 0
    }
  });
  
  // En çok kullanılan malzemeler
  const mostUsedMaterials = await prisma.materialMovement.groupBy({
    by: ['materialId'],
    _sum: {
      quantity: true
    },
    where: {
      type: 'OUT',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 10
  });
  
  // Malzeme bilgilerini ekle
  for (const item of mostUsedMaterials) {
    const material = await prisma.material.findUnique({
      where: { id: item.materialId },
      select: { name: true, code: true, category: true, quantity: true, minQuantity: true }
    });
    
    if (material) {
      item.name = material.name;
      item.code = material.code;
      item.category = material.category;
      item.currentStock = material.quantity;
      item.minStock = material.minQuantity;
    }
  }
  
  // Malzeme hareketlerinin dağılımı
  const movementTypes = await prisma.materialMovement.groupBy({
    by: ['type'],
    _count: {
      id: true
    },
    _sum: {
      quantity: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Kategori bazında stok durumu
  const categoryStats = await prisma.material.groupBy({
    by: ['category'],
    _count: {
      id: true
    },
    _sum: {
      quantity: true
    }
  });
  
  // Her kategori için düşük stok durumu
  const categoryLowStock = [];
  for (const cat of categoryStats) {
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
    
    categoryLowStock.push({
      category: cat.category,
      totalItems: cat._count.id,
      lowStock,
      outOfStock,
      normalStock: cat._count.id - lowStock - outOfStock
    });
  }
  
  // Stok devir hızı (dönemde kullanılan / ortalama stok)
  const totalUsage = await prisma.materialMovement.aggregate({
    where: {
      type: 'OUT',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: {
      quantity: true
    }
  });
  
  // Mevcut toplam stok
  const currentStock = await prisma.material.aggregate({
    _sum: {
      quantity: true
    }
  });
  
  const stockTurnoverRate = currentStock._sum.quantity > 0 ? 
      (totalUsage._sum.quantity || 0) / currentStock._sum.quantity : 0;
  
  return {
    lowStockCount,
    outOfStockCount,
    mostUsedMaterials,
    movementTypes,
    categoryStats,
    categoryLowStock,
    stockTurnoverRate,
    currentTotalStock: currentStock._sum.quantity
  };
}

async function generateOrdersReport(startDate, endDate) {
  // Yeni sipariş sayısı
  const newOrdersCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Tamamlanan sipariş sayısı
  const completedOrdersCount = await prisma.order.count({
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Müşterilere göre sipariş dağılımı
  const ordersByCustomer = await prisma.order.groupBy({
    by: ['customer'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });
  
  // Sipariş önceliğine göre dağılım
  const ordersByPriority = await prisma.order.groupBy({
    by: ['priority'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Sipariş durumuna göre dağılım
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Siparişlerin ortalama tamamlanma süresi
  const completedOrders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      createdAt: true,
      completedAt: true
    }
  });
  
  let avgCompletionDays = 0;
  if (completedOrders.length > 0) {
    const totalDays = completedOrders.reduce((sum, order) => {
      const days = (new Date(order.completedAt) - new Date(order.createdAt)) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgCompletionDays = totalDays / completedOrders.length;
  }
  
  // Günlük sipariş trendi
  const dailyOrderCounts = await getDailyOrderSeries(startDate, endDate);
  
  return {
    newOrdersCount,
    completedOrdersCount,
    ordersByCustomer,
    ordersByPriority,
    ordersByStatus,
    avgCompletionDays,
    dailyOrderCounts
  };
}

async function generatePerformanceReport(startDate, endDate) {
  // Departman verimliliği
  const departmentEfficiency = await prisma.productionTask.groupBy({
    by: ['department'],
    _count: {
      id: true
    },
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Departman gecikme oranı
  const departmentDelays = await prisma.productionTask.groupBy({
    by: ['department'],
    _count: {
      id: true
    },
    where: {
      status: 'DELAYED',
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Departman bazında verimlilik hesapla
  const departments = [...new Set([...departmentEfficiency, ...departmentDelays].map(d => d.department))];
  const efficiencyByDept = {};
  
  for (const dept of departments) {
    const completed = departmentEfficiency.find(d => d.department === dept)?._count?.id || 0;
    const delayed = departmentDelays.find(d => d.department === dept)?._count?.id || 0;
    
    efficiencyByDept[dept] = {
      completed,
      delayed,
      total: completed + delayed,
      rate: completed > 0 ? (completed / (completed + delayed)) * 100 : 0
    };
  }
  
  // Çalışan performansı
  const employeePerformance = await prisma.productionTask.groupBy({
    by: ['assignedToId'],
    _count: {
      id: true
    },
    where: {
      assignedToId: { not: null },
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });
  
  // Çalışan bilgilerini ekle
  for (const emp of employeePerformance) {
    if (!emp.assignedToId) continue;
    
    const user = await prisma.user.findUnique({
      where: { id: emp.assignedToId },
      select: { name: true, department: true }
    });
    
    if (user) {
      emp.name = user.name;
      emp.department = user.department;
    }
    
    // Çalışanın gecikme sayısı
    const delayedCount = await prisma.productionTask.count({
      where: {
        assignedToId: emp.assignedToId,
        status: 'DELAYED',
        dueDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    emp.delayedCount = delayedCount;
    emp.onTimeRate = emp._count.id > 0 ? 
      ((emp._count.id - delayedCount) / emp._count.id) * 100 : 0;
  }
  
  // Genel üretim verimliliği
  const totalCompleted = await prisma.productionTask.count({
    where: {
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const totalDelayed = await prisma.productionTask.count({
    where: {
      status: 'DELAYED',
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const overallEfficiency = totalCompleted + totalDelayed > 0 ?
    (totalCompleted / (totalCompleted + totalDelayed)) * 100 : 0;
  
  // Termin tarihi tutturma oranı
  const ordersWithDeadline = await prisma.order.count({
    where: {
      deadline: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['COMPLETED', 'DELAYED']
      }
    }
  });
  
  const ordersCompletedOnTime = await prisma.order.count({
    where: {
      status: 'COMPLETED',
      deadline: {
        gte: startDate,
        lte: endDate
      },
      completedAt: {
        lte: prisma.order.deadline
      }
    }
  });
  
  const deadlineAdherenceRate = ordersWithDeadline > 0 ?
    (ordersCompletedOnTime / ordersWithDeadline) * 100 : 0;
  
  return {
    departmentEfficiency: efficiencyByDept,
    employeePerformance,
    overallEfficiency,
    totalCompleted,
    totalDelayed,
    ordersCompletedOnTime,
    ordersWithDeadline,
    deadlineAdherenceRate
  };
}

// Günlük zaman serisi oluşturma yardımcı fonksiyonu
async function getDailyTimeSeries(startDate, endDate, status) {
  const result = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const count = await prisma.productionTask.count({
      where: {
        status,
        completedAt: {
          gte: currentDate,
          lt: nextDay
        }
      }
    });
    
    result.push({
      date: new Date(currentDate).toISOString().split('T')[0],
      count
    });
    
    currentDate = nextDay;
  }
  
  return result;
}

// Günlük sipariş serisi oluşturma
async function getDailyOrderSeries(startDate, endDate) {
  const result = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: currentDate,
          lt: nextDay
        }
      }
    });
    
    result.push({
      date: new Date(currentDate).toISOString().split('T')[0],
      count
    });
    
    currentDate = nextDay;
  }
  
  return result;
}

// Rapor türünü başlığa çevir
function reportTypeToTitle(reportType) {
  const titles = {
    'production': 'Üretim',
    'inventory': 'Stok',
    'orders': 'Sipariş',
    'performance': 'Performans'
  };
  
  return titles[reportType] || reportType;
}

// Tarih aralığını formatlama
function formatDateRange(startDate, endDate) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${startDate.toLocaleDateString('tr-TR', options)} - ${endDate.toLocaleDateString('tr-TR', options)}`;
}
