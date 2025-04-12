import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import { detectProductionIssues } from '../../../lib/deepseek';
import { logInfo, logError } from '../../../lib/errorLogging';

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

    // Parametre olarak analiz derinliğini alabilir (varsayılan: 30 gün)
    const { days = 30, department } = req.query;
    const analyzeDays = parseInt(days);
    
    // Tarih aralığı hesapla
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analyzeDays);
    
    // Analiz için üretim verilerini topla
    const productionData = await collectProductionData(startDate, endDate, department);
    
    // Yapay zeka ile potansiyel sorunları tespit et
    const analysisResult = await detectProductionIssues(productionData);
    
    // Tespit edilen sorunları veritabanına kaydet
    const savedIssues = await saveDetectedIssues(analysisResult, session.user.id);
    
    // Kullanıcıya yanıt ver
    return res.status(200).json({
      success: true,
      issues: analysisResult.choices[0].message.content,
      raw: analysisResult,
      savedIssues: savedIssues.length,
      analyzedData: {
        startDate,
        endDate,
        department: department || 'all',
        taskCount: productionData.tasks.length,
        delayedCount: productionData.delayedTasks
      }
    });
  } catch (error) {
    logError('Production issue detection error', { error }, 'error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Üretim verilerini topla
 */
async function collectProductionData(startDate, endDate, department) {
  // Filtre koşulları
  const whereCondition = department 
    ? { department } 
    : {};
  
  // Tüm görevleri getir
  const tasks = await prisma.productionTask.findMany({
    where: {
      ...whereCondition,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          customer: true,
          priority: true,
          deadline: true,
          status: true
        }
      },
      assignedTo: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startDate: 'asc'
    }
  });
  
  // Geciken görevleri say
  const delayedTasks = tasks.filter(t => t.status === 'DELAYED').length;
  
  // Departman bazında görev dağılımı
  const departmentStats = await prisma.productionTask.groupBy({
    by: ['department', 'status'],
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
  
  // Ortalama gecikme süresi
  const delayStats = await prisma.productionTask.aggregate({
    where: {
      status: 'DELAYED',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _avg: {
      delayInDays: true
    },
    _max: {
      delayInDays: true
    }
  });
  
  // Yaklaşan deadline'ları kontrol et
  const today = new Date();
  const upcomingDeadlines = await prisma.order.findMany({
    where: {
      status: { not: 'COMPLETED' },
      deadline: {
        gte: today,
        lte: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 gün içinde
      }
    },
    select: {
      id: true,
      orderNumber: true,
      customer: true,
      deadline: true,
      priority: true,
      productionTasks: {
        select: {
          status: true,
          department: true
        }
      }
    },
    orderBy: {
      deadline: 'asc'
    }
  });
  
  return {
    tasks,
    delayedTasks,
    departmentStats,
    delayStats,
    upcomingDeadlines,
    period: {
      startDate,
      endDate
    }
  };
}

/**
 * Tespit edilen sorunları veritabanına kaydet
 */
async function saveDetectedIssues(analysisResult, userId) {
  try {
    const issuesText = analysisResult.choices[0].message.content;
    
    // Metin içinden sorunları ve risk seviyelerini ayıkla
    const issues = extractIssuesFromText(issuesText);
    
    // Her bir sorunu veritabanına kaydet
    const savedIssues = [];
    
    for (const issue of issues) {
      const savedIssue = await prisma.productionIssue.create({
        data: {
          title: issue.title,
          description: issue.description,
          riskLevel: issue.riskLevel,
          affectedDepartments: issue.affectedDepartments,
          suggestedSolution: issue.suggestedSolution,
          estimatedImpact: issue.estimatedImpact,
          detectedBy: userId,
          isResolved: false,
          source: 'AI_DETECTION'
        }
      });
      
      savedIssues.push(savedIssue);
      
      // Yüksek riskli sorunlar için bildirim oluştur
      if (issue.riskLevel === 'HIGH') {
        await prisma.notification.create({
          data: {
            title: `Yüksek riskli üretim sorunu tespit edildi`,
            content: `${issue.title}: ${issue.description}`,
            type: 'PRODUCTION_ISSUE',
            severity: 'HIGH',
            targetDepartment: issue.affectedDepartments.split(',')[0] || null,
            requiresResponse: true,
            createdBy: userId
          }
        });
      }
    }
    
    return savedIssues;
  } catch (error) {
    logError('Error saving detected issues', { error }, 'error');
    return [];
  }
}

/**
 * AI yanıtından sorunları ayıkla
 */
function extractIssuesFromText(text) {
  // Basit bir ayıklama mantığı - gerçek uygulamada daha sofistike olabilir
  const issues = [];
  
  // Satırları böl
  const lines = text.split('\n');
  
  let currentIssue = {};
  let collectingData = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('- Tespit Edilen Sorunlar:') || trimmedLine.startsWith('Tespit Edilen Sorunlar:')) {
      collectingData = true;
      currentIssue = { title: trimmedLine.split(':')[1]?.trim() || 'Belirsiz sorun' };
    } else if (collectingData && trimmedLine.startsWith('- Risk Seviyesi:') || trimmedLine.startsWith('Risk Seviyesi:')) {
      const riskText = trimmedLine.split(':')[1]?.trim().toUpperCase() || 'MEDIUM';
      currentIssue.riskLevel = riskText.includes('YÜKSEK') || riskText.includes('HIGH') ? 'HIGH' :
                               riskText.includes('ORTA') || riskText.includes('MEDIUM') ? 'MEDIUM' : 'LOW';
    } else if (collectingData && trimmedLine.startsWith('- Etkilenen Departmanlar:') || trimmedLine.startsWith('Etkilenen Departmanlar:')) {
      currentIssue.affectedDepartments = trimmedLine.split(':')[1]?.trim() || '';
    } else if (collectingData && trimmedLine.startsWith('- Önerilen Çözümler:') || trimmedLine.startsWith('Önerilen Çözümler:')) {
      currentIssue.suggestedSolution = trimmedLine.split(':')[1]?.trim() || '';
    } else if (collectingData && trimmedLine.startsWith('- Tahmini Etki:') || trimmedLine.startsWith('Tahmini Etki:')) {
      currentIssue.estimatedImpact = trimmedLine.split(':')[1]?.trim() || '';
      
      // Issue tamamlandı
      if (currentIssue.title) {
        currentIssue.description = currentIssue.title;
        issues.push(currentIssue);
      }
      
      collectingData = false;
      currentIssue = {};
    } else if (collectingData && trimmedLine !== '') {
      // Diğer detayları topla
      if (currentIssue.title) {
        currentIssue.description = (currentIssue.description || '') + ' ' + trimmedLine;
      }
    }
  }
  
  return issues;
}
