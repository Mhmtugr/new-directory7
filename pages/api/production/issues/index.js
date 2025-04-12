import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // HTTP metoduna göre işlem yap
    if (req.method === 'GET') {
      // Tüm sorunları getir
      const issues = await prisma.productionIssue.findMany({
        orderBy: [
          { isResolved: 'asc' }, // Çözülmemiş olanlar önce
          { createdAt: 'desc' } // En yeniler önce
        ]
      });
      
      return res.status(200).json(issues);
    } 
    else if (req.method === 'POST') {
      // Yeni sorun oluştur
      const { 
        title, 
        description, 
        riskLevel, 
        affectedDepartments, 
        suggestedSolution,
        source,
        relatedOrderId,
        relatedTaskId
      } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      
      const issue = await prisma.productionIssue.create({
        data: {
          title,
          description,
          riskLevel: riskLevel || 'MEDIUM',
          affectedDepartments,
          suggestedSolution,
          source: source || 'MANUAL',
          detectedBy: session.user.id,
          relatedOrderId,
          relatedTaskId
        }
      });
      
      // Yüksek riskli sorunlar için bildirim oluştur
      if (riskLevel === 'HIGH') {
        await prisma.notification.create({
          data: {
            title: `Yüksek riskli üretim sorunu: ${title}`,
            content: description,
            type: 'PRODUCTION_ISSUE',
            severity: 'HIGH',
            targetDepartment: affectedDepartments?.split(',')[0]?.trim() || 'MANAGEMENT',
            requiresResponse: true,
            createdBy: session.user.id
          }
        });
      }
      
      return res.status(201).json(issue);
    } 
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Production issues API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
