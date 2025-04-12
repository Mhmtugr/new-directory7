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

    const { id } = req.query;
    const { responseType, responseMessage, departmentId } = req.body;
    
    // Gerekli alanları kontrol et
    if (!responseType || !responseMessage) {
      return res.status(400).json({ message: 'Response type and message are required' });
    }
    
    // Bildirimi getir
    const notification = await prisma.notification.findUnique({
      where: { id }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Bildirimi yanıtlandı olarak işaretle
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        responded: true,
        responseType,
        responseMessage,
        respondedBy: session.user.id,
        respondedAt: new Date()
      }
    });
    
    // Yanıt türüne göre ek işlemler yap
    switch (responseType) {
      case 'ESCALATED':
        // Üst yönetime bildirim gönder
        await createEscalationNotification(notification, responseMessage, session.user);
        break;
        
      case 'REASSIGNED':
        // Başka departmana yönlendir
        if (departmentId) {
          await createReassignmentNotification(notification, responseMessage, departmentId, session.user);
        }
        break;
        
      case 'SCHEDULED':
        // Planlanan çözüm için hatırlatıcı oluştur
        await createReminderNotification(notification, responseMessage, session.user);
        break;
    }
    
    // Bildirimi oluşturan kişiye yanıt verildiğine dair bildirim gönder
    if (notification.createdBy && notification.createdBy !== session.user.id) {
      await notifyOriginalCreator(notification, responseType, responseMessage, session.user);
    }
    
    // İlgili varlık varsa güncelle (Örneğin: üretim görevi, sipariş vb.)
    if (notification.entityType && notification.entityId) {
      await updateRelatedEntity(notification.entityType, notification.entityId, responseType, responseMessage);
    }
    
    logInfo('Notification responded', {
      notificationId: id,
      responseType,
      userId: session.user.id,
      userDepartment: session.user.department
    });
    
    return res.status(200).json(updatedNotification);
  } catch (error) {
    logError('Notification response error', { error }, 'error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Bildirimi üst yönetime ilet
 */
async function createEscalationNotification(originalNotification, message, user) {
  try {
    await prisma.notification.create({
      data: {
        title: `Üst Yönetime İletildi: ${originalNotification.title}`,
        content: `${originalNotification.content}\n\nYönlendiren: ${user.name} (${user.department})\nNot: ${message}`,
        type: 'ESCALATED',
        severity: 'HIGH', // Üst yönetime iletilen her şey yüksek öncelikli
        targetDepartment: 'MANAGEMENT',
        requiresResponse: true,
        entityType: originalNotification.entityType,
        entityId: originalNotification.entityId,
        createdBy: user.id,
        originalNotificationId: originalNotification.id
      }
    });
  } catch (error) {
    console.error('Error creating escalation notification:', error);
  }
}

/**
 * Bildirimi başka bir departmana yönlendir
 */
async function createReassignmentNotification(originalNotification, message, targetDepartment, user) {
  try {
    await prisma.notification.create({
      data: {
        title: `Yönlendirildi: ${originalNotification.title}`,
        content: `${originalNotification.content}\n\nYönlendiren: ${user.name} (${user.department})\nNot: ${message}`,
        type: originalNotification.type,
        severity: originalNotification.severity,
        targetDepartment: targetDepartment,
        requiresResponse: true,
        entityType: originalNotification.entityType,
        entityId: originalNotification.entityId,
        createdBy: user.id,
        originalNotificationId: originalNotification.id
      }
    });
  } catch (error) {
    console.error('Error creating reassignment notification:', error);
  }
}

/**
 * 2 gün sonra hatırlatıcı oluştur
 */
async function createReminderNotification(originalNotification, message, user) {
  try {
    // Planlanan çözüm tarihi (2 gün sonra)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);
    
    await prisma.reminder.create({
      data: {
        title: `Hatırlatıcı: ${originalNotification.title}`,
        content: `Bu bildirim için 2 gün içinde çözüm planlandı: ${message}`,
        dueDate: scheduledDate,
        entityType: originalNotification.entityType,
        entityId: originalNotification.entityId,
        userId: user.id,
        notificationId: originalNotification.id
      }
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
  }
}

/**
 * Orijinal oluşturucuya bildirim yanıtlandı bildirimi gönder
 */
async function notifyOriginalCreator(originalNotification, responseType, message, respondingUser) {
  try {
    // Yanıt türüne göre mesaj belirle
    let statusMessage;
    switch (responseType) {
      case 'RESOLVED':
        statusMessage = 'Çözüldü';
        break;
      case 'IN_PROGRESS':
        statusMessage = 'Üzerinde Çalışılıyor';
        break;
      case 'SCHEDULED':
        statusMessage = '2 Gün İçinde Çözülecek';
        break;
      case 'REASSIGNED':
        statusMessage = 'Başka Birime Yönlendirildi';
        break;
      case 'ESCALATED':
        statusMessage = 'Üst Yönetime İletildi';
        break;
      case 'REJECTED':
        statusMessage = 'İlgili Değil / Reddedildi';
        break;
      default:
        statusMessage = 'Yanıtlandı';
    }
    
    await prisma.notification.create({
      data: {
        title: `Bildiriminize yanıt verildi: ${statusMessage}`,
        content: `"${originalNotification.title}" bildiriminize yanıt verildi:\n\nDurum: ${statusMessage}\nYanıt: ${message}\nYanıtlayan: ${respondingUser.name} (${respondingUser.department})`,
        type: 'RESPONSE_NOTIFICATION',
        severity: 'LOW',
        userId: originalNotification.createdBy,
        requiresResponse: false,
        entityType: originalNotification.entityType,
        entityId: originalNotification.entityId,
        createdBy: respondingUser.id,
        originalNotificationId: originalNotification.id
      }
    });
  } catch (error) {
    console.error('Error notifying original creator:', error);
  }
}

/**
 * İlgili varlığı güncelle (örneğin üretim görevi)
 */
async function updateRelatedEntity(entityType, entityId, responseType, message) {
  try {
    switch (entityType) {
      case 'task':
        // Üretim görevini güncelle
        if (responseType === 'RESOLVED') {
          await prisma.productionTask.update({
            where: { id: entityId },
            data: {
              statusNote: `Otomatik güncelleme: ${message}`,
              updatedAt: new Date()
            }
          });
        }
        break;
        
      case 'order':
        // Siparişi güncelle
        if (responseType === 'RESOLVED') {
          await prisma.order.update({
            where: { id: entityId },
            data: {
              lastStatusUpdate: `Otomatik güncelleme: ${message}`,
              updatedAt: new Date()
            }
          });
        }
        break;
        
      // Diğer varlık tipleri için güncellemeler eklenebilir
    }
  } catch (error) {
    console.error(`Error updating related entity (${entityType})`, error);
  }
}
