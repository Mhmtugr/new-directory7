import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { predictProductionTime } from '../../../lib/productionLearning';
import { logError } from '../../../lib/errorLogging';

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

    const { orderDetails, materials } = req.body;
    
    if (!orderDetails || !materials || !Array.isArray(materials)) {
      return res.status(400).json({ message: 'Order details and materials are required' });
    }
    
    // 1. Malzeme bilgilerini zenginleştir
    const materialIds = materials.map(m => m.materialId);
    const materialDetails = await prisma.material.findMany({
      where: {
        id: { in: materialIds }
      }
    });
    
    // Material detaylarını malzeme listesiyle birleştir
    const enrichedMaterials = materials.map(material => {
      const details = materialDetails.find(m => m.id === material.materialId);
      return {
        ...material,
        material: details
      };
    });
    
    // 2. Üretim süresini tahmin et
    const predictionResult = await predictProductionTime(orderDetails, enrichedMaterials);
    
    if (!predictionResult.success) {
      // Hata durumunda varsayılan değerler kullanılır
      return res.status(200).json({ 
        success: false, 
        message: 'Error in production time prediction, using default values',
        estimate: predictionResult.fallbackEstimate
      });
    }
    
    // 3. Mevcut üretim programına göre uygunluk kontrolü
    const estimate = predictionResult.estimate;
    const schedulingInfo = await checkProductionSchedule(estimate);
    
    return res.status(200).json({
      success: true,
      estimate,
      schedulingInfo,
      method: predictionResult.method
    });
    
  } catch (error) {
    logError('Production time prediction error', { error }, 'error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Üretim programına göre en uygun başlangıç tarihini belirler
 */
async function checkProductionSchedule(estimate) {
  try {
    // Bugünden itibaren 2 haftalık üretim programını kontrol et
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);
    
    // Departman bazında doluluk oranları
    const departmentLoad = await prisma.productionTask.groupBy({
      by: ['department', 'startDate'],
      _count: {
        id: true
      },
      where: {
        startDate: {
          gte: today,
          lte: twoWeeksLater
        },
        status: {
          not: 'COMPLETED'
        }
      }
    });
    
    // Departman günlük kapasiteleri
    const departmentCapacity = {
      'ENGINEERING': 3,
      'ASSEMBLY': 2,
      'TESTING': 2,
      'PACKAGING': 4
    };
    
    // Günlük departman yüklerini hesapla
    const dailyLoads = {};
    departmentLoad.forEach(load => {
      const dateStr = new Date(load.startDate).toISOString().split('T')[0];
      
      if (!dailyLoads[dateStr]) {
        dailyLoads[dateStr] = {};
      }
      
      dailyLoads[dateStr][load.department] = load._count.id;
    });
    
    // Üretim başlangıcı için en uygun tarihi bul
    let earliestPossibleStart = today;
    let daysToAdd = 0;
    
    // En erken başlangıç tarihini hesapla
    let idealStartFound = false;
    let startDateDepartment = estimate.stages[0].department;
    
    while (!idealStartFound && daysToAdd < 30) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + daysToAdd);
      
      const dateStr = checkDate.toISOString().split('T')[0];
      const currentLoad = dailyLoads[dateStr]?.[startDateDepartment] || 0;
      const departmentCap = departmentCapacity[startDateDepartment] || 1;
      
      if (currentLoad < departmentCap) {
        idealStartFound = true;
        earliestPossibleStart = new Date(checkDate);
      } else {
        daysToAdd++;
      }
    }
    
    // Tüm aşamaları planla
    const stageSchedule = [];
    let currentDate = new Date(earliestPossibleStart);
    
    for (const stage of estimate.stages) {
      const stageEnd = new Date(currentDate);
      stageEnd.setDate(stageEnd.getDate() + stage.days - 1);
      
      stageSchedule.push({
        ...stage,
        startDate: new Date(currentDate),
        endDate: stageEnd
      });
      
      currentDate.setDate(currentDate.getDate() + stage.days);
    }
    
    // Planlanan bitiş tarihini hesapla
    const scheduledEndDate = stageSchedule[stageSchedule.length - 1].endDate;
    
    return {
      earliestPossibleStart,
      scheduledEndDate,
      stageSchedule,
      daysDelay: daysToAdd,
      loadFactor: calculateLoadFactor(dailyLoads, departmentCapacity)
    };
  } catch (error) {
    console.error('Error checking production schedule:', error);
    // Hata durumunda basit bir planlama döndür
    const fallbackEndDate = new Date();
    fallbackEndDate.setDate(fallbackEndDate.getDate() + estimate.totalDays);
    
    return {
      earliestPossibleStart: new Date(),
      scheduledEndDate: fallbackEndDate,
      stageSchedule: estimate.stages.map(stage => ({
        ...stage,
        startDate: null,
        endDate: null
      })),
      daysDelay: 0,
      loadFactor: 0.5 // Ortalama yük varsayımı
    };
  }
}

/**
 * Üretim yükü faktörünü hesaplar (0-1 arası)
 */
function calculateLoadFactor(dailyLoads, departmentCapacity) {
  let totalTasks = 0;
  let totalCapacity = 0;
  
  Object.keys(dailyLoads).forEach(date => {
    Object.keys(dailyLoads[date]).forEach(dept => {
      totalTasks += dailyLoads[date][dept];
      totalCapacity += departmentCapacity[dept] || 1;
    });
  });
  
  return totalCapacity > 0 ? Math.min(1, totalTasks / totalCapacity) : 0.5;
}
