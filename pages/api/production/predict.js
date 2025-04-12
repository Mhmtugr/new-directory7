import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { predictProductionTime } from '../../../lib/productionAI';
import { logError } from '../../../lib/errorLogging';

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

    // İstek parametrelerini al
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    
    // Sipariş ve malzeme verilerini getir
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Üretim süresini tahmin et
    const predictionResult = await predictProductionTime(order, order.materials);
    
    // Tahmini veritabanına kaydet
    const savedEstimate = await prisma.productionEstimate.create({
      data: {
        orderId,
        totalDays: predictionResult.estimate.totalDays,
        totalHours: predictionResult.estimate.totalHours,
        recommendedStartDate: predictionResult.schedule?.recommendedStartDate || new Date(),
        estimatedEndDate: predictionResult.schedule?.estimatedEndDate || predictionResult.estimate.completionDate,
        departmentTimelines: JSON.stringify(predictionResult.schedule?.schedule || predictionResult.estimate.departmentTimelines),
        confidenceLevel: predictionResult.confidence || 'medium',
        createdBy: session.user.id,
        method: predictionResult.method
      }
    });
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      prediction: predictionResult,
      savedEstimateId: savedEstimate.id
    });
  } catch (error) {
    logError('Production time prediction API error', { error }, 'error');
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
