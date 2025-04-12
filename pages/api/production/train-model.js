import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { trainModel } from '../../../lib/productionAI';
import { logInfo, logError } from '../../../lib/errorLogging';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Kullanıcı oturumunu ve yetkiyi kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Yönetici kontrolü
    if (!session.user.isAdmin) {
      return res.status(403).json({ message: 'Admin permission required' });
    }
    
    // Model eğitimini başlat
    logInfo('Starting model training', { userId: session.user.id });
    
    const result = await trainModel();
    
    if (result.success) {
      logInfo('Model training completed successfully', { metrics: result.metrics });
      return res.status(200).json(result);
    } else {
      logError('Model training failed', { message: result.message }, 'warning');
      return res.status(400).json(result);
    }
  } catch (error) {
    logError('Model training API error', { error }, 'error');
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
