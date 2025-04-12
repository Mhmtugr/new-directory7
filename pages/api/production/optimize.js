import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { optimizeProductionSchedule } from '../../../lib/predictiveAnalytics';

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

    // İsteğe bağlı parametreler
    const { startDate, endDate, departmentFilter, includeCompleted = false } = req.body;
    
    // Departman kapasiteleri
    const departmentCapacity = {
      'ENGINEERING': req.body.engineeringCapacity || 3,
      'ASSEMBLY': req.body.assemblyCapacity || 2,
      'TESTING': req.body.testingCapacity || 2,
      'PACKAGING': req.body.packagingCapacity || 4
    };
    
    // Tarih filtreleri
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // Üretim görevlerini getir
    const tasks = await prisma.productionTask.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { dueDate: dateFilter }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(includeCompleted === false && { status: { not: 'COMPLETED' } })
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customer: true,
            deadline: true,
            priority: true
          }
        }
      }
    });
    
    // Görevleri optimize et
    const optimizedSchedule = optimizeProductionSchedule(tasks, {
      departmentCapacity
    });
    
    // Optimize edilmiş planı kaydet
    if (req.body.saveSchedule === true) {
      for (const task of optimizedSchedule.schedule) {
        await prisma.productionTask.update({
          where: { id: task.id },
          data: {
            startDate: task.scheduledStart,
            dueDate: task.scheduledEnd
          }
        });
      }
    }
    
    return res.status(200).json({
      optimizedSchedule,
      message: req.body.saveSchedule ? "Optimize edilmiş plan kaydedildi." : "Optimize plan oluşturuldu (kaydedilmedi)."
    });
  } catch (error) {
    console.error('Production optimization error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
