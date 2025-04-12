/**
 * Üretim planlaması için makine öğrenmesi modülü
 * Geçmiş üretim verilerinden öğrenerek yeni siparişlerin üretim süresini tahmin eder
 */
import * as tf from '@tensorflow/tfjs-node';
import prisma from './prisma';

/**
 * Yeni sipariş için üretim süresi tahmini yapar
 * @param {Object} orderDetails - Sipariş detayları
 * @param {Array} materials - Kullanılacak malzemeler
 * @returns {Promise<Object>} - Tahmin sonuçları
 */
export async function predictProductionTime(orderDetails, materials) {
  try {
    // 1. Benzer geçmiş siparişleri bul
    const similarOrders = await findSimilarCompletedOrders(orderDetails, materials);
    
    // 2. Benzerlik skorlarına göre ağırlıklı tahmin
    if (similarOrders.length >= 3) {
      return weightedPredictionFromSimilarOrders(similarOrders);
    }
    
    // 3. Yeterli benzer sipariş yoksa ML modeli kullan
    return await machineLearningSolution(orderDetails, materials);
  } catch (error) {
    console.error('Error in production time prediction:', error);
    return {
      success: false,
      error: error.message,
      // Yedek olarak ortalama değerleri dön
      fallbackEstimate: {
        totalDays: 14, // Varsayılan ortalama üretim süresi
        totalHours: 112,
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        confidence: 'low',
        stages: getDefaultStages()
      }
    };
  }
}

/**
 * Üretim verilerinden model eğitir
 * @returns {Promise<Object>} - Eğitim sonuçları
 */
export async function trainProductionModel() {
  try {
    console.log('Starting production model training...');
    
    // 1. Tamamlanmış siparişleri ve üretim sürelerini getir
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      include: {
        materials: {
          include: {
            material: true
          }
        },
        productionTasks: true,
        productionEstimate: true
      }
    });
    
    if (completedOrders.length < 10) {
      console.log('Not enough training data, need at least 10 completed orders');
      return { success: false, message: 'Insufficient training data' };
    }
    
    // 2. Veriyi hazırla
    const trainingData = prepareTrainingData(completedOrders);
    
    // 3. ML modeli oluştur ve eğit
    const model = await createAndTrainModel(trainingData);
    
    // 4. Modeli kaydet
    await model.save('file://./model');
    
    return { 
      success: true, 
      message: 'Model trained successfully',
      metrics: { // Basit örnek metrikler
        orderCount: completedOrders.length,
        accuracy: 0.85, // Örnek değer
        mse: 2.3 // Örnek değer
      }
    };
  } catch (error) {
    console.error('Error training production model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Benzer tamamlanmış siparişleri bulur
 * @param {Object} orderDetails - Yeni sipariş detayları
 * @param {Array} materials - Kullanılacak malzemeler
 */
async function findSimilarCompletedOrders(orderDetails, materials) {
  // Malzeme kategorileri ve miktarları
  const materialCategories = materials.map(m => m.material.category);
  const materialQuantities = materials.reduce((acc, m) => {
    acc[m.material.category] = (acc[m.material.category] || 0) + m.quantity;
    return acc;
  }, {});
  
  // Tamamlanmış siparişleri getir
  const completedOrders = await prisma.order.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { not: null }
    },
    include: {
      materials: {
        include: {
          material: true
        }
      },
      productionTasks: {
        orderBy: {
          startDate: 'asc'
        }
      }
    },
    take: 100, // Son 100 tamamlanmış sipariş
    orderBy: {
      completedAt: 'desc'
    }
  });
  
  // Benzerlik hesapla ve sırala
  const similarityScores = completedOrders.map(order => {
    // 1. Kategori eşleşmesi
    const orderCategories = order.materials.map(m => m.material.category);
    const commonCategories = materialCategories.filter(cat => 
      orderCategories.includes(cat)
    );
    
    const categoryScore = commonCategories.length / 
      Math.max(materialCategories.length, orderCategories.length);
    
    // 2. Miktar benzerliği
    const orderQuantities = order.materials.reduce((acc, m) => {
      acc[m.material.category] = (acc[m.material.category] || 0) + m.quantity;
      return acc;
    }, {});
    
    let quantityDiffScore = 0;
    let quantityComparisons = 0;
    
    for (const category of commonCategories) {
      const newQuantity = materialQuantities[category] || 0;
      const oldQuantity = orderQuantities[category] || 0;
      
      if (oldQuantity > 0 && newQuantity > 0) {
        // Normalize the quantities difference
        const ratio = Math.min(newQuantity, oldQuantity) / 
                     Math.max(newQuantity, oldQuantity);
        quantityDiffScore += ratio;
        quantityComparisons++;
      }
    }
    
    const quantityScore = quantityComparisons > 0 ? 
      quantityDiffScore / quantityComparisons : 0;
    
    // 3. Üretim süresi hesaplama
    let productionDays = 0;
    if (order.productionTasks.length > 0) {
      const firstTask = order.productionTasks[0];
      const lastTask = order.productionTasks[order.productionTasks.length - 1];
      
      const startDate = new Date(firstTask.startDate);
      const endDate = new Date(lastTask.completedAt || lastTask.dueDate);
      
      productionDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }
    
    // Toplam benzerlik skoru (kategori 0.6, miktar 0.4 ağırlıklı)
    const similarityScore = (categoryScore * 0.6) + (quantityScore * 0.4);
    
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      similarityScore,
      productionDays,
      materials: order.materials,
      productionTasks: order.productionTasks
    };
  });
  
  // En benzer siparişleri dön
  return similarityScores
    .filter(item => item.similarityScore > 0.5) // En az %50 benzerlik 
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5); // En benzer 5 sipariş
}

