import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

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
        materials: true,
        productionEstimate: true
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Üretim tahmini var mı kontrol et
    if (!order.productionEstimate) {
      return res.status(400).json({ message: 'Production estimate not found for this order' });
    }
    
    // Mevcut üretim planını kontrol et
    const existingSchedule = await prisma.productionSchedule.findFirst({
      where: { orderId: id }
    });
    
    if (existingSchedule) {
      return res.status(400).json({ message: 'Production schedule already exists for this order' });
    }
    
    // Mevcut üretim kapasitesini ve programını kontrol et
    const currentDate = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const busyDays = await prisma.productionTask.groupBy({
      by: ['dueDate', 'department'],
      _count: {
        id: true
      },
      where: {
        dueDate: {
          gte: currentDate,
          lte: nextMonth
        }
      }
    });
    
    // Departman kapasitelerini tanımla
    const departmentCapacity = {
      'ENGINEERING': 3, // Günde 3 görev
      'ASSEMBLY': 2,    // Günde 2 görev
      'TESTING': 2,     // Günde 2 görev
      'PACKAGING': 4    // Günde 4 görev
    };
    
    // Üretim aşamaları
    const stages = [
      { name: 'Mühendislik ve Tasarım', department: 'ENGINEERING', days: 2 },
      { name: 'Montaj', department: 'ASSEMBLY', days: 3 },
      { name: 'Test', department: 'TESTING', days: 1 },
      { name: 'Paketleme', department: 'PACKAGING', days: 1 }
    ];
    
    // Özel üretim aşamaları varsa bunları kullan
    if (order.productionEstimate.stagesData && Array.isArray(order.productionEstimate.stagesData)) {
      for (let i = 0; i < Math.min(stages.length, order.productionEstimate.stagesData.length); i++) {
        const estimateStage = order.productionEstimate.stagesData[i];
        if (estimateStage && estimateStage.days) {
          stages[i].days = estimateStage.days;
        }
      }
    }
    
    // Başlangıç tarihi belirleme
    let currentScheduleDate = new Date();
    currentScheduleDate.setDate(currentScheduleDate.getDate() + 1); // Yarından başla
    
    // Üretim görevlerini oluştur
    const productionTasks = [];
    
    for (const stage of stages) {
      // Bu aşama için uygun tarihi bul
      let foundSuitableDate = false;
      
      while (!foundSuitableDate) {
        // Bu tarihte departman kapasitesi var mı kontrol et
        const dateBusyCount = busyDays.filter(b => 
          b.department === stage.department && 
          new Date(b.dueDate).toDateString() === currentScheduleDate.toDateString()
        ).reduce((sum, b) => sum + b._count.id, 0);
        
        if (dateBusyCount < departmentCapacity[stage.department]) {
          foundSuitableDate = true;
        } else {
          // Kapasitesi dolu, bir sonraki günü dene
          currentScheduleDate.setDate(currentScheduleDate.getDate() + 1);
        }
      }
      
      // Üretim görevi oluştur
      const taskDueDate = new Date(currentScheduleDate);
      taskDueDate.setDate(taskDueDate.getDate() + stage.days - 1);
      
      productionTasks.push({
        name: stage.name,
        department: stage.department,
        orderId: id,
        startDate: new Date(currentScheduleDate),
        dueDate: taskDueDate,
        status: 'SCHEDULED',
        priority: order.priority,
        description: `${order.orderNumber} siparişi için ${stage.name} aşaması`
      });
      
      // Bir sonraki aşama için tarihi güncelle
      currentScheduleDate.setDate(currentScheduleDate.getDate() + stage.days);
    }
    
    // Üretim görevlerini veritabanına kaydet
    const createdTasks = await prisma.productionTask.createMany({
      data: productionTasks
    });
    
    // Üretim planlamasını kaydet
    const productionSchedule = await prisma.productionSchedule.create({
      data: {
        orderId: id,
        startDate: productionTasks[0].startDate,
        endDate: productionTasks[productionTasks.length - 1].dueDate,
        status: 'SCHEDULED',
        createdById: session.user.id
      }
    });
    
    // Sipariş durumunu güncelle
    await prisma.order.update({
      where: { id },
      data: {
        status: 'SCHEDULED'
      }
    });
    
    // Sipariş notuna ekle
    await prisma.note.create({
      data: {
        orderId: id,
        content: `Üretim planı oluşturuldu. Planlanan başlangıç: ${productionTasks[0].startDate.toLocaleDateString()}, Planlanan bitiş: ${productionTasks[productionTasks.length - 1].dueDate.toLocaleDateString()}`,
        severity: 'LOW',
        userId: session.user.id
      }
    });
    
    return res.status(200).json({
      productionScheduleId: productionSchedule.id,
      startDate: productionSchedule.startDate,
      endDate: productionSchedule.endDate,
      tasks: await prisma.productionTask.findMany({
        where: { orderId: id },
        orderBy: { startDate: 'asc' }
      })
    });
  } catch (error) {
    console.error('Production schedule error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
