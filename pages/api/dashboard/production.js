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

    // Query parametrelerini al
    const { timeframe = 'week', department } = req.query;
    
    // Tarih aralığı belirle
    let startDate = new Date();
    const endDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to week
    }
    
    // Filtre koşullarını oluştur
    const whereClause = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Departman filtresi varsa ekle
    if (department) {
      whereClause.department = department;
    }
    
    // Tamamlanan görevleri getir
    const completedTasks = await prisma.productionTask.count({
      where: {
        ...whereClause,
        status: 'COMPLETED'
      }
    });
    
    // Geciken görevleri getir
    const delayedTasks = await prisma.productionTask.count({
      where: {
        status: 'DELAYED'
      }
    });
    
    // Toplam gecikme günlerini getir
    const delayedDaysSum = await prisma.productionTask.aggregate({
      where: {
        status: 'DELAYED'
      },
      _sum: {
        delayInDays: true
      }
    });
    
    // Planlanmış görevleri getir
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    const plannedTasks = await prisma.productionTask.count({
      where: {
        startDate: {
          gte: today,
          lte: oneWeekLater
        },
        status: 'SCHEDULED'
      }
    });
    
    // Yaklaşan görevleri getir
    const upcomingTasks = await prisma.productionTask.findMany({
      where: {
        startDate: {
          gte: today,
          lte: oneWeekLater
        },
        status: 'SCHEDULED'
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 10
    });
    
    // İş programındaki görevleri getir (20 günlük)
    const scheduleStart = new Date();
    scheduleStart.setDate(scheduleStart.getDate() - 2); // 2 gün öncesi
    
    const scheduleEnd = new Date();
    scheduleEnd.setDate(scheduleEnd.getDate() + 13); // 13 gün sonrası (toplam 15 gün)
    
    const scheduledTasks = await prisma.productionTask.findMany({
      where: {
        OR: [
          // Tarih aralığında başlayacak görevler
          { startDate: { gte: scheduleStart, lte: scheduleEnd } },
          // Tarih aralığında bitecek görevler
          { dueDate: { gte: scheduleStart, lte: scheduleEnd } },
          // Tarih aralığında devam eden görevler
          { 
            startDate: { lte: scheduleStart },
            dueDate: { gte: scheduleEnd }
          }
        ]
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });
    
    // Departman bazında istatistikler
    const departmentStats = await prisma.productionTask.groupBy({
      by: ['department'],
      _count: {
        id: true
      },
      where: whereClause
    });
    
    const departmentStatsByStatus = await prisma.productionTask.groupBy({
      by: ['department', 'status'],
      _count: {
        id: true
      },
      where: whereClause
    });
    
    // Departman istatistiklerini birleştir
    const formattedDepartmentStats = departmentStats.map(dept => {
      const completed = departmentStatsByStatus.find(
        d => d.department === dept.department && d.status === 'COMPLETED'
      )?._count?.id || 0;
      
      const delayed = departmentStatsByStatus.find(
        d => d.department === dept.department && d.status === 'DELAYED'
      )?._count?.id || 0;
      
      const scheduled = departmentStatsByStatus.find(
        d => d.department === dept.department && d.status === 'SCHEDULED'
      )?._count?.id || 0;
      
      return {
        department: dept.department,
        completed,
        delayed,
        scheduled,
        total: dept._count.id
      };
    });
    
    // Verimlilik ve gecikme verileri
    const departmentDetail = {};
    const allDepartments = ['ENGINEERING', 'ASSEMBLY', 'TESTING', 'PACKAGING'];
    
    for (const dept of allDepartments) {
      const deptCompletedCount = await prisma.productionTask.count({
        where: {
          department: dept,
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      const deptDelayedCount = await prisma.productionTask.count({
        where: {
          department: dept,
          status: 'DELAYED'
        }
      });
      
      const deptInProgressCount = await prisma.productionTask.count({
        where: {
          department: dept,
          status: 'IN_PROGRESS'
        }
      });
      
      const deptScheduledCount = await prisma.productionTask.count({
        where: {
          department: dept,
          status: 'SCHEDULED'
        }
      });
      
      // Ortalama gecikme hesaplama
      const deptDelayAvg = await prisma.productionTask.aggregate({
        where: {
          department: dept,
          status: 'DELAYED'
        },
        _avg: {
          delayInDays: true
        }
      });
      
      // Aktif çalışan sayısı
      const activeWorkers = await prisma.productionTask.groupBy({
        by: ['assignedToId'],
        where: {
          department: dept,
          status: 'IN_PROGRESS',
          assignedToId: { not: null }
        }
      });
      
      // Verimlilik hesaplama (tamamlanan / (tamamlanan + gecikmeli) * 100)
      const totalTasks = deptCompletedCount + deptDelayedCount;
      const efficiency = totalTasks > 0 ? (deptCompletedCount / totalTasks) * 100 : 0;
      
      departmentDetail[dept] = {
        completed: deptCompletedCount,
        delayed: deptDelayedCount,
        inProgress: deptInProgressCount,
        scheduled: deptScheduledCount,
        avgDelay: Math.round(deptDelayAvg._avg?.delayInDays || 0),
        activeWorkers: activeWorkers.length,
        efficiency
      };
    }
    
    // Verimlilik trend verisi (son 2 haftalık, veri analizi için)
    const efficiencyTrend = {};
    const dates = [];
    
    // Son 14 günün verimlilik verilerini oluştur
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
    
    for (let i = 0; i < 14; i++) {
      const trendDate = new Date(twoWeeksAgo);
      trendDate.setDate(trendDate.getDate() + i);
      
      const dateStr = trendDate.toISOString().slice(0, 10);
      dates.push(dateStr);
      
      const nextDay = new Date(trendDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      for (const dept of allDepartments) {
        // Bu tarihte tamamlanan görev sayısı
        const completedCount = await prisma.productionTask.count({
          where: {
            department: dept,
            status: 'COMPLETED',
            completedAt: {
              gte: trendDate,
              lt: nextDay
            }
          }
        });
        
        // Bu tarihte gecikmeli görev sayısı
        const delayedCount = await prisma.productionTask.count({
          where: {
            department: dept,
            status: 'DELAYED',
            createdAt: {
              gte: trendDate,
              lt: nextDay
            }
          }
        });
        
        // Verimlilik hesaplama
        const total = completedCount + delayedCount;
        const dayEfficiency = total > 0 ? (completedCount / total) * 100 : 
                             // Eğer görev yoksa departman ortalamasını kullan veya varsayılan %80
                             (departmentDetail[dept]?.efficiency || 80);
        
        // Departman için array oluştur veya güncelle
        if (!efficiencyTrend[dept]) {
          efficiencyTrend[dept] = [];
        }
        
        efficiencyTrend[dept].push(Math.round(dayEfficiency));
      }
    }
    efficiencyTrend.dates = dates;
    
    // Önceki periyotla karşılaştırma
    const previousPeriodStart = new Date(startDate);
    if (timeframe === 'week') {
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
    } else if (timeframe === 'month') {
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    } else if (timeframe === 'quarter') {
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 3);
    }
    
    const previousCompletedTasks = await prisma.productionTask.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });
    
    // Trend hesaplama (yüzde değişim)
    const completionTrend = previousCompletedTasks > 0
      ? Math.round(((completedTasks - previousCompletedTasks) / previousCompletedTasks) * 100)
      : 0;
    
    // Sonuçları dön
    return res.status(200).json({
      completedTasks,
      delayedTasks,
      delayedDays: delayedDaysSum._sum?.delayInDays || 0,
      plannedTasks,
      upcomingTasks,
      scheduledTasks,
      departmentStats: formattedDepartmentStats,
      departmentDetail,
      efficiencyTrend,
      completionTrend,
      efficiency: Math.round((completedTasks / (completedTasks + delayedTasks)) * 100) || 0
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
