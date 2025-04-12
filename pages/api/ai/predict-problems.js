import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Configuration, OpenAIApi } from 'openai';
import prisma from '../../../lib/prisma';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    // Potansiyel sorunları tespit etmek için verileri topla
    const predictionData = {};
    
    // 1. Geciken görevleri analiz et
    predictionData.delayedTasks = await prisma.productionTask.findMany({
      where: {
        status: 'DELAYED'
      },
      include: {
        order: true,
        assignedTo: {
          select: { name: true, department: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    // 2. Kritik stok seviyelerini kontrol et
    predictionData.criticalStock = await prisma.material.findMany({
      where: {
        quantity: { lt: 5 }
      },
      orderBy: { quantity: 'asc' }
    });
    
    // 3. Yaklaşan termine yakın ancak tamamlanmamış siparişler
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    predictionData.upcomingDeadlines = await prisma.order.findMany({
      where: {
        deadline: { lte: oneWeekFromNow },
        status: { not: 'COMPLETED' }
      },
      include: {
        productionTasks: {
          where: { status: { not: 'COMPLETED' } }
        }
      },
      orderBy: { deadline: 'asc' }
    });
    
    // 4. Geçmiş problematik alanlar
    // Son 3 aydaki gecikme notlarını ve nedenleri
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    predictionData.delayNotes = await prisma.note.findMany({
      where: {
        createdAt: { gte: threeMonthsAgo },
        severity: 'HIGH',
        OR: [
          { content: { contains: 'gecikme', mode: 'insensitive' } },
          { content: { contains: 'sorun', mode: 'insensitive' } },
          { content: { contains: 'hata', mode: 'insensitive' } }
        ]
      },
      include: {
        order: true,
        user: { 
          select: { name: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // 5. Departman bazında gecikme analitiği
    predictionData.departmentDelays = await prisma.productionTask.groupBy({
      by: ['department'],
      _count: {
        id: true
      },
      _sum: {
        delayInDays: true
      },
      where: {
        status: 'DELAYED',
        createdAt: { gte: threeMonthsAgo }
      },
      orderBy: {
        _sum: {
          delayInDays: 'desc'
        }
      }
    });
    
    // OpenAI ile veriyi analiz et ve sorunları tahmin et
    const systemPrompt = `
      Sen bir üretim analitiği uzmanısın. Görevin, verilen verileri analiz ederek potansiyel sorunları tespit etmek
      ve bu sorunları önlemek için öneriler sunmak. Şu konulara odaklan:
      
      1. Gecikmekte olan veya gecikme riski olan siparişler
      2. Kritik stok seviyeleri ve potansiyel tedarik sorunları
      3. Departman bazında yavaşlama veya darboğazlar
      4. Tekrar eden sorunlar veya örüntüler
      5. Acil müdahale gerektiren durumlar
      
      Yanıtını şu şekilde yapılandır:
      - Acil Dikkat Gerektiren Sorunlar (bugün müdahale edilmesi gerekenler)
      - Yaklaşan Riskler (önümüzdeki hafta içinde ele alınması gerekenler)
      - Uzun Vadeli İyileştirme Önerileri
      
      Her tespit için somut önlem önerileri sun.
    `;
    
    // OpenAI API'sine istek gönder
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Üretim sistemimizdeki potansiyel sorunları analiz et: ${JSON.stringify(predictionData)}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = completion.data.choices[0].message.content;
    
    // Analizi veritabanına kaydet
    const prediction = await prisma.problemPrediction.create({
      data: {
        analysis: analysis,
        rawData: JSON.stringify(predictionData),
        createdBy: {
          connect: { id: session.user.id }
        }
      }
    });

    // Kritik sorunlar için otomatik bildirim oluştur
    if (predictionData.criticalStock.length > 0 || predictionData.upcomingDeadlines.length > 0) {
      await prisma.notification.createMany({
        data: [
          ...predictionData.criticalStock.map(material => ({
            title: 'Kritik Stok Uyarısı',
            content: `${material.name} stoğu kritik seviyede (${material.quantity} adet kaldı)`,
            type: 'STOCK_WARNING',
            severity: 'HIGH',
            userId: null // Tüm ilgili kullanıcılara
          })),
          ...predictionData.upcomingDeadlines.map(order => ({
            title: 'Termin Tarihi Yaklaşıyor',
            content: `${order.orderNumber} numaralı siparişin termin tarihi yaklaşıyor (${new Date(order.deadline).toLocaleDateString()})`,
            type: 'DEADLINE_WARNING',
            severity: 'HIGH',
            userId: null // Tüm ilgili kullanıcılara
          }))
        ]
      });
    }

    return res.status(200).json({ 
      analysis,
      urgentIssuesCount: predictionData.criticalStock.length + predictionData.upcomingDeadlines.length,
      departmentIssues: predictionData.departmentDelays
    });
  } catch (error) {
    console.error('Problem Prediction Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