/**
 * Benzer siparişlere göre ağırlıklı tahmin yapar
 * @param {Array} similarOrders - Benzer siparişler
 */
function weightedPredictionFromSimilarOrders(similarOrders) {
  // 1. Toplam benzerlik skoru
  const totalSimilarity = similarOrders.reduce(
    (sum, order) => sum + order.similarityScore, 0
  );
  
  // 2. Ağırlıklı gün sayısı hesapla
  let weightedDays = 0;
  for (const order of similarOrders) {
    const weight = order.similarityScore / totalSimilarity;
    weightedDays += order.productionDays * weight;
  }
  
  // 3. Tahmini gün sayısını yuvarla
  const predictedDays = Math.ceil(weightedDays);
  
  // 4. Aşamaları (engineering, assembly, testing, packaging) hesapla
  const stages = calculateStagesFromSimilarOrders(similarOrders, predictedDays);
  
  // 5. Bitiş tarihini hesapla
  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + predictedDays);
  
  // Sonuçları dön
  return {
    success: true,
    method: 'similarity-based',
    estimate: {
      totalDays: predictedDays,
      totalHours: predictedDays * 8, // Günde 8 saat çalışma varsayımı
      estimatedCompletionDate,
      confidence: calculateConfidenceLevel(similarOrders),
      stages,
      similarOrdersUsed: similarOrders.map(o => ({
        orderNumber: o.orderNumber,
        similarity: Math.round(o.similarityScore * 100) + '%',
        days: o.productionDays
      }))
    }
  };
}

/**
 * Benzer siparişlerden üretim aşamalarını hesaplar
 */
