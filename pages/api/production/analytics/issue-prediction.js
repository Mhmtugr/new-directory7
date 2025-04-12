import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { detectProductionIssues } from '../../../../lib/deepseek';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // İleri görüş için inceleme periyodu (varsayılan: önümüzdeki 30 gün)
    const { lookAheadDays = 30 } = req.query;
    const daysToLookAhead = parseInt(lookAheadDays);
    
    // Analiz için veri topla
    const analyticData = await gatherAnalyticData(daysToLookAhead);
    
    // Üretim durumu analiz et ve sorunları tahmin et
    const prediction = await predictProductionIssues(analyticData);
    
    // Bulunan sorunları veritabanına kaydet
    await saveDetectedIssues(prediction, session.user.id);
    
    return res.status(200).json({
      success: true,
      prediction,
      metadata: {
        analyzedPeriod: `Önümüzdeki ${daysToLookAhead} gün`,
        orderCount: analyticData.activeOrders.length,
        taskCount: analyticData.upcomingTasks.length
      }
    });
  } catch (error) {
    console.error('Production issue prediction error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * İleriye dönük analiz için veri topla
 */
async function gatherAnalyticData(daysToLookAhead) {
  const today = new Date();
  const lookAheadDate = new Date(today);
  lookAheadDate.setDate(lookAheadDate.getDate() + daysToLookAhead);
  
  // Aktif siparişler
  const activeOrders = await prisma.order.findMany({
    where: {
      status: { not: 'COMPLETED' },
      deadline: {
        lte: lookAheadDate // İnceleme periyodu içinde teslim edilmesi gereken siparişler
      }
    },
    include: {
      productionTasks: true,
      materials: {
        include: {
          material: true
        }
      }
    },
    orderBy: {
      deadline: 'asc'
    }
  });
  
  // Yaklaşan görevler
  const upcomingTasks = await prisma.productionTask.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: {
        lte: lookAheadDate
      }
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          customer: true,
          deadline: true,
          priority: true
        }
      },
      assignedTo: {
        select: { 
          name: true,
          department: true
        }
      }
    },
    orderBy: {
      dueDate: 'asc'
    }
  });
  
  // Departman bazında görev dağılımı
  const departmentWorkload = await prisma.productionTask.groupBy({
    by: ['department'],
    _count: {
      id: true
    },
    where: {
      status: { not: 'COMPLETED' },
      dueDate: {
        lte: lookAheadDate
      }
    }
  });
  
  // Kritik malzeme durumu
  const criticalMaterials = await prisma.material.findMany({
    where: {
      quantity: {
        lte: prisma.material.minQuantity
      }
    },
    include: {
      allocations: {
        where: {
          released: false
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              deadline: true,
              status: true
            }
          }
        }
      }
    }
  });
  
  // Beklenen teslimatlar
  const pendingDeliveries = await prisma.purchaseRequestItem.findMany({
    where: {
      status: 'ORDERED',
      estimatedDelivery: {
        lte: lookAheadDate
      }
    },
    include: {
      material: true,
      purchaseRequest: {
        include: {
          order: {
            select: {
              orderNumber: true,
              deadline: true
            }
          }
        }
      }
    },
    orderBy: {
      estimatedDelivery: 'asc'
    }
  });
  
  // Departman bazında geçmiş performans
  const departmentPerformance = await prisma.productionTask.groupBy({
    by: ['department', 'status'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
      }
    }
  });
  
  return {
    activeOrders,
    upcomingTasks,
    departmentWorkload,
    criticalMaterials,
    pendingDeliveries,
    departmentPerformance,
    analysisPeriod: {
      startDate: today,
      endDate: lookAheadDate
    }
  };
}

/**
 * Üretim durumunu analiz ederek potansiyel sorunları tahmin et
 */
