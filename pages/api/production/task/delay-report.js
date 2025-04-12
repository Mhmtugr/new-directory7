import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { logInfo, logError } from '../../../../lib/errorLogging';

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

    const { taskId, reason, completionPercentage, needsOvertime } = req.body;
    
    if (!taskId || !reason) {
      return res.status(400).json({ message: 'Task ID and delay reason are required' });
    }
    
    // Görevi getir
    const task = await prisma.productionTask.findUnique({
      where: { id: taskId },
      include: {
        order: true,
        assignedTo: true
      }
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Tamamlanma yüzdesi
    const percentage = parseInt(completionPercentage) || 0;
    
    // Görevi gecikmiş olarak işaretle
    const updatedTask = await prisma.productionTask.update({
      where: { id: taskId },
      data: {
        status: 'DELAYED',
        completionPercentage: percentage,
        delayReason: reason,
        delayReportedAt: new Date(),
        delayReportedBy: session.user.id,
        needsOvertime: needsOvertime || false
      }
    });
    
    // Gerekli ek mesaiyi hesapla
    const overtimeData = await calculateRequiredOvertime(task, percentage, session.user.id);
    
    // Gecikme için bildirim oluştur
    await createDelayNotifications(task, reason, percentage, overtimeData, session.user.id);
    
    // Gecikme kaydı oluştur
    await prisma.delayReport.create({
      data: {
        taskId,
        reason,
        completionPercentage: percentage,
        reportedBy: session.user.id,
        estimatedOvertimeHours: overtimeData.requiredOvertimeHours,
        estimatedCompletionDate: overtimeData.estimatedCompletionDate,
        impactOnDeadline: overtimeData.impactOnDeadline,
        delayInDays: Math.ceil(overtimeData.requiredOvertimeHours / 8) // Günde 8 saat çalışma varsayımı
      }
    });
    
    // Termin tarihi etkileniyorsa siparişi güncelle
    if (overtimeData.impactOnDeadline && task.orderId) {
      await prisma.order.update({
        where: { id: task.orderId },
        data: {
          atRiskOfDelay: true
        }
      });
    }
    
    logInfo('Task delay reported', { 
      taskId, 
      orderId: task.orderId,
      department: task.department,
      overtimeRequired: overtimeData.requiredOvertimeHours
    });
    
    return res.status(200).json({
      success: true,
      task: updatedTask,
      overtimeCalculation: overtimeData
    });
  } catch (error) {
    logError('Task delay report API error', { error }, 'error');
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

/**
 * Gerekli ek mesaiyi hesapla
 */
async function calculateRequiredOvertime(task, completionPercentage, userId) {
  try {
    // Tahmini toplam süreyi al (veya varsayılan olarak 8 saat kullan)
    const estimatedHours = task.estimatedHours || 8;
    
    // Tamamlanma yüzdesine göre kalan iş
    const remainingPercentage = 100 - completionPercentage;
    const remainingHours = (estimatedHours * remainingPercentage) / 100;
    
    // Gereken ek mesai (ekip büyüklüğü ve verimlilik faktörleri hesaba katılarak)
    const teamSize = task.teamSize || 1; // Varsayılan ekip büyüklüğü
    const overtimeEfficiencyFactor = 0.8; // Mesai saatlerinde verimlilik düşüşü
    
    const requiredOvertimeHours = remainingHours / (teamSize * overtimeEfficiencyFactor);
    
    // Normal çalışma günleri ile tahmini tamamlanma süresi
    const normalCompletionDays = Math.ceil(remainingHours / 8); // Günde 8 saat
    
    // Gecikmenin teslimat tarihine etkisi
    let impactOnDeadline = false;
    let daysDelayed = 0;
    
    if (task.dueDate && task.order?.deadline) {
      const taskDueDate = new Date(task.dueDate);
      const orderDeadline = new Date(task.order.deadline);
      
      // Yeni tamamlanma tarihi
      const newCompletionDate = new Date();
      newCompletionDate.setDate(newCompletionDate.getDate() + normalCompletionDays);
      
      // Teslimat tarihini aşıp aşmadığını kontrol et
      impactOnDeadline = newCompletionDate > orderDeadline;
      
      if (impactOnDeadline) {
        daysDelayed = Math.ceil((newCompletionDate - orderDeadline) / (1000 * 60 * 60 * 24));
      }
    }
    
    // Sonraki aşamaların ertelenmesi gerekip gerekmediğini kontrol et
    let nextPhaseDelayNeeded = false;
    if (task.department !== 'PACKAGING') {
      const nextDepartment = getNextDepartment(task.department);
      
      // Sonraki aşamadaki görevleri kontrol et
      const nextPhaseTasks = await prisma.productionTask.findMany({
        where: {
          orderId: task.orderId,
          department: nextDepartment,
          status: { not: 'COMPLETED' }
        }
      });
      
      if (nextPhaseTasks.length > 0) {
        nextPhaseDelayNeeded = true;
      }
    }
    
    // Ek mesai ile tahmini tamamlanma tarihi
    const overtimeDays = Math.ceil(requiredOvertimeHours / 4); // Günde 4 saat mesai
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + overtimeDays);
    
    return {
      remainingHours,
      requiredOvertimeHours: Math.ceil(requiredOvertimeHours * 10) / 10, // Bir ondalık basamağa yuvarla
      normalCompletionDays,
      overtimeDays,
      estimatedCompletionDate,
      impactOnDeadline,
      daysDelayed,
      nextPhaseDelayNeeded,
      priority: task.order?.priority || 'NORMAL'
    };
  } catch (error) {
    logError('Error calculating overtime', { error }, 'error');
    // Hata durumunda varsayılan değerler döndür
    return {
      remainingHours: 8,
      requiredOvertimeHours: 10,
      normalCompletionDays: 1,
      overtimeDays: 2,
      estimatedCompletionDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 gün sonra
      impactOnDeadline: false,
      daysDelayed: 0,
      nextPhaseDelayNeeded: false,
      priority: 'NORMAL'
    };
  }
}

/**
 * Gecikme için bildirimleri oluştur
 */
async function createDelayNotifications(task, reason, percentage, overtimeData, userId) {
  try {
    // Temel bildirim içeriği
    const orderRef = task.order ? ` (${task.order.orderNumber})` : '';
    const title = `Üretim Gecikmesi: ${task.name}${orderRef}`;
    const content = `Departman: ${task.department}\nTamamlanan: %${percentage}\nNeden: ${reason}\nGerekli ek mesai: ${overtimeData.requiredOvertimeHours} saat`;
    
    // İlk bildirim - ekip yöneticisine
    const managementNotification = await prisma.notification.create({
      data: {
        title,
        content,
        type: 'PRODUCTION_DELAY',
        severity: overtimeData.impactOnDeadline ? 'HIGH' : 'MEDIUM',
        targetDepartment: `${task.department}_MANAGEMENT`,
        requiresResponse: true,
        entityType: 'task',
        entityId: task.id,
        createdBy: userId
      }
    });
    
    // Termin tarihini etkiliyorsa satış birimine de bildirim gönder
    if (overtimeData.impactOnDeadline && task.order) {
      await prisma.notification.create({
        data: {
          title: `⚠️ Termin Riski: ${task.order.orderNumber}`,
          content: `${task.department} departmanında yaşanan gecikme nedeniyle termin tarihi ${overtimeData.daysDelayed} gün gecikebilir.\n\nNeden: ${reason}`,
          type: 'DEADLINE_WARNING',
          severity: 'HIGH',
          targetDepartment: 'SALES',
          requiresResponse: true,
          entityType: 'order',
          entityId: task.orderId,
          createdBy: userId
        }
      });
    }
    
    // Sonraki aşamalar etkileniyorsa bildirim gönder
    if (overtimeData.nextPhaseDelayNeeded) {
      const nextDept = getNextDepartment(task.department);
      
      await prisma.notification.create({
        data: {
          title: `Aşama Gecikmesi: ${task.name}${orderRef}`,
          content: `${task.department} aşamasındaki gecikme nedeniyle, ${nextDept} aşaması da etkilenebilir.\n\nTahmini erteleme: ${overtimeData.normalCompletionDays} gün`,
          type: 'PHASE_DELAY',
          severity: 'MEDIUM',
          targetDepartment: nextDept,
          requiresResponse: false,
          entityType: 'task',
          entityId: task.id,
          createdBy: userId
        }
      });
    }
    
    return managementNotification;
  } catch (error) {
    logError('Error creating delay notifications', { error }, 'error');
    return null;
  }
}

/**
 * Bir sonraki departmanı belirle
 */
function getNextDepartment(department) {
  const departments = ['ENGINEERING', 'ASSEMBLY', 'TESTING', 'PACKAGING'];
  const currentIndex = departments.indexOf(department);
  
  if (currentIndex >= 0 && currentIndex < departments.length - 1) {
    return departments[currentIndex + 1];
  }
  
  return 'PACKAGING'; // Varsayılan son departman
}
