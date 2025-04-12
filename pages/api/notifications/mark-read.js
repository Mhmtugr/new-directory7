import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

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

    const { user } = session;
    const { notificationId } = req.body; // Belirli bir bildirimi işaretlemek için (opsiyonel)
    
    if (notificationId) {
      // Tek bir bildirimi işaretle
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
      
      return res.status(200).json({ success: true });
    }
    
    // Kullanıcının görebileceği ve okunmamış tüm bildirimleri işaretle
    const result = await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          // Kullanıcıya özel bildirimler
          { userId: user.id },
          // Kullanıcının departmanına gönderilen bildirimler
          { targetDepartment: user.department },
          // Genel bildirimler (tüm kullanıcılar için)
          { 
            userId: null, 
            targetDepartment: null 
          }
        ]
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    return res.status(200).json({ success: true, count: result.count });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