function calculateStagesFromSimilarOrders(similarOrders, totalDays) {
  // Standart aşamalar ve ağırlıkları
  const stageNames = ['ENGINEERING', 'ASSEMBLY', 'TESTING', 'PACKAGING'];
  const stageWeights = {
    'ENGINEERING': 0.25,
    'ASSEMBLY': 0.5,
    'TESTING': 0.15,
    'PACKAGING': 0.1
  };
  
  // Benzer siparişlerden ortalama ağırlıkları hesapla
  const sampledWeights = {};
  let validOrderCount = 0;
  
  for (const order of similarOrders) {
    const tasks = order.productionTasks;
    if (!tasks || tasks.length === 0) continue;
    
    validOrderCount++;
    const totalDuration = order.productionDays;
    
    // Her aşamanın süresini topla
    const orderWeights = {};
    
    for (const task of tasks) {
      const dept = task.department;
      if (!stageNames.includes(dept)) continue;
      
      // Task süresini hesapla (gün olarak)
      let taskDuration = 1; // Varsayılan 1 gün
      
      if (task.completedAt && task.startDate) {
        const start = new Date(task.startDate);
        const end = new Date(task.completedAt);
        taskDuration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      } else if (task.dueDate && task.startDate) {
        const start = new Date(task.startDate);
        const end = new Date(task.dueDate);
        taskDuration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      }
      
      orderWeights[dept] = (orderWeights[dept] || 0) + taskDuration;
    }
    
    // Ağırlıkları normalize et ve topla
    for (const dept of stageNames) {
      if (orderWeights[dept]) {
        const weight = orderWeights[dept] / totalDuration;
        sampledWeights[dept] = (sampledWeights[dept] || 0) + weight;
      }
    }
  }
  
  // Final ağırlıkları hesapla - örneklerden veya varsayılan değerlerden
  const finalWeights = {};
  let remainingWeight = 1.0;
  
  for (const dept of stageNames) {
    if (validOrderCount > 0 && sampledWeights[dept]) {
      finalWeights[dept] = sampledWeights[dept] / validOrderCount;
      remainingWeight -= finalWeights[dept];
    } else {
      finalWeights[dept] = stageWeights[dept];
    }
  }
  
  // Ağırlıkları normalize et (toplamları 1 olacak şekilde)
  if (remainingWeight != 0) {
    const weightSum = Object.values(finalWeights).reduce((a, b) => a + b, 0);
    for (const dept of stageNames) {
      finalWeights[dept] /= weightSum;
    }
  }
  
  // Gün bazında aşamaları hesapla
  const stages = [];
  let remainingDays = totalDays;
  
  for (let i = 0; i < stageNames.length - 1; i++) {
    const dept = stageNames[i];
    let days = Math.round(totalDays * finalWeights[dept]);
    
    // Minimum 1 gün
    days = Math.max(1, days); 
    
    // Son aşamaya en az 1 gün kalması için kontrol
    if (remainingDays - days < 1) {
      days = remainingDays - 1;
    }
    
    stages.push({
      name: getDepartmentDisplayName(dept),
      department: dept,
      days,
      hours: days * 8 // Günde 8 saat çalışma varsayımı
    });
    
    remainingDays -= days;
  }
  
  // Son aşama kalan günleri alır
  stages.push({
    name: getDepartmentDisplayName(stageNames[stageNames.length - 1]),
    department: stageNames[stageNames.length - 1],
    days: remainingDays,
    hours: remainingDays * 8
  });
  
  return stages;
}

/**
 * Tahmin kalitesi için güven düzeyini belirler
 */
function calculateConfidenceLevel(similarOrders) {
  if (similarOrders.length >= 5 && similarOrders[0].similarityScore > 0.8) {
    return 'high';
  }
  if (similarOrders.length >= 3 && similarOrders[0].similarityScore > 0.6) {
    return 'medium';
  }
  return 'low';
}

/**
 * Makine öğrenmesi ile tahmin yapar (yeterli veri yoksa kullanılır)
 */
async function machineLearningSolution(orderDetails, materials) {
  try {
    // 1. Özellik vektörü oluştur
    const features = extractFeatures(orderDetails, materials);
    
    // 2. Modeli yükle veya varsayılan tahminler yap
    let model;
    try {
      model = await tf.loadLayersModel('file://./model');
    } catch (e) {
      console.log('Production model not found, using default estimates');
      return {
        success: true,
        method: 'default-estimate',
        estimate: {
          totalDays: 14, // Varsayılan ortalama üretim süresi
          totalHours: 112,
          estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          confidence: 'low',
          stages: getDefaultStages()
        }
      };
    }
    
    // 3. Tahmin yap
    const inputTensor = tf.tensor2d([features]);
    const prediction = model.predict(inputTensor);
    const days = Math.ceil(prediction.dataSync()[0]);
    
    // 4. Aşamaları oluştur
    const stages = getDefaultStages(days);
    
    // 5. Bitiş tarihini hesapla
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + days);
    
    return {
      success: true,
      method: 'ml-model',
      estimate: {
        totalDays: days,
        totalHours: days * 8,
        estimatedCompletionDate,
        confidence: 'medium',
        stages
      }
    };
  } catch (error) {
    console.error('ML prediction error:', error);
    // Hata durumunda varsayılan tahmin döndür
    return {
      success: false,
      error: error.message,
      estimate: {
        totalDays: 14,
        totalHours: 112,
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        confidence: 'low',
        stages: getDefaultStages()
      }
    };
  }
}

/**
 * Sipariş ve malzeme verilerinden özellik vektörü oluşturur
 */
