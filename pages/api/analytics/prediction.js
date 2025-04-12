import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { 
  exponentialSmoothing, 
  holtWinters, 
  lstmPredict 
} from '../../../lib/predictiveAnalytics';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type, materialId, orderId, department, days } = req.query;
    const predictionDays = parseInt(days) || 30;

    // Tahmin tipine göre farklı veri al ve işle
    let historicalData = [];
    let result = {};

    switch (type) {
      case 'material':
        // Malzeme talebi tahmini
        if (!materialId) {
          return res.status(400).json({ message: 'Material ID is required' });
        }
        
        // Son 180 günlük malzeme hareketi
        const materialMovements = await prisma.materialMovement.findMany({
          where: {
            materialId: materialId,
            type: 'OUT',
            createdAt: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Günlük kullanımları hesapla
        const dailyUsage = calculateDailyUsage(materialMovements);
        historicalData = dailyUsage;
        
        // Material bilgisini al
        const material = await prisma.material.findUnique({
          where: { id: materialId }
        });
        
        // Exponential Smoothing ile basit tahmin
        const simpleForecast = exponentialSmoothing(dailyUsage);
        
        // Mevsimsellik içeren Holt-Winters tahmini
        const seasonalForecast = holtWinters(dailyUsage, { alpha: 0.3, beta: 0.1, gamma: 0.2 }, predictionDays, 7);
        
        // LSTM ile derin öğrenme tahmini
        const lstmForecast = await lstmPredict(dailyUsage, predictionDays);
        
        result = {
          material,
          historicalData,
          simpleForecast,
          seasonalForecast,
          lstmForecast,
          recommendation: analyzeStockRecommendation(material, lstmForecast)
        };
        break;

      case 'department':
        // Departman iş yükü tahmini
        if (!department) {
          return res.status(400).json({ message: 'Department is required' });
        }
        
        // Son 90 günlük departman görevleri
        const tasks = await prisma.productionTask.findMany({
          where: {
            department: department,
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        // Günlük iş saatlerini hesapla
        const dailyWorkload = calculateDailyWorkload(tasks);
        historicalData = dailyWorkload;
        
        // LSTM ile iş yükü tahmini
        const workloadForecast = await lstmPredict(dailyWorkload, predictionDays);
        
        // Departman kapasitesi (varsayılan günlük 24 saat)
        const dailyCapacity = 24;
        
        result = {
          department,
          historicalData,
          forecast: workloadForecast,
          dailyCapacity,
          overloadDays: workloadForecast.filter(load => load > dailyCapacity).length,
          utilizationRate: workloadForecast.reduce((a, b) => a + b, 0) / (predictionDays * dailyCapacity) * 100
        };
        break;

      case 'completion':
        // Sipariş tamamlanma süresi tahmini
        if (!orderId) {
          return res.status(400).json({ message: 'Order ID is required' });
        }
        
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            productionTasks: true,
            materials: {
              include: { material: true }
            }
          }
        });
        
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        // Benzer siparişleri bul
        const similarOrders = await findSimilarCompletedOrders(order);
        
        // Benzer siparişlerin tamamlanma sürelerini hesapla
        const completionTimes = similarOrders.map(o => {
          if (!o.completedAt) return null;
          const start = new Date(o.createdAt).getTime();
          const end = new Date(o.completedAt).getTime();
          return (end - start) / (1000 * 60 * 60 * 24); // Gün olarak
        }).filter(Boolean);
        
        // Mevcut tamamlanmış görevleri analiz et
        const completedTasksCount = order.productionTasks.filter(t => t.status === 'COMPLETED').length;
        const totalTasksCount = order.productionTasks.length;
        const completionRatio = completedTasksCount / totalTasksCount;
        
        // Tahmin modeli
        let estimatedDaysLeft;
        if (completionTimes.length > 0) {
          const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
          estimatedDaysLeft = avgCompletionTime * (1 - completionRatio);
        } else {
          // Varsayılan değer
          estimatedDaysLeft = 14 * (1 - completionRatio);
        }
        
        const estimatedCompletionDate = new Date();
        estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + Math.ceil(estimatedDaysLeft));
        
        result = {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            customer: order.customer,
            deadline: order.deadline
          },
          completionRatio,
          estimatedDaysLeft: Math.ceil(estimatedDaysLeft),
          estimatedCompletionDate,
          onSchedule: new Date(estimatedCompletionDate) <= new Date(order.deadline),
          similarOrdersCount: similarOrders.length
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid prediction type' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Prediction API Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Malzeme hareketlerinden günlük kullanım verisi oluştur
 */
function calculateDailyUsage(movements) {
  if (!movements.length) return [];

  const usage = {};
  const startDate = new Date(movements[0].createdAt);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  
  // Tarih aralığındaki her gün için 0 değerli giriş oluştur
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    usage[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Malzeme hareketlerini günlük toplam olarak hesapla
  for (const movement of movements) {
    const dateKey = movement.createdAt.toISOString().split('T')[0];
    usage[dateKey] = (usage[dateKey] || 0) + movement.quantity;
  }
  
  // Objeden diziye çevir
  return Object.values(usage);
}

/**
 * Departman görevlerinden günlük iş yükü hesapla (saat bazında)
 */
function calculateDailyWorkload(tasks) {
  if (!tasks.length) return [];

  const workload = {};
  const startDate = new Date(tasks[0].createdAt);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  
  // Tarih aralığındaki her gün için 0 değerli giriş oluştur
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    workload[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Görevleri günlük iş yüküne çevir (varsayılan 8 saat)
  for (const task of tasks) {
    const dateKey = task.createdAt.toISOString().split('T')[0];
    const hours = 8; // Varsayılan görev süresi
    workload[dateKey] = (workload[dateKey] || 0) + hours;
  }
  
  // Objeden diziye çevir
  return Object.values(workload);
}

/**
 * LSTM tahminlerine göre stok önerisi analiz et
 */
function analyzeStockRecommendation(material, forecast) {
  if (!material || !forecast || !forecast.length) return null;
  
  const totalForecastDemand = forecast.reduce((a, b) => a + b, 0);
  const avgDailyDemand = totalForecastDemand / forecast.length;
  const maxDailyDemand = Math.max(...forecast);
  
  // Mevcut stok yeterli olacak mı?
  const daysCurrentStockWillLast = material.quantity / avgDailyDemand;
  
  // Sonraki 30 gün için yetersiz mi?
  const isStockCritical = daysCurrentStockWillLast < 30;
  
  // Güvenlik stoku (ortalama talebin 2 katı)
  const recommendedSafetyStock = Math.ceil(avgDailyDemand * 7);
  
  // Optimal sipariş miktarı (30 günlük ortalama talep + güvenlik stoku - mevcut stok)
  const recommendedOrderQuantity = Math.max(0, 
    Math.ceil(avgDailyDemand * 30) + recommendedSafetyStock - material.quantity
  );
  
  return {
    avgDailyDemand,
    maxDailyDemand,
    daysCurrentStockWillLast: Math.floor(daysCurrentStockWillLast),
    isStockCritical,
    recommendedSafetyStock,
    recommendedOrderQuantity
  };
}

/**
 * Benzer tamamlanmış siparişleri bul
 */
async function findSimilarCompletedOrders(currentOrder) {
  // Malzeme kategorilerini bul
  const materialCategories = currentOrder.materials.map(m => m.material.category);
  
  // Son 1 yıl içinde tamamlanmış benzer siparişleri getir
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  try {
    const similarOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null },
        createdAt: { gte: oneYearAgo },
        id: { not: currentOrder.id },
        materials: {
          some: {
            material: {
              category: { in: materialCategories }
            }
          }
        }
      },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    });
    
    // Benzerliği hesapla ve sırala
    return similarOrders
      .map(order => {
        const similarity = calculateOrderSimilarity(currentOrder, order);
        return { ...order, similarity };
      })
      .filter(order => order.similarity > 0.5) // En az %50 benzerlik
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // En benzer 5 sipariş
  } catch (error) {
    console.error('Error finding similar orders:', error);
    return [];
  }
}

/**
 * İki sipariş arasındaki benzerliği hesapla
 */
function calculateOrderSimilarity(order1, order2) {
  // Malzeme kategorilerinde kesişim
  const categories1 = new Set(order1.materials.map(m => m.material.category));
  const categories2 = new Set(order2.materials.map(m => m.material.category));
  
  const commonCategories = [...categories1].filter(cat => categories2.has(cat));
  
  // Malzeme sayısında yakınlık
  const materialCountSimilarity = 1 - Math.abs(order1.materials.length - order2.materials.length) / Math.max(order1.materials.length, order2.materials.length);
  
  // Kategori benzerliği
  const categorySimilarity = commonCategories.length / Math.max(categories1.size, categories2.size);
  
  // Toplam benzerlik skoru
  return (categorySimilarity * 0.7) + (materialCountSimilarity * 0.3);
}
