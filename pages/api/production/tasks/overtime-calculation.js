import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { logError } from '../../../../lib/errorLogging';

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

    // Görev ID'sini ve neden tamamlanamadığını al
    const { taskId, reason, completionPercentage } = req.body;
    
    if (!taskId || !reason) {
      return res.status(400).json({ message: 'Task ID and reason are required' });
    }
    
    // Tamamlanma yüzdesi 0-100 arasında olmalı
    const percentage = Math.min(100, Math.max(0, parseInt(completionPercentage) || 0));
    
    // Görevi getir
    const task = await prisma.productionTask.findUnique({
      where: { id: taskId },
      include: {
        order: {
          select: {
            orderNumber: true,
            deadline: true,
            priority: true
          }
        }
      }
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Görevi güncelle - tamamlanamadı olarak işaretle
    const updatedTask = await prisma.productionTask.update({
      where: { id: taskId },
      data: {
        completionPercentage: percentage,
        status: percentage === 100 ? 'COMPLETED' : 'DELAYED',
        delayReason: reason,
        updatedBy: session.user.id
      }
    });
    
    // Eğer tam olarak tamamlanmışsa ek hesaplamaya gerek yok
    if (percentage === 100) {
      return res.status(200).json({ 
        success: true, 
        task: updatedTask,
        message: 'Task marked as completed' 
      });
    }
    
    // Kalan işi tamamlamak için gerekli ek mesai hesapla
    const overtimeCalculation = calculateRequiredOvertime(task, percentage);
    
    // Gecikme bildirimi oluştur
    await createDelayNotification(task, reason, percentage, overtimeCalculation, session.user);
    
    // Sonuçları dön
    return res.status(200).json({
      success: true,
      task: updatedTask,
      overtime: overtimeCalculation
    });
    
  } catch (error) {
    logError('Overtime calculation error', { error }, 'error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Gerekli ek mesaiyi hesapla
 */
function calculateRequiredOvertime(task, completionPercentage) {
  // Tahmini toplam süre (varsayılan 8 saat veya kaydedilen süre)
  const estimatedHours = task.estimatedHours || 8;
  
  // Tamamlanma yüzdesine göre kalan iş
  const remainingPercentage = 100 - completionPercentage;
  const remainingHours = (estimatedHours * remainingPercentage) / 100;
  
  // Gereken ek mesai (ekip büyüklüğü ve verimlilik faktörleri hesaba katılarak)
  const teamSize = 1; // Varsayılan değer
  const overtimeEfficiencyFactor = 0.8; // Mesai saatlerinde verimlilik düşüşü
  
  const requiredOvertimeHours = remainingHours / (teamSize * overtimeEfficiencyFactor);
  
  // Gecikmenin teslimat tarihine etkisi
  let impactOnDeadline = false;
  let daysDelayed = 0;
  
  if (task.dueDate && task.order?.deadline) {
    const taskDueDate = new Date(task.dueDate);
    const orderDeadline = new Date(task.order.deadline);
    
    // Normal çalışma saati 8 saat kabul edilirse, kalan işin kaç gün süreceği
    const additionalDays = Math.ceil(remainingHours / 8);
    
    // Yeni tamamlanma tarihi
    const newCompletionDate = new Date(taskDueDate);
    newCompletionDate.setDate(newCompletionDate.getDate() + additionalDays);
    
    // Teslimat tarihini aşıp aşmadığı
    impactOnDeadline = newCompletionDate > orderDeadline;
    
    if (impactOnDeadline) {
      daysDelayed = Math.ceil((newCompletionDate - orderDeadline) / (1000 * 60 * 60 * 24));
    }
  }
  
  return {
    remainingHours,
    requiredOvertimeHours: Math.ceil(requiredOvertimeHours * 10) / 10, // Bir ondalık basamağa yuvarla
    recommendedOvertimeDays: Math.ceil(requiredOvertimeHours / 4), // Günde 4 saat mesai varsayımı
    impactOnDeadline,
    daysDelayed,
    estimatedCompletionWithOvertime: calculateCompletionDateWithOvertime(task, requiredOvertimeHours),
    estimatedCompletionWithoutOvertime: calculateCompletionDateWithoutOvertime(task, remainingHours),
    priority: task.order?.priority || 'NORMAL'
  };
}

/**
 * Ek mesai yapılırsa tahmini tamamlanma tarihi
 */
function calculateCompletionDateWithOvertime(task, overtimeHours) {
  const today = new Date();
  
  // Günde 4 saat mesai varsayımı
  const overtimeDays = Math.ceil(overtimeHours / 4);
  
  // Tahmini tamamlanma tarihi
  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(today.getDate() + overtimeDays);
  
  return estimatedCompletionDate;
}

/**
 * Ek mesai yapılmazsa tahmini tamamlanma tarihi
 */
function calculateCompletionDateWithoutOvertime(task, remainingHours) {
  const today = new Date();
  
  // Günde 8 saat normal çalışma varsayımı
  const additionalDays = Math.ceil(remainingHours / 8);
  
  // Tahmini tamamlanma tarihi
  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(today.getDate() + additionalDays);
  
  return estimatedCompletionDate;
}

/**
 * Gecikme için bildirim oluştur
 */
async function createDelayNotification(task, reason, percentage, overtimeCalculation, user) {
  try {
    // Gecikme bildirimi oluştur
    const notification = await prisma.notification.create({
      data: {
        title: `Görev gecikmesi: ${task.name}`,
        content: `Sipariş: ${task.order.orderNumber}\nBölüm: ${task.department}\nTamamlanma: %${percentage}\nNeden: ${reason}\nGerekli ek mesai: ${overtimeCalculation.requiredOvertimeHours} saat`,
        type: 'TASK_DELAYED',
        severity: overtimeCalculation.impactOnDeadline ? 'HIGH' : 'MEDIUM',
        targetDepartment: 'MANAGEMENT', // Yönetim departmanı
        entityType: 'task',
        entityId: task.id,
        requiresResponse: true,
        createdBy: user.id
      }
    });
    
    // Teslimat tarihini etkileyecek gecikmeler için ek bildirim
    if (overtimeCalculation.impactOnDeadline) {
      await prisma.notification.create({
        data: {
          title: `⚠️ Teslimat tarihi risk altında - ${task.order.orderNumber}`,
          content: `${task.name} görevindeki gecikme nedeniyle teslimat tarihi ${overtimeCalculation.daysDelayed} gün gecikebilir. Ek mesai gerekli.`,
          type: 'DEADLINE_WARNING',
          severity: 'HIGH',
          targetDepartment: 'SALES', // Satış departmanı
          entityType: 'order',
          entityId: task.orderId,
          requiresResponse: true,
          createdBy: user.id
        }
      });
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating delay notification:', error);
    return null;
  }
}
