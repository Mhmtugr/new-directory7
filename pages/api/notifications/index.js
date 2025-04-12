import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { logError } from '../../../lib/errorLogging';

export default async function handler(req, res) {
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // GET metodu - bildirimleri getir
    if (req.method === 'GET') {
      const { user } = session;
      
      // Kullanıcının departmanına ve kendisine özel bildirimleri getir
      const notifications = await prisma.notification.findMany({
        where: {
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
        orderBy: [
          // Önce yanıt gerektiren bildirimler
          { requiresResponse: 'desc' },
          // Sonra okunmamışlar
          { isRead: 'asc' },
          // Son olarak en yeniler
          { createdAt: 'desc' }
        ],
        take: 20 // En fazla 20 bildirim göster
      });
      
      return res.status(200).json(notifications);
    } 
    // POST metodu - yeni bildirim oluştur
    else if (req.method === 'POST') {
      const { user } = session;
      const { 
        title, 
        content, 
        type, 
        severity = 'LOW', 
        targetUserId,
        targetDepartment,
        entityType,
        entityId,
        requiresResponse = false
      } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }
      
      // Bildirim oluştur
      const notification = await prisma.notification.create({
        data: {
          title,
          content,
          type,
          severity,
          userId: targetUserId,
          targetDepartment,
          entityType,
          entityId,
          requiresResponse,
          createdBy: user.id
        }
      });
      
      return res.status(201).json(notification);
    } 
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    logError('Notifications API error', { error }, 'error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
