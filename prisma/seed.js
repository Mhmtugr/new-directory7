const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanını seed ediliyor...');

  // Test kullanıcıları oluştur
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mets.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@mets.com',
      password: passwordHash,
      department: 'MANAGEMENT',
      position: 'Administrator',
      permissions: ['ADMIN', 'USER', 'SALES', 'PRODUCTION', 'INVENTORY', 'REPORTS']
    }
  });
  
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@mets.com' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@mets.com',
      password: passwordHash,
      department: 'SALES',
      position: 'Sales Representative',
      permissions: ['USER', 'SALES']
    }
  });
  
  const productionUser = await prisma.user.upsert({
    where: { email: 'production@mets.com' },
    update: {},
    create: {
      name: 'Production Manager',
      email: 'production@mets.com',
      password: passwordHash,
      department: 'PRODUCTION',
      position: 'Production Manager',
      permissions: ['USER', 'PRODUCTION']
    }
  });
  
  // Test malzemeleri
  const materials = [
    {
      code: 'M001',
      name: 'Batarya Hücresi Tip-A',
      description: '3.7V Lityum İyon Batarya',
      unit: 'adet',
      category: 'Batarya',
      quantity: 100,
      minQuantity: 20
    },
    {
      code: 'M002',
      name: 'Batarya Yönetim Sistemi',
      description: 'BMS Controller',
      unit: 'adet',
      category: 'Elektronik',
      quantity: 50,
      minQuantity: 10
    },
    {
      code: 'M003',
      name: 'Alüminyum Kutu',
      description: 'Batarya Muhafazası',
      unit: 'adet',
      category: 'Kasa',
      quantity: 30,
      minQuantity: 5
    },
    {
      code: 'M004',
      name: 'Konnektör',
      description: 'Güç Konnektörü',
      unit: 'adet',
      category: 'Elektronik',
      quantity: 200,
      minQuantity: 50
    },
    {
      code: 'M005',
      name: 'Soğutma Sıvısı',
      description: 'Termal Yönetim Sıvısı',
      unit: 'litre',
      category: 'Sıvı',
      quantity: 25,
      minQuantity: 5
    }
  ];
  
  for (const material of materials) {
    await prisma.material.upsert({
      where: { code: material.code },
      update: material,
      create: material
    });
  }
  
  // Test siparişi
  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'ORD20230001' },
    update: {},
    create: {
      orderNumber: 'ORD20230001',
      customer: 'ABC Enerji Ltd.',
      description: '10kWh Enerji Depolama Sistemi',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
      priority: 'high',
      status: 'IN_PROGRESS',
      technicalSpecs: {
        voltaj: '48V',
        kapasite: '10kWh',
        boyut: '60x40x30cm'
      },
      createdById: salesUser.id
    }
  });
  
  // Sipariş malzemelerini ekle
  await prisma.orderMaterial.createMany({
    data: [
      { orderId: order1.id, materialId: (await prisma.material.findUnique({ where: { code: 'M001' } })).id, quantity: 50 },
      { orderId: order1.id, materialId: (await prisma.material.findUnique({ where: { code: 'M002' } })).id, quantity: 1 },
      { orderId: order1.id, materialId: (await prisma.material.findUnique({ where: { code: 'M003' } })).id, quantity: 1 },
      { orderId: order1.id, materialId: (await prisma.material.findUnique({ where: { code: 'M004' } })).id, quantity: 10 }
    ],
    skipDuplicates: true
  });
  
  // Not ekle
  await prisma.note.create({
    data: {
      orderId: order1.id,
      content: 'Müşteri termin tarihinin önemli olduğunu belirtti.',
      severity: 'MEDIUM',
      userId: salesUser.id
    }
  });
  
  // Üretim tahmini ekle
  await prisma.productionEstimate.upsert({
    where: { orderId: order1.id },
    update: {},
    create: {
      orderId: order1.id,
      totalDays: 14,
      totalHours: 112,
      estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      stagesData: [
        { name: 'Mühendislik ve Tasarım', days: 3, hours: 24 },
        { name: 'Montaj', days: 7, hours: 56 },
        { name: 'Test', days: 3, hours: 24 },
        { name: 'Paketleme', days: 1, hours: 8 }
      ]
    }
  });
  
  // Üretim görevleri ekle
  await prisma.productionTask.createMany({
    data: [
      {
        name: 'Mühendislik ve Tasarım',
        department: 'ENGINEERING',
        orderId: order1.id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        priority: 'high',
        assignedToId: productionUser.id,
        description: 'ORD20230001 siparişi için mühendislik ve tasarım'
      },
      {
        name: 'Montaj',
        department: 'ASSEMBLY',
        orderId: order1.id,
        startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        status: 'SCHEDULED',
        priority: 'high',
        description: 'ORD20230001 siparişi için montaj'
      }
    ]
  });
  
  console.log('Seed işlemi tamamlandı!');
}

main()
  .catch((e) => {
    console.error('Seed işlemi hata verdi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