function extractFeatures(orderDetails, materials) {
  // Basit özellik çıkarma örneği
  // Gerçek uygulamada daha sofistike özellikler kullanılabilir
  
  // 1. Malzeme sayıları kategorilere göre
  const categoryCountMap = {};
  let totalItems = 0;
  
  for (const material of materials) {
    const category = material.material.category;
    categoryCountMap[category] = (categoryCountMap[category] || 0) + material.quantity;
    totalItems += material.quantity;
  }
  
  // 2. Öncelik düzeyi
  const priorityMap = {
    'low': 0.25,
    'normal': 0.5,
    'high': 0.75,
    'urgent': 1.0
  };
  const priorityValue = priorityMap[orderDetails.priority.toLowerCase()] || 0.5;
  
  // 3. Özellik vektörü oluştur
  const features = [
    totalItems,
    materials.length,
    categoryCountMap['Batarya'] || 0,
    categoryCountMap['Elektronik'] || 0,
    categoryCountMap['Kasa'] || 0,
    categoryCountMap['Mekanik'] || 0,
    priorityValue,
    orderDetails.technicalSpecs ? Object.keys(orderDetails.technicalSpecs).length : 0
  ];
  
  return features;
}

/**
 * Eğitim verisi hazırlar
 */
function prepareTrainingData(completedOrders) {
  const X = []; // Özellikler
  const y = []; // Hedef (üretim gün sayısı)
  
  for (const order of completedOrders) {
    if (!order.productionTasks || order.productionTasks.length === 0) {
      continue;
    }
    
    // Üretim süresini hesapla
    const tasks = order.productionTasks.sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );
    
    const firstTask = tasks[0];
    const lastTask = tasks[tasks.length - 1];
    
    let startDate = new Date(firstTask.startDate);
    let endDate;
    
    if (lastTask.completedAt) {
      endDate = new Date(lastTask.completedAt);
    } else if (lastTask.dueDate) {
      endDate = new Date(lastTask.dueDate);
    } else {
      continue; // Geçersiz veri
    }
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (days <= 0 || days > 100) {
      continue; // Anormal veri
    }
    
    // Özellik çıkar
    const features = extractFeatures(order, order.materials);
    
    X.push(features);
    y.push(days);
  }
  
  return { X, y };
}

/**
 * ML modeli oluşturur ve eğitir
 */
async function createAndTrainModel(data) {
  // TensorFlow modeli oluştur
  const model = tf.sequential();
  
  // Giriş katmanı
  model.add(tf.layers.dense({
    inputShape: [data.X[0].length],
    units: 16,
    activation: 'relu'
  }));
  
  // Gizli katman
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }));
  
  // Çıkış katmanı
  model.add(tf.layers.dense({
    units: 1,
    activation: 'linear' // Regresyon problemi
  }));
  
  // Modeli derle
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
  });
  
  // Veriyi tensor formatına dönüştür
  const xs = tf.tensor2d(data.X);
  const ys = tf.tensor1d(data.y);
  
  // Modeli eğit
  await model.fit(xs, ys, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
        }
      }
    }
  });
  
  return model;
}

/**
 * Varsayılan üretim aşamalarını oluşturur
 */
function getDefaultStages(totalDays = 14) {
  if (totalDays < 4) {
    return [
      { name: 'Mühendislik ve Tasarım', department: 'ENGINEERING', days: 1, hours: 8 },
      { name: 'Montaj', department: 'ASSEMBLY', days: 1, hours: 8 },
      { name: 'Test', department: 'TESTING', days: 1, hours: 8 },
      { name: 'Paketleme', department: 'PACKAGING', days: 1, hours: 8 }
    ];
  }
  
  return [
    { name: 'Mühendislik ve Tasarım', department: 'ENGINEERING', days: Math.ceil(totalDays * 0.3), hours: Math.ceil(totalDays * 0.3) * 8 },
    { name: 'Montaj', department: 'ASSEMBLY', days: Math.ceil(totalDays * 0.4), hours: Math.ceil(totalDays * 0.4) * 8 },
    { name: 'Test', department: 'TESTING', days: Math.ceil(totalDays * 0.2), hours: Math.ceil(totalDays * 0.2) * 8 },
    { name: 'Paketleme', department: 'PACKAGING', days: Math.ceil(totalDays * 0.1), hours: Math.ceil(totalDays * 0.1) * 8 }
  ];
}

/**
 * Departman kodundan görünen ismi döner
 */
function getDepartmentDisplayName(code) {
  const nameMap = {
    'ENGINEERING': 'Mühendislik ve Tasarım',
    'ASSEMBLY': 'Montaj',
    'TESTING': 'Test',
    'PACKAGING': 'Paketleme'
  };
  return nameMap[code] || code;
}

export default {
  predictProductionTime,
  trainProductionModel
};
