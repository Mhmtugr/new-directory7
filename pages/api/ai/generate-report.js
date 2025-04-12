import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { createAnalysis } from '../../../lib/deepseek';
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

    const { reportType, params = {} } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }
    
    // Rapor verilerini hazırla
    let reportData = {};
    let period = params.period || 'month'; // default: month (alternatives: week, quarter, year)
    let startDate = new Date();
    let endDate = new Date();
    
    // Tarih aralığını belirle
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Default to 1 month
    }
    
    // Rapor tipine göre verileri hazırla
    switch (reportType) {
      case 'production':
        // Üretim raporu
        reportData.completedTasks = await prisma.productionTask.count({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        reportData.delayedTasks = await prisma.productionTask.count({
          where: {
            status: 'DELAYED',
            dueDate: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        reportData.departments = await prisma.productionTask.groupBy({
          by: ['department'],
          _count: {
            id: true
          },
          _sum: {
            delayInDays: true
          },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        reportData.tasksByStatus = await prisma.productionTask.groupBy({
          by: ['status'],
          _count: {
            id: true
          },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        break;
        
      case 'inventory':
        // Stok raporu
        reportData.lowStock = await prisma.material.findMany({
          where: {
            quantity: { lt: 10 }
          },
          orderBy: { quantity: 'asc' },
        });
        
        reportData.mostUsed = await prisma.orderMaterial.groupBy({
          by: ['materialId'],
          _sum: {
            quantity: true
          },
          where: {
            order: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          orderBy: {
            _sum: {
              quantity: 'desc'
            }
          },
          take: 10
        });
        
        reportData.materialMovements = await prisma.materialMovement.groupBy({
          by: ['type'],
          _sum: {
            quantity: true
          },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        break;
        
      case 'orders':
        // Sipariş raporu
        reportData.newOrders = await prisma.order.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        reportData.completedOrders = await prisma.order.count({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        reportData.byCustomer = await prisma.order.groupBy({
          by: ['customer'],
          _count: {
            id: true
          },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 5
        });
        
        reportData.byPriority = await prisma.order.groupBy({
          by: ['priority'],
          _count: {
            id: true
          },
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }
    
    // Rapor metni için sistem mesajı oluştur
    const systemPrompt = `
      Sen bir üretim analisti olarak çalışıyorsun. Görevin, verilen verileri analiz ederek kapsamlı bir rapor oluşturmak.
      Raporda aşağıdaki bileşenler olmalı:
      1. Özet - Ana bulguların kısa özeti
      2. Detaylı analiz - Verilerin detaylı incelemesi ve yorumlanması
      3. Trendler - Önceki periyotlarla karşılaştırma ve trendler
      4. İyileştirme önerileri - Performansı artırmak için öneriler
      
      Raporunu başlık ve alt başlıklarla düzenle. 
      Verilerdeki önemli noktaları vurgula ve varsa sorun oluşturabilecek alanları belirt.
      Yanıtın profesyonel, net ve anlaşılır olsun.
    `;
    
    // DeepSeek API kullanarak rapor oluştur
    const completion = await createAnalysis(
      `${reportType} raporu için verileri analiz et ve bir rapor oluştur: ${JSON.stringify(reportData)}`,
      {
        systemPrompt: systemPrompt,
        temperature: 0.7,
        max_tokens: 1500
      }
    );

    const reportContent = completion.choices[0].message.content;
    
    // Raporu veritabanına kaydet
    const report = await prisma.report.create({
      data: {
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Raporu - ${new Date().toLocaleDateString()}`,
        type: reportType,
        content: reportContent,
        period: period,
        startDate: startDate,
        endDate: endDate,
        createdBy: {
          connect: { id: session.user.id }
        },
        rawData: JSON.stringify(reportData)
      }
    });

    return res.status(200).json({ 
      report: {
        id: report.id,
        title: report.title,
        content: reportContent,
        period: period
      }
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