async function predictProductionIssues(analyticData) {
  try {
    // Veri hazırlama
    const issueDetectionData = {
      orders: analyticData.activeOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        deadline: order.deadline,
        priority: order.priority,
        tasksCompleted: order.productionTasks.filter(t => t.status === 'COMPLETED').length,
        totalTasks: order.productionTasks.length,
        tasksDelayed: order.productionTasks.filter(t => t.status === 'DELAYED').length,
        materialsNeeded: order.materials.map(m => ({
          name: m.material.name,
          quantity: m.quantity,
          available: m.material.quantity,
          isStockCritical: m.material.quantity < m.material.minQuantity
        }))
      })),
      
      tasks: analyticData.upcomingTasks.map(task => ({
        id: task.id,
        name: task.name,
        department: task.department,
        dueDate: task.dueDate,
        status: task.status,
        order: task.order,
        hasAssignee: !!task.assignedToId
      })),
      
      departmentWorkload: analyticData.departmentWorkload,
      
      materialStatus: analyticData.criticalMaterials.map(material => ({
        id: material.id,
        name: material.name,
        code: material.code,
        quantity: material.quantity,
        minQuantity: material.minQuantity,
        allocations: material.allocations.length,
        affectedOrders: material.allocations.map(a => a.order.orderNumber)
      })),
      
      upcomingDeliveries: analyticData.pendingDeliveries.map(item => ({
        materialName: item.material.name,
        quantity: item.quantity,
        estimatedDelivery: item.estimatedDelivery,
        orderNumber: item.purchaseRequest.order?.orderNumber
      })),
      
      departmentPerformance: analyticData.departmentPerformance,
      
      analysisPeriod: analyticData.analysisPeriod
    };
    
    // Yapay zeka ile analiz
    const aiAnalysis = await detectProductionIssues(issueDetectionData, {
      temperature: 0.3, // Daha tutarlı sonuçlar için düşük sıcaklık
      max_tokens: 1500
    });
    
    return {
      issues: aiAnalysis.choices[0].message.content,
      rawAnalysis: aiAnalysis,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error in production issue prediction:', error);
    return {
      issues: 'Üretim sorunu analizi sırasında bir hata oluştu.',
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Tespit edilen sorunları veritabanına kaydet
 */
async function saveDetectedIssues(prediction, userId) {
  try {
    // AI yanıtını ayrıştır
    const issuesText = prediction.issues;
    const lines = issuesText.split('\n');
    
    // En son sorun analizini kaydet
    await prisma.productionAnalysis.create({
      data: {
        analysisText: issuesText,
        analysisType: 'ISSUE_PREDICTION',
        createdBy: userId,
        rawData: JSON.stringify(prediction.rawAnalysis || {})
      }
    });
    
    // Sorun başlıklarını bulmaya çalış
    const issues = [];
    let currentIssue = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Yeni bir sorun başlığı
      if (trimmedLine.match(/^((\d+\.)|\-|\*)\s+.+: /)) {
        if (currentIssue) {
          issues.push(currentIssue);
        }
        
        // Başlığı ve sonrasını ayır
        const titleMatch = trimmedLine.match(/^(?:(\d+\.)|\-|\*)\s+(.+?):\s*(.*)$/);
        if (titleMatch) {
          currentIssue = {
            title: titleMatch[2],
            description: titleMatch[3] || '',
            severity: 'MEDIUM' // Varsayılan değer
          };
        } else {
          currentIssue = {
            title: trimmedLine,
            description: '',
            severity: 'MEDIUM'
          };
        }
      } 
      // Sorun açıklamasını topla
      else if (currentIssue && trimmedLine) {
        currentIssue.description += ' ' + trimmedLine;
        
        // Riskin seviyesini belirle
        if (
          trimmedLine.toLowerCase().includes('yüksek risk') || 
          trimmedLine.toLowerCase().includes('kritik') ||
          trimmedLine.toLowerCase().includes('acil') ||
          trimmedLine.toLowerCase().includes('high risk')
        ) {
          currentIssue.severity = 'HIGH';
        } else if (
          trimmedLine.toLowerCase().includes('düşük risk') || 
          trimmedLine.toLowerCase().includes('minor') ||
          trimmedLine.toLowerCase().includes('low risk')
        ) {
          currentIssue.severity = 'LOW';
        }
      }
    }
    
    // Son sorunu da ekle
    if (currentIssue) {
      issues.push(currentIssue);
    }
    
    // Tespit edilen her sorun için bildirim oluştur
    for (const issue of issues) {
      const severity = issue.severity === 'HIGH' ? 'HIGH' : 
                       issue.severity === 'LOW' ? 'LOW' : 'MEDIUM';
                       
      await prisma.notification.create({
        data: {
          title: `Olası Üretim Sorunu: ${issue.title}`,
          content: issue.description,
          type: 'PRODUCTION_ISSUE_PREDICTION',
          severity,
          targetDepartment: 'MANAGEMENT', // Yönetime bildir
          requiresResponse: severity === 'HIGH', // Yüksek riskli sorunlar için yanıt gerekir
          createdBy: userId
        }
      });
    }
    
    return issues;
  } catch (error) {
    console.error('Error saving predicted issues:', error);
    return [];
  }
}
