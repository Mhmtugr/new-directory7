import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;
    const { resolutionNotes } = req.body;
    
    // Var olan sorunu kontrol et
    const existingIssue = await prisma.productionIssue.findUnique({
      where: { id }
    });
    
    if (!existingIssue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    // Sorunu çözüldü olarak güncelle
    const updatedIssue = await prisma.productionIssue.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionNotes
      }
    });
    
    // İlgili bildirimleri yanıtlanmış olarak işaretle
    await prisma.notification.updateMany({
      where: {
        type: 'PRODUCTION_ISSUE',
        content: { contains: existingIssue.title }
      },
      data: {
        responded: true,
        responseType: 'RESOLVED',
        responseMessage: `Üretim sorunu çözüldü: ${resolutionNotes}`,
        respondedBy: session.user.id,
        respondedAt: new Date()
      }
    });
    
    return res.status(200).json(updatedIssue);
  } catch (error) {
    console.error('Resolve issue API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
