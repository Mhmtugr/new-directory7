import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { createChatCompletion } from '../../../lib/deepseek';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // Yalnızca POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { query, chatHistory = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    // Sorgu tipi analizi - sorgu içeriğine göre veri kaynakları belirlenir
    // Sipariş sorgusu mu? (sipariş numarası veya müşteri bilgisi içeren sorgular)
    let orderData = null;
    let stockData = null;
    let productionData = null;
    let reportData = null;
    let purchaseData = null;
    
    const orderRegex = /sipariş|order|customer|müşteri|durum|status|hücre|termin/i;
    const stockRegex = /stok|malzeme|inventory|material|depoda|eksik/i;
    const productionRegex = /üretim|gecikme|production|delay|planlama|tamamlama|montaj|test/i;
    const reportRegex = /rapor|analiz|report|verimlilik|performans|aylık|haftalık|özet/i;
    const purchaseRegex = /satın\s*alma|tedarik|sipariş|purchase|procurement|tedarikçi/i;
    
    // Sipariş verilerini getir
    if (orderRegex.test(query)) {
      // Sorgudan sipariş numarası çıkarmaya çalış
      const orderNumberMatch = query.match(/[A-Z0-9]{5,10}/i);
      const orderNumber = orderNumberMatch ? orderNumberMatch[0] : null;
      
      if (orderNumber) {
        // Sipariş numarasına göre arama yap
        orderData = await prisma.order.findFirst({
          where: {
            orderNumber: {
              equals: orderNumber,
              mode: 'insensitive'
            }
          },
          include: {
            materials: {
              include: {
                material: true
              }
            },
            notes: {
              include: {
                user: {
                  select: { name: true, department: true }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            productionTasks: {
              include: {
                assignedTo: {
                  select: { name: true, department: true }
                }
              },
              orderBy: { startDate: 'asc' }
            },
            productionSchedule: true,
            productionEstimate: true,
            purchaseRequests: {
              include: {
                items: {
                  include: {
                    material: true
                  }
                }
              }
            },
            stockChecks: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                checkedBy: {
                  select: { name: true }
                }
              }
            },
            createdBy: {
              select: { name: true, department: true }
            }
          }
        });
        
        // Siparişe ait gelecek malzeme teslimatlarını kontrol et
        if (orderData) {
          const purchaseRequestIds = orderData.purchaseRequests.map(pr => pr.id);
          
          if (purchaseRequestIds.length > 0) {
            const pendingDeliveries = await prisma.purchaseRequestItem.findMany({
              where: {
                purchaseRequestId: { in: purchaseRequestIds },
                status: 'ORDERED',
                estimatedDelivery: { not: null }
              },
              include: {
                material: true
              },
              orderBy: {
                estimatedDelivery: 'asc'
              }
            });
            
            orderData.pendingDeliveries = pendingDeliveries;
          }
        }
      } else {
        // En son siparişleri getir
        orderData = await prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            materials: {
              include: {
                material: true
              }
            },
            notes: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: { name: true }
                }
              }
            },
            productionTasks: {
              take: 3,
              include: {
                assignedTo: {
                  select: { name: true }
                }
              },
              orderBy: { startDate: 'asc' }
            }
          }
        });
        
        // Müşteri adı sorgusu mu?
        const customerMatch = query.match(/müşteri\s*:?\s*([a-zçğıöşü\s]+)/i);
        if (customerMatch && customerMatch[1]) {
          const customerName = customerMatch[1].trim();
          
          orderData = await prisma.order.findMany({
            where: {
              customer: {
                contains: customerName,
                mode: 'insensitive'
              }
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              materials: {
                include: {
                  material: true
                }
              },
              notes: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                include: {
                  user: {
                    select: { name: true }
                  }
                }
              },
              productionTasks: {
                take: 3,
                orderBy: { startDate: 'asc' }
              }
            }
          });
        }
      }
    }
    
    // Stok sorgusu mu?
    if (stockRegex.test(query)) {
      // Belirli bir malzeme kodu aranıyor mu kontrol et
      const materialCodeMatch = query.match(/[A-Z][0-9]{3,4}/i);
      
      if (materialCodeMatch) {
        const materialCode = materialCodeMatch[0];
        
        // Belirli bir malzeme için arama yap
        stockData = await prisma.material.findFirst({
          where: {
            code: {
              equals: materialCode,
              mode: 'insensitive'
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
                    customer: true,
                    deadline: true
                  }
                }
              }
            }
          }
        });
        
        // Son 30 gündeki malzeme hareketlerini getir
        if (stockData) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const movements = await prisma.materialMovement.findMany({
            where: {
              materialId: stockData.id,
              createdAt: {
                gte: thirtyDaysAgo
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          });
          
          stockData.movements = movements;
        }
      } else {
        // Düşük stoktaki malzemeleri getir
        stockData = await prisma.material.findMany({
          where: {
            quantity: { lt: prisma.material.minQuantity }
          },
          orderBy: { quantity: 'asc' },
          take: 15,
          include: {
            allocations: {
              where: {
                released: false
              },
              take: 5
            }
          }
        });
        
        // Tükenmiş malzemelerin sayısını hesapla
        const outOfStockCount = await prisma.material.count({
          where: {
            quantity: 0
          }
        });
        
        stockData = {
          lowStockItems: stockData,
          outOfStockCount
        };
      }
    }
    
    // Üretim sorgusu mu?
    if (productionRegex.test(query)) {
      // Belirli bir departman sorgusu mu?
      let departmentFilter = null;
      
      if (query.includes('mühendislik') || query.includes('engineering')) {
        departmentFilter = 'ENGINEERING';
      } else if (query.includes('montaj') || query.includes('assembly')) {
        departmentFilter = 'ASSEMBLY';
      } else if (query.includes('test') || query.includes('testing')) {
        departmentFilter = 'TESTING';
      } else if (query.includes('paketleme') || query.includes('packaging')) {
        departmentFilter = 'PACKAGING';
      }
      
      // Filtre koşullarını oluştur
      const whereCondition = departmentFilter 
        ? { department: departmentFilter }
        : {};
      
      // Gecikmiş görevleri öncelikle getir
      productionData = await prisma.productionTask.findMany({
        where: {
          ...whereCondition,
          status: { in: ['IN_PROGRESS', 'DELAYED'] }
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: true,
              deadline: true
            }
          },
          assignedTo: {
            select: { name: true, department: true }
          }
        },
        orderBy: [
          { status: 'asc' }, // DELAYED önce
          { dueDate: 'asc' }  // En erken teslim tarihi önce
        ],
        take: 15
      });
      
      // Departmanlara göre özet istatistikler
      const departmentStats = await prisma.productionTask.groupBy({
        by: ['department', 'status'],
        _count: {
          id: true
        }
      });
      
      // Bugünün görevleri
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todaysTasks = await prisma.productionTask.count({
        where: {
          ...whereCondition,
          startDate: {
            gte: today,
            lt: tomorrow
          }
        }
      });
      
      productionData = {
        tasks: productionData,
        departmentStats,
        todaysTasks,
        departmentFilter
      };
    }
    
    // Rapor sorgusu mu?
    if (reportRegex.test(query)) {
      // Rapor dönemi belirleme
      let period = 'month'; // Varsayılan: aylık
      
      if (query.includes('hafta') || query.includes('haftalık') || query.includes('week')) {
        period = 'week';
      } else if (query.includes('3 ay') || query.includes('üç ay') || query.includes('quarter')) {
        period = 'quarter';
      } else if (query.includes('6 ay') || query.includes('altı ay') || query.includes('half-year')) {
        period = 'half-year';
      } else if (query.includes('yıl') || query.includes('yıllık') || query.includes('year')) {
        period = 'year';
      }
      
      // Rapor tipini belirleme
      let reportType = 'production'; // Varsayılan: üretim raporu
      
      if (query.includes('stok') || query.includes('inventory')) {
        reportType = 'inventory';
      } else if (query.includes('sipariş') || query.includes('order')) {
        reportType = 'orders';
      } else if (query.includes('performans') || query.includes('verimlilik') || query.includes('performance')) {
        reportType = 'performance';
      }
      
      // Dönem için tarih aralığını belirle
      let startDate = new Date();
      const endDate = new Date();
      
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
        case 'half-year':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      
      // Rapor türüne göre verileri getir
      switch (reportType) {
        case 'production': {
          // Tamamlanan görev sayısı
          const completedTasks = await prisma.productionTask.count({
            where: {
              status: 'COMPLETED',
              completedAt: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Geciken görev sayısı
          const delayedTasks = await prisma.productionTask.count({
            where: {
              status: 'DELAYED',
              dueDate: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Departman bazında görev dağılımı
          const departmentStats = await prisma.productionTask.groupBy({
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
          
          // Görevlerin durum dağılımı
          const statusCounts = await prisma.productionTask.groupBy({
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
          
          reportData = {
            type: reportType,
            period,
            startDate,
            endDate,
            completedTasks,
            delayedTasks,
            departmentStats,
            statusCounts
          };
          break;
        }
        
        case 'inventory': {
          // Düşük stok sayısı
          const lowStockCount = await prisma.material.count({
            where: {
              quantity: {
                lte: prisma.material.minQuantity,
                gt: 0
              }
            }
          });
          
          // Stok tükenmiş sayısı
          const outOfStockCount = await prisma.material.count({
            where: {
              quantity: 0
            }
          });
          
          // En çok kullanılan malzemeler
          const mostUsedMaterials = await prisma.materialMovement.groupBy({
            by: ['materialId'],
            _sum: {
              quantity: true
            },
            where: {
              type: 'OUT',
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            orderBy: {
              _sum: {
                quantity: 'desc'
              }
            },
            take: 10
          });
          
          // Malzeme bilgilerini ekle
          for (const item of mostUsedMaterials) {
            const material = await prisma.material.findUnique({
              where: { id: item.materialId },
              select: { name: true, code: true }
            });
            
            if (material) {
              item.name = material.name;
              item.code = material.code;
            }
          }
          
          // Malzeme hareketlerinin dağılımı
          const movementTypes = await prisma.materialMovement.groupBy({
            by: ['type'],
            _count: {
              id: true
            },
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
          
          reportData = {
            type: reportType,
            period,
            startDate,
            endDate,
            lowStockCount,
            outOfStockCount,
            mostUsedMaterials,
            movementTypes
          };
          break;
        }
        
        case 'orders': {
          // Yeni sipariş sayısı
          const newOrdersCount = await prisma.order.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Tamamlanan sipariş sayısı
          const completedOrdersCount = await prisma.order.count({
            where: {
              status: 'COMPLETED',
              completedAt: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Müşterilere göre sipariş dağılımı
          const ordersByCustomer = await prisma.order.groupBy({
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
          
          // Sipariş önceliğine göre dağılım
          const ordersByPriority = await prisma.order.groupBy({
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
          
          reportData = {
            type: reportType,
            period,
            startDate,
            endDate,
            newOrdersCount,
            completedOrdersCount,
            ordersByCustomer,
            ordersByPriority
          };
          break;
        }
        
        case 'performance': {
          // Ortalama tamamlanma süresi
          const completedOrders = await prisma.order.findMany({
            where: {
              status: 'COMPLETED',
              completedAt: {
                gte: startDate,
                lte: endDate
              }
            },
            select: {
              createdAt: true,
              completedAt: true
            }
          });
          
          let avgCompletionDays = 0;
          if (completedOrders.length > 0) {
            const totalDays = completedOrders.reduce((sum, order) => {
              const days = (new Date(order.completedAt) - new Date(order.createdAt)) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0);
            avgCompletionDays = totalDays / completedOrders.length;
          }
          
          // Departman verimliliği
          const departmentEfficiency = await prisma.productionTask.groupBy({
            by: ['department'],
            _count: {
              id: true
            },
            where: {
              status: 'COMPLETED',
              completedAt: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Departman gecikme oranı
          const departmentDelays = await prisma.productionTask.groupBy({
            by: ['department'],
            _count: {
              id: true
            },
            where: {
              status: 'DELAYED',
              dueDate: {
                gte: startDate,
                lte: endDate
              }
            }
          });
          
          // Departman bazında verimlilik hesapla
          const departments = [...new Set([...departmentEfficiency, ...departmentDelays].map(d => d.department))];
          const efficiencyByDept = {};
          
          for (const dept of departments) {
            const completed = departmentEfficiency.find(d => d.department === dept)?._count?.id || 0;
            const delayed = departmentDelays.find(d => d.department === dept)?._count?.id || 0;
            
            efficiencyByDept[dept] = {
              completed,
              delayed,
              total: completed + delayed,
              rate: completed > 0 ? (completed / (completed + delayed)) * 100 : 0
            };
          }
          
          reportData = {
            type: reportType,
            period,
            startDate,
            endDate,
            completedOrdersCount: completedOrders.length,
            avgCompletionDays,
            departmentEfficiency: efficiencyByDept
          };
          break;
        }
      }
    }
    
    // Satın alma sorgusu mu?
    if (purchaseRegex.test(query)) {
      // Bekleyen satın alma talepleri
      const pendingRequests = await prisma.purchaseRequest.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: true
            }
          },
          items: {
            include: {
              material: true
            }
          },
          requestedBy: {
            select: { name: true }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      
      // Yaklaşan teslimatlar
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingDeliveries = await prisma.purchaseRequestItem.findMany({
        where: {
          status: 'ORDERED',
          estimatedDelivery: {
            gte: today,
            lte: nextWeek
          }
        },
        include: {
          material: true,
          purchaseRequest: {
            include: {
              order: {
                select: {
                  orderNumber: true,
                  customer: true
                }
              }
            }
          }
        },
        orderBy: { estimatedDelivery: 'asc' }
      });
      
      // Tedarikçi bazında bekleyen siparişler
      const pendingBySupplier = await prisma.purchaseRequestItem.groupBy({
        by: ['supplier'],
        _count: {
          id: true
        },
        _sum: {
          quantity: true
        },
        where: {
          status: 'ORDERED'
        }
      });
      
      purchaseData = {
        pendingRequests,
        upcomingDeliveries,
        pendingBySupplier
      };
    }
    
    // AI için kontekst oluştur
    let systemPrompt = `
    Sen METS şirketinin üretim ve sipariş takip asistanısın. Görevin, kullanıcıların sorularına en doğru ve net yanıtları vermek.
    Şirket, hücre üretimi yapıyor. Bir sipariş verildiğinde, malzeme listesi kontrol ediliyor, stokta eksik malzemeler satın alma birimine iletiliyor.
    Üretim planlama ekibi, siparişlerin üretim programını belirliyor ve üretim şefleri günlük programı takip ediyor.
    
    Sistemden aldığın bilgilere göre kullanıcıya yanıt ver. Eğer bir sipariş hakkında bilgi yoksa veya emin değilsen, bilginin eksik olduğunu belirt.
    Yanıtlarında kısa, net ve profesyonel ol. İstatistikleri, tarihleri ve önemli bilgileri vurgula. Sayısal verileri ve karşılaştırmaları belirtirken rakamları kullan.
    
    Rapor talep edildiğinde, özet şeklinde başlayıp ardından detaylı analiz sunmalısın. Analiz içerisinde karşılaştırmalar yapmalı ve anlamlı çıkarımlar sunmalısın.
    
    Bir soruna dair yanıt verirken, çözüm önerileri de sunmaya çalış.
    
    Üretim süreçleri hakkında şunları bilmelisin:
    - Üretim, ENGINEERING, ASSEMBLY, TESTING ve PACKAGING departmanlarında gerçekleşir.
    - Standart bir hücre üretimi sırasıyla bu departmanlardaki aşamalardan geçer.
    - Teslimat tarihleri ve termin tarihleri kritik öneme sahiptir.
    - Gecikme durumunda mutlaka açıklama gerekir ve üst yönetime bildirilir.
    
    Malzeme stoku hakkında şunları bilmelisin:
    - Stok, minimum stok seviyesinin altına düştüğünde kritik durum oluşur.
    - Bir malzeme siparişe ayrıldığında, stok sayısı aynı kalsa bile kullanılabilir stok miktarı azalır.
    - Satın alma talepleri önceliklendirilir ve tedarik süresi takip edilir.
    `;
    
    // Mesaj oluştur
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: query }
    ];
    
    // Eğer ek veri varsa, AI'ya da ekle
    if (orderData) {
      messages.push({
        role: 'system',
        content: `Sipariş verileri: ${JSON.stringify(orderData)}`
      });
    }
    if (stockData) {
      messages.push({
        role: 'system',
        content: `Stok verileri: ${JSON.stringify(stockData)}`
      });
    }
    if (productionData) {
      messages.push({
        role: 'system',
        content: `Üretim verileri: ${JSON.stringify(productionData)}`
      });
    }
    if (reportData) {
      messages.push({
        role: 'system',
        content: `Rapor verileri: ${JSON.stringify(reportData)}`
      });
    }
    if (purchaseData) {
      messages.push({
        role: 'system',
        content: `Satın alma verileri: ${JSON.stringify(purchaseData)}`
      });
    }

    // DeepSeek API'sine istek gönder
    const completion = await createChatCompletion(messages, {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 1200
    });

    let aiResponse = completion.choices[0].message.content;
    
    // Üretim sorunlarıyla ilgili sorgular için, öngörü analizi yap
    if (productionData && query.toLowerCase().includes('sorun') || query.toLowerCase().includes('problem') || query.toLowerCase().includes('gecikme')) {
      try {
        const issueDetection = await detectPotentialIssues(productionData, orderData);
        // Eğer sorun tespiti yapıldıysa, AI yanıtına ekle
        if (issueDetection && issueDetection.issues) {
          const issuesSummary = `\n\n**Tespit Edilen Potansiyel Sorunlar:**\n${issueDetection.issues}`;
          aiResponse += issuesSummary;
        }
      } catch (detectionError) {
        console.error('Issue detection error:', detectionError);
        // Hata durumunda akışı bozmamak için devam et
      }
    }
    
    // Yanıtı kaydet ve dön
    await prisma.aiInteraction.create({
      data: {
        query,
        response: aiResponse,
        userId: session.user.id,
        context: JSON.stringify({
          orderData: orderData ? true : false,
          stockData: stockData ? true : false,
          productionData: productionData ? true : false,
          reportData: reportData ? true : false,
          purchaseData: purchaseData ? true : false
        })
      }
    });

    return res.status(200).json({ 
      response: aiResponse,
      data: {
        hasOrderData: !!orderData,
        hasStockData: !!stockData,
        hasProductionData: !!productionData,
        hasReportData: !!reportData,
        hasPurchaseData: !!purchaseData
      }
    });
  } catch (error) {
    console.error('AI Assistant Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

/**
 * Potansiyel üretim sorunlarını tespit etmek için analiz yapar
 * @param {Object} productionData - Üretim verileri
 * @param {Object} orderData - Sipariş verileri (opsiyonel)
 * @returns {Promise<Object>} - Tespit edilen sorunlar
 */
async function detectPotentialIssues(productionData, orderData) {
  try {
    // Analiz için veri topla
    const tasks = productionData.tasks || [];
    const departmentStats = productionData.departmentStats || [];
    
    // Sorunları depolamak için dizi
    const issues = [];
    
    // 1. Gecikmiş görevleri kontrol et
    const delayedTasks = tasks.filter(task => task.status === 'DELAYED');
    if (delayedTasks.length > 0) {
      issues.push(`${delayedTasks.length} gecikmiş görev bulundu. Bu görevler üretim programını etkileyebilir.`);
      
      // En kritik gecikmeli görevi bul (termin tarihine en yakın olan)
      const criticalTask = delayedTasks.reduce((prev, current) => {
        const prevDueDate = new Date(prev.dueDate);
        const currentDueDate = new Date(current.dueDate);
        return prevDueDate < currentDueDate ? prev : current;
      }, delayedTasks[0]);
      
      issues.push(`En kritik geciken görev: ${criticalTask.name} (Sipariş: ${criticalTask.order?.orderNumber}, Departman: ${criticalTask.department})`);
    }
    
    // 2. Departman bazında iş yükleri ve sorunları kontrol et
    const departmentIssues = {};
    
    departmentStats.forEach(stat => {
      const [dept, status] = [stat.department, stat.status];
      if (!departmentIssues[dept]) {
        departmentIssues[dept] = { delayed: 0, total: 0 };
      }
      
      departmentIssues[dept].total += stat._count.id;
      if (status === 'DELAYED') {
        departmentIssues[dept].delayed += stat._count.id;
      }
    });
    
    // Sorun oranı yüksek departmanları tespit et
    for (const [dept, stats] of Object.entries(departmentIssues)) {
      if (stats.total > 0 && stats.delayed / stats.total > 0.3) { // %30'dan fazla görev gecikmişse
        issues.push(`${dept} departmanında yüksek gecikme oranı: %${Math.round(stats.delayed / stats.total * 100)}.`);
      }
    }
    
    // 3. Sipariş bazlı analiz (sipariş verisi mevcutsa)
    if (orderData) {
      // Siparişe ait görevlerin durumunu kontrol et
      const orderTasks = orderData.productionTasks || [];
      const delayedOrderTasks = orderTasks.filter(task => task.status === 'DELAYED');
      
      if (delayedOrderTasks.length > 0) {
        issues.push(`${orderData.orderNumber} siparişinde ${delayedOrderTasks.length} gecikmiş görev var. Termin tarihi risk altında olabilir.`);
      }
      
      // Termin tarihine karşı ilerleme durumu
      if (orderData.deadline) {
        const deadline = new Date(orderData.deadline);
        const today = new Date();
        const daysToDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        if (daysToDeadline < 0) {
          issues.push(`${orderData.orderNumber} siparişinin termin tarihi ${Math.abs(daysToDeadline)} gün geçmiş durumda!`);
        } else if (daysToDeadline < 7) {
          issues.push(`${orderData.orderNumber} siparişinin termin tarihine sadece ${daysToDeadline} gün kaldı.`);
        }
      }
    }
    
    // 4. Sonuçları döndür
    return {
      issues: issues.length > 0 ? issues.join('\n- ') : "Potansiyel üretim sorunu tespit edilmedi.",
      count: issues.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error detecting potential issues:', error);
    return null;
  }
}
