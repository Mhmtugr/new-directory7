import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  // Kullanıcı oturumunu kontrol et
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Filtreler ve sıralama
      const { 
        search, 
        status, 
        priority, 
        customer, 
        startDate, 
        endDate,
        sortBy = 'createdAt',
        sortDir = 'desc',
        page = 1,
        pageSize = 10
      } = req.query;
      
      // Filtre koşullarını oluştur
      let where = {};
      
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (status) {
        where.status = status;
      }
      
      if (priority) {
        where.priority = priority;
      }
      
      if (customer) {
        where.customer = { contains: customer, mode: 'insensitive' };
      }
      
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      } else if (endDate) {
        where.createdAt = { lte: new Date(endDate) };
      }
      
      // Siparişleri getir
      const orders = await prisma.order.findMany({
        where,
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
            take: 5,
            orderBy: { dueDate: 'asc' }
          }
        },
        orderBy: {
          [sortBy]: sortDir
        },
        skip: (page - 1) * pageSize,
        take: parseInt(pageSize)
      });
      
      // Toplam sipariş sayısı
      const total = await prisma.order.count({ where });
      
      return res.status(200).json({
        data: orders,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { 
        orderNumber, 
        customer, 
        description, 
        deadline, 
        priority = 'normal',
        technicalSpecs, 
        materials,
        productionEstimate,
        stockStatus
      } = req.body;
      
      // Gerekli alanları kontrol et
      if (!orderNumber || !customer || !deadline) {
        return res.status(400).json({ 
          message: 'Required fields missing', 
          requiredFields: ['orderNumber', 'customer', 'deadline']
        });
      }
      
      // Sipariş oluştur
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customer,
          description,
          deadline: new Date(deadline),
          priority,
          status: 'CREATED',
          technicalSpecs: technicalSpecs || {},
          createdBy: {
            connect: { id: session.user.id }
          }
        }
      });
      
      // Malzemeleri bağla
      if (materials && materials.length > 0) {
        await prisma.orderMaterial.createMany({
          data: materials.map(m => ({
            orderId: order.id,
            materialId: m.id,
            quantity: m.quantity
          }))
        });
        
        // Stok eksikliği varsa, satın alma talebi oluştur
        if (stockStatus && !stockStatus.hasAllItems) {
          const shortageItems = stockStatus.shortageItems || [];
          
          await prisma.purchaseRequest.create({
            data: {
              orderId: order.id,
              status: 'PENDING',
              requestedBy: {
                connect: { id: session.user.id }
              },
              items: {
                createMany: {
                  data: shortageItems.map(item => ({
                    materialId: item.id,
                    quantity: item.shortageAmount,
                    status: 'REQUESTED'
                  }))
                }
              }
            }
          });
          
          // Satın alma bildirimi oluştur
          await prisma.notification.create({
            data: {
              title: 'Yeni Satın Alma Talebi',
              content: `${orderNumber} numaralı sipariş için ${shortageItems.length} kalem malzeme satın alınması gerekiyor.`,
              type: 'PURCHASE_REQUEST',
              severity: 'MEDIUM',
              targetDepartment: 'PURCHASE' // Satın alma departmanı
            }
          });
        }
      }
      
      // Üretim tahminini kaydet
      if (productionEstimate) {
        await prisma.productionEstimate.create({
          data: {
            orderId: order.id,
            totalDays: productionEstimate.totalDays,
            totalHours: productionEstimate.totalHours,
            estimatedCompletionDate: new Date(productionEstimate.estimatedCompletionDate),
            stagesData: productionEstimate.stages || []
          }
        });
      }
      
      // İlk not: sipariş oluşturma
      await prisma.note.create({
        data: {
          orderId: order.id,
          content: `Sipariş oluşturuldu`,
          severity: 'LOW',
          userId: session.user.id
        }
      });
      
      // Siparişi detaylı bir şekilde getir
      const createdOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          materials: {
            include: {
              material: true
            }
          },
          notes: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      });
      
      return res.status(201).json(createdOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
