/**
 * Üretim Planlaması için Yapay Zeka Modülü
 * Makine öğrenmesi ile üretim sürelerini tahmin eder ve planlamayı optimize eder
 */
import * as tf from '@tensorflow/tfjs-node';
import prisma from './prisma';
import { logError, logInfo } from './errorLogging';

// Model varsayılan parametreleri
const MODEL_PARAMS = {
  hiddenLayers: [32, 16],
  learningRate: 0.001,
  epochs: 100,
  batchSize: 32
};

// Öğrenme süreci durumu
let trainingInProgress = false;
let lastTrainingDate = null;
let modelAccuracy = null;

/**
 * Yeni bir üretim görevi için süre tahmini yapar
 * @param {Object} orderData - Sipariş bilgileri
 * @param {Array} materials - Malzeme listesi 
 * @returns {Promise<Object>} - Tahmin sonuçları
 */
export async function predictProductionTime(orderData, materials) {
  try {
    // 1. Benzer siparişlere dayalı tahmin
    const similarOrdersResult = await predictBasedOnSimilarOrders(orderData, materials);
    
    // Benzer sipariş yeterince iyi tahminler sağlıyorsa onu kullan
    if (similarOrdersResult.confidence === 'high') {
      return similarOrdersResult;
    }
    
    // 2. Makine öğrenmesi modeline dayalı tahmin
    const mlPredictionResult = await predictWithModel(orderData, materials);
    
    // 3. Her iki yaklaşımı birleştir (daha iyi sonuç için)
    const finalPrediction = combineApproaches(similarOrdersResult, mlPredictionResult);
    
    // 4. Mevcut üretim programını kontrol et
    const scheduleAnalysis = await analyzeProductionSchedule(finalPrediction.estimate);
    
    return {
      ...finalPrediction,
      schedule: scheduleAnalysis
    };
  } catch (error) {
    logError('Production time prediction failed', { error }, 'error');
    
    // Hata durumunda varsayılan tahmin döndür
    return {
      success: false,
      estimate: getDefaultEstimate(orderData),
      error: error.message,
      errorType: 'PREDICTION_FAILED'
    };
  }
}

/**
 * Benzer siparişlere göre üretim süresi tahmini
 */
async function predictBasedOnSimilarOrders(orderData, materials) {
  try {
    // 1. Benzerlik faktörleri
    const productType = orderData.productType || 'standard';
    const complexity = orderData.complexity || 'medium';
    const customSpecs = orderData.technicalSpecs ? Object.keys(orderData.technicalSpecs).length : 0;
    
    // 2. Malzeme sayılarını kategorilere göre grupla
    const materialsByCategory = {};
    let totalMaterialCount = 0;
    
    materials.forEach(material => {
      const category = material.material?.category || 'uncategorized';
      materialsByCategory[category] = (materialsByCategory[category] || 0) + material.quantity;
      totalMaterialCount += material.quantity;
    });
    
    // 3. Benzer tamamlanmış siparişleri sorgula
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        productType: {
          equals: productType
        }
      },
      include: {
        materials: {
          include: {
            material: true
          }
        },
        productionTasks: {
          where: {
            status: 'COMPLETED'
          }
        }
      },
      take: 20,
      orderBy: {
        completedAt: 'desc'
      }
    });
    
    if (completedOrders.length === 0) {
      return {
        success: true,
        confidence: 'low',
        estimate: getDefaultEstimate(orderData),
        similarOrdersCount: 0,
        method: 'default'
      };
    }
    
    // 4. Siparişlere benzerlik skoru hesapla
    const scoredOrders = completedOrders.map(order => {
      // 4.1 Malzeme benzerliği
      const orderMaterialCounts = {};
      let orderTotalMaterials = 0;
      
      order.materials.forEach(material => {
        const category = material.material?.category || 'uncategorized';
        orderMaterialCounts[category] = (orderMaterialCounts[category] || 0) + material.quantity;
        orderTotalMaterials += material.quantity;
      });
      
      // 4.2 Malzeme benzerlik skoru (0-1)
      let materialSimilarity = 0;
      const allCategories = new Set([
        ...Object.keys(materialsByCategory),
        ...Object.keys(orderMaterialCounts)
      ]);
      
      let categoryComparisons = 0;
      allCategories.forEach(category => {
        const newCount = materialsByCategory[category] || 0;
        const orderCount = orderMaterialCounts[category] || 0;
        
        if (newCount > 0 && orderCount > 0) {
          // Kategorideki malzeme sayılarının oransal benzerliği 
          const ratio = Math.min(newCount, orderCount) / Math.max(newCount, orderCount);
          materialSimilarity += ratio;
          categoryComparisons++;
        }
      });
      
      materialSimilarity = categoryComparisons > 0 ? materialSimilarity / categoryComparisons : 0;
      
      // 4.3 Sipariş karmaşıklığı benzerliği
      const orderComplexity = order.complexity || 'medium';
      const complexitySimilarity = orderComplexity === complexity ? 1 : 
                                  (orderComplexity === 'high' && complexity === 'medium') || 
                                  (orderComplexity === 'medium' && complexity === 'high') ? 0.7 :
                                  (orderComplexity === 'low' && complexity === 'medium') || 
                                  (orderComplexity === 'medium' && complexity === 'low') ? 0.7 : 0.3;
      
      // 4.4 Toplam benzerlik skoru (farklı faktörlerin ağırlıklı ortalaması)
      const similarityScore = (materialSimilarity * 0.7) + (complexitySimilarity * 0.3);
      
      // 4.5 Üretim süresi hesapla
      let productionDays = 0;
      if (order.productionTasks.length > 0) {
        const startDates = order.productionTasks.map(task => new Date(task.startDate));
        const completionDates = order.productionTasks.map(task => 
          task.completedAt ? new Date(task.completedAt) : new Date(task.dueDate)
        );
        
        const earliestStart = new Date(Math.min(...startDates));
        const latestCompletion = new Date(Math.max(...completionDates));
        
        productionDays = Math.ceil((latestCompletion - earliestStart) / (1000 * 60 * 60 * 24));
      }
      
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        similarityScore,
        productionDays,
        materialCount: orderTotalMaterials,
        complexityMatch: complexitySimilarity
      };
    });
    
    // 5. Skorlara göre sırala ve filtreleme yap
    const relevantOrders = scoredOrders
      .filter(order => order.similarityScore > 0.4) // En az %40 benzerlik
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5); // En benzer 5 sipariş
    
    if (relevantOrders.length === 0) {
      return {
        success: true,
        confidence: 'low',
        estimate: getDefaultEstimate(orderData),
        similarOrdersCount: 0,
        method: 'default'
      };
    }
    
    // 6. Ağırlıklı ortalama ile süre tahmini yap
    const totalWeight = relevantOrders.reduce((sum, order) => sum + order.similarityScore, 0);
    const weightedDays = relevantOrders.reduce((sum, order) => 
      sum + (order.productionDays * (order.similarityScore / totalWeight)), 0
    );
    
    const estimatedDays = Math.ceil(weightedDays);
    
    // 7. Departman bazında süre tahminleri
    const departmentTimelines = calculateDepartmentTimelines(estimatedDays);
    
    // 8. Güven düzeyini belirle
    const confidence = 
      relevantOrders.length >= 3 && relevantOrders[0].similarityScore > 0.7 ? 'high' :
      relevantOrders.length >= 2 && relevantOrders[0].similarityScore > 0.5 ? 'medium' : 'low';
    
    // 9. Sonuçları döndür
    return {
      success: true,
      confidence,
      estimate: {
        totalDays: estimatedDays,
        startDate: new Date(),
        completionDate: getDaysLaterDate(estimatedDays),
        departmentTimelines,
        totalHours: estimatedDays * 8 // Günde 8 saat çalışma varsayımı
      },
      similarOrders: relevantOrders.map(o => ({
        orderNumber: o.orderNumber,
        similarity: Math.round(o.similarityScore * 100) + '%',
        days: o.productionDays
      })),
      similarOrdersCount: relevantOrders.length,
      method: 'similar-orders'
    };
  } catch (error) {
    logError('Similar order prediction failed', { error }, 'error');
    return {
      success: false,
      confidence: 'low',
      estimate: getDefaultEstimate(orderData),
      error: error.message,
      method: 'default'
    };
  }
}

/**
 * Makine öğrenmesi modeli ile üretim süresi tahmini
 */
async function predictWithModel(orderData, materials) {
  try {
    // 1. Özellik çıkarımı yap
    const features = extractFeatures(orderData, materials);
    
    // 2. Model yükle veya varsayılan değerler kullan
    let model;
    try {
      model = await tf.loadLayersModel('file://./model/production_time_model/model.json');
    } catch (e) {
      console.log('Could not load model, using default estimates');
      return {
        success: true,
        confidence: 'low',
        estimate: getDefaultEstimate(orderData),
        method: 'default'
      };
    }
    
    // 3. Tahmin yap
    const featureTensor = tf.tensor2d([features]);
    const prediction = model.predict(featureTensor);
    const daysPrediction = prediction.dataSync()[0];
    
    // 4. Tahmin edilen gün sayısını düzelt (minimum 3, maksimum 60 gün)
    const estimatedDays = Math.max(3, Math.min(60, Math.ceil(daysPrediction)));
    
    // 5. Departman bazında süre tahminleri
    const departmentTimelines = calculateDepartmentTimelines(estimatedDays);
    
    // 6. Sonuçları döndür
    return {
      success: true,
      confidence: modelAccuracy ? 'medium' : 'low',
      estimate: {
        totalDays: estimatedDays,
        startDate: new Date(),
        completionDate: getDaysLaterDate(estimatedDays),
        departmentTimelines,
        totalHours: estimatedDays * 8 // Günde 8 saat çalışma varsayımı
      },
      modelAccuracy: modelAccuracy,
      method: 'ml-model'
    };
  } catch (error) {
    logError('ML prediction failed', { error }, 'error');
    return {
      success: false,
      confidence: 'low',
      estimate: getDefaultEstimate(orderData),
      error: error.message,
      method: 'default'
    };
  }
}

/**
 * İki farklı tahmin yaklaşımını birleştir
 */
function combineApproaches(similarOrdersResult, mlPredictionResult) {
  // Her iki yaklaşım da başarısızsa varsayılan değeri kullan
  if (!similarOrdersResult.success && !mlPredictionResult.success) {
    return {
      success: true,
      confidence: 'low',
      estimate: similarOrdersResult.estimate || mlPredictionResult.estimate,
      method: 'default'
    };
  }
  
  // Benzer sipariş yaklaşımı güvenilirse onu kullan
  if (similarOrdersResult.confidence === 'high' && similarOrdersResult.success) {
    return similarOrdersResult;
  }
  
  // ML yaklaşımı varsa ve benzer siparişler düşük güvenliyse ML sonucunu kullan
  if (mlPredictionResult.success && similarOrdersResult.confidence === 'low') {
    return mlPredictionResult;
  }
  
  // Her iki yaklaşımı birleştir
  const similarEstimate = similarOrdersResult.success ? similarOrdersResult.estimate.totalDays : 0;
  const mlEstimate = mlPredictionResult.success ? mlPredictionResult.estimate.totalDays : 0;
  
  // Benzer sipariş yaklaşımına daha fazla ağırlık ver
  const similarWeight = similarOrdersResult.confidence === 'medium' ? 0.7 : 0.3;
  const mlWeight = 1 - similarWeight;
  
  let combinedDays;
  if (similarEstimate > 0 && mlEstimate > 0) {
    combinedDays = Math.ceil((similarEstimate * similarWeight) + (mlEstimate * mlWeight));
  } else if (similarEstimate > 0) {
    combinedDays = similarEstimate;
  } else {
    combinedDays = mlEstimate;
  }
  
  // Departman bazında süre tahminleri
  const departmentTimelines = calculateDepartmentTimelines(combinedDays);
  
  // Sonuçları döndür
  return {
    success: true,
    confidence: Math.max(
      confideceLevel(similarOrdersResult.confidence), 
      confideceLevel(mlPredictionResult.confidence)
    ) >= 2 ? 'medium' : 'low',
    estimate: {
      totalDays: combinedDays,
      startDate: new Date(),
      completionDate: getDaysLaterDate(combinedDays),
      departmentTimelines,
      totalHours: combinedDays * 8
    },
    similarOrders: similarOrdersResult.similarOrders || [],
    method: 'combined'
  };
}

/**
 * Mevcut üretim programını analiz eder
 */
async function analyzeProductionSchedule(estimate) {
  try {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    // Departman bazında mevcut iş yükünü getir
    const departmentWorkload = await prisma.productionTask.groupBy({
      by: ['department', 'startDate'],
      _count: {
        id: true
      },
      where: {
        status: { not: 'COMPLETED' },
        startDate: {
          gte: today,
          lte: nextMonth
        }
      }
    });
    
    // Departman kapasiteleri (günlük maksimum görev sayısı)
    const departmentCapacities = {
      'ENGINEERING': 3,
      'ASSEMBLY': 2,
      'TESTING': 2,
      'PACKAGING': 2
    };
    
    // Günlere göre departman yüklerini hesapla
    const dailyLoads = {};
    departmentWorkload.forEach(item => {
      const date = new Date(item.startDate).toISOString().split('T')[0];
      const dept = item.department;
      
      if (!dailyLoads[date]) {
        dailyLoads[date] = {};
      }
      
      dailyLoads[date][dept] = item._count.id;
    });
    
    // En uygun başlangıç tarihini hesapla
    let bestStartDate = today;
    let earliestStartDept = estimate.departmentTimelines[0]?.department || 'ENGINEERING';
    let minConflicts = Number.MAX_SAFE_INTEGER;
    
    // 30 günlük bir pencerede tarama yap
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      // Bu tarihteki yük
      const conflicts = calculateDepartmentConflicts(checkDate, estimate.departmentTimelines, dailyLoads, departmentCapacities);
      
      // Daha az çakışma varsa bu tarihi kaydet
      if (conflicts < minConflicts) {
        minConflicts = conflicts;
        bestStartDate = new Date(checkDate);
      }
      
      // Eğer hiç çakışma yoksa hemen bu tarihi seç ve döngüyü sonlandır
      if (conflicts === 0) {
        break;
      }
    }
    
    // Önerilen üretim takvimi
    const schedule = createProductionSchedule(bestStartDate, estimate.departmentTimelines);
    
    // Analiz sonuçları
    return {
      recommendedStartDate: bestStartDate,
      potentialConflicts: minConflicts,
      estimatedEndDate: schedule[schedule.length - 1].endDate,
      schedule,
      departmentLoads: Object.keys(departmentCapacities).map(dept => {
        const load = calculateDepartmentLoad(dept, dailyLoads);
        return {
          department: dept,
          currentLoad: load.currentLoad,
          capacity: load.totalCapacity,
          utilizationRate: load.utilizationRate
        };
      }),
      workloadStatus: minConflicts === 0 ? 'optimal' : minConflicts < 3 ? 'acceptable' : 'congested'
    };
  } catch (error) {
    logError('Schedule analysis failed', { error }, 'error');
    return {
      recommendedStartDate: new Date(),
      schedule: estimate.departmentTimelines.map(dept => ({
        ...dept,
        startDate: new Date(),
        endDate: getDaysLaterDate(dept.days)
      })),
      workloadStatus: 'unknown',
      error: error.message
    };
  }
}

/**
 * Makine öğrenmesi modelini eğit
 */
export async function trainModel() {
  if (trainingInProgress) {
    return { 
      success: false, 
      message: 'Training already in progress', 
      lastTrainingDate 
    };
  }
  
  trainingInProgress = true;
  
  try {
    logInfo('Starting production time model training');
    
    // 1. Eğitim verisini topla
    const trainingData = await collectTrainingData();
    
    if (trainingData.features.length < 10) {
      trainingInProgress = false;
      return { 
        success: false, 
        message: 'Insufficient training data. Need at least 10 completed orders.' 
      };
    }
    
    // 2. Yapay sinir ağı modelini oluştur
    const model = createModel(trainingData.features[0].length);
    
    // 3. Modeli eğit
    const { history, evalResults } = await trainModelWithData(model, trainingData);
    
    // 4. Modeli kaydet
    await model.save('file://./model/production_time_model');
    
    // 5. Model metriklerini güncelle
    lastTrainingDate = new Date();
    modelAccuracy = evalResults.accuracy;
    
    trainingInProgress = false;
    
    return {
      success: true,
      message: 'Model training completed successfully',
      metrics: {
        samplesCount: trainingData.features.length,
        accuracy: evalResults.accuracy,
        loss: evalResults.loss,
        lastTrainingDate
      }
    };
  } catch (error) {
    trainingInProgress = false;
    logError('Model training failed', { error }, 'error');
    return { 
      success: false, 
      message: 'Training failed: ' + error.message
    };
  }
}

/**
 * Eğitim için veri topla
 */
async function collectTrainingData() {
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
        where: {
          status: 'COMPLETED'
        }
      }
    }
  });
  
  // Özellik ve hedef değerlerini ayır
  const features = [];
  const targets = [];
  
  completedOrders.forEach(order => {
    // Üretim süresini hesapla
    if (order.productionTasks.length > 0) {
      const startDates = order.productionTasks.map(task => new Date(task.startDate));
      const completionDates = order.productionTasks.map(task => 
        task.completedAt ? new Date(task.completedAt) : new Date(task.dueDate)
      );
      
      const earliestStart = new Date(Math.min(...startDates));
      const latestCompletion = new Date(Math.max(...completionDates));
      
      const productionDays = Math.ceil((latestCompletion - earliestStart) / (1000 * 60 * 60 * 24));
      
      // Mantıklı bir süre ise veri setine ekle
      if (productionDays > 0 && productionDays < 60) {
        const orderFeatures = extractFeatures(order, order.materials);
        features.push(orderFeatures);
        targets.push(productionDays);
      }
    }
  });
  
  return { features, targets };
}

/**
 * Yapay sinir ağı modelini oluştur
 */
function createModel(inputSize) {
  const model = tf.sequential();
  
  // Giriş katmanı
  model.add(tf.layers.dense({
    inputShape: [inputSize],
    units: MODEL_PARAMS.hiddenLayers[0],
    activation: 'relu'
  }));
  
  // Gizli katmanlar
  for (let i = 1; i < MODEL_PARAMS.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: MODEL_PARAMS.hiddenLayers[i],
      activation: 'relu'
    }));
  }
  
  // Çıkış katmanı
  model.add(tf.layers.dense({ units: 1 }));
  
  // Modeli derle
  model.compile({
    optimizer: tf.train.adam(MODEL_PARAMS.learningRate),
    loss: 'meanSquaredError',
    metrics: ['mse']
  });
  
  return model;
}

/**
 * Modeli eğitim verileriyle eğit
 */
async function trainModelWithData(model, trainingData) {
  // Tensörlere dönüştür
  const xs = tf.tensor2d(trainingData.features);
  const ys = tf.tensor1d(trainingData.targets);
  
  // Veriyi eğitim ve validasyon olarak böl
  const splitIdx = Math.floor(trainingData.features.length * 0.8);
  const trainXs = xs.slice([0, 0], [splitIdx, trainingData.features[0].length]);
  const trainYs = ys.slice([0], [splitIdx]);
  const valXs = xs.slice([splitIdx, 0], [-1, trainingData.features[0].length]);
  const valYs = ys.slice([splitIdx], [-1]);
  
  // Modeli eğit
  const history = await model.fit(trainXs, trainYs, {
    epochs: MODEL_PARAMS.epochs,
    batchSize: MODEL_PARAMS.batchSize,
    validationData: [valXs, valYs],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss = ${logs.loss}, val_loss = ${logs.val_loss}`);
        }
      }
    }
  });
  
  // Değerlendirme metrikleri
  const evalResults = model.evaluate(valXs, valYs);
  const loss = evalResults[0].dataSync()[0];
  
  // Model doğruluğunu hesapla (RMSE'yi ortalama üretim süresine göre normalleştir)
  const avgProductionDays = trainingData.targets.reduce((a, b) => a + b, 0) / trainingData.targets.length;
  const rmse = Math.sqrt(loss);
  const accuracy = Math.max(0, 1 - (rmse / avgProductionDays));
  
  // Belleği temizle
  tf.dispose([xs, ys, trainXs, trainYs, valXs, valYs, ...evalResults]);
  
  return {
    history: history.history,
    evalResults: {
      loss,
      rmse,
      accuracy
    }
  };
}

/**
 * Özellik çıkarımı
 */
function extractFeatures(order, materials) {
  // 1. Malzeme kategorilerine göre sayılar
  const materialCounts = {};
  let totalMaterials = 0;
  
  materials.forEach(material => {
    const category = material.material?.category || 'uncategorized';
    materialCounts[category] = (materialCounts[category] || 0) + material.quantity;
    totalMaterials += material.quantity;
  });
  
  // 2. Karmaşıklık faktörü
  const complexityFactors = {
    'low': 0.5,
    'medium': 1.0,
    'high': 1.5
  };
  const complexity = complexityFactors[order.complexity || 'medium'];
  
  // 3. Öncelik faktörü
  const priorityFactors = {
    'low': 0.8,
    'normal': 1.0,
    'high': 1.2,
    'urgent': 1.5
  };
  const priority = priorityFactors[order.priority || 'normal'];
  
  // 4. Teknik özellikler faktörü
  const techSpecsCount = order.technicalSpecs ? Object.keys(order.technicalSpecs).length : 0;
  
  // 5. Sık kullanılan kategoriler
  const commonCategories = ['ELECTRONIC', 'MECHANICAL', 'BATTERY', 'CASING', 'INTERFACE', 'MISC'];
  
  // 6. Özellik vektörünü oluştur
  const features = [
    totalMaterials,
    complexity,
    priority,
    techSpecsCount,
    ...commonCategories.map(cat => materialCounts[cat] || 0)
  ];
  
  return features;
}

/**
 * Departman bazında zaman çizelgesi hesapla
 */
function calculateDepartmentTimelines(totalDays) {
  // Departman süre oranları
  const departmentRatios = {
    'ENGINEERING': 0.25,
    'ASSEMBLY': 0.4,
    'TESTING': 0.25,
    'PACKAGING': 0.1
  };
  
  const timelines = [];
  
  for (const [dept, ratio] of Object.entries(departmentRatios)) {
    const deptDays = Math.max(1, Math.ceil(totalDays * ratio));
    
    timelines.push({
      department: dept,
      days: deptDays,
      hours: deptDays * 8 // Günde 8 saat çalışma varsayımı
    });
  }
  
  return timelines;
}

/**
 * Departman çakışmalarını hesapla
 */
function calculateDepartmentConflicts(startDate, departmentTimelines, dailyLoads, departmentCapacities) {
  let totalConflicts = 0;
  let currentDate = new Date(startDate);
  
  for (const timeline of departmentTimelines) {
    const dept = timeline.department;
    const capacity = departmentCapacities[dept] || 1;
    
    // Bu departmandaki çalışma günlerini kontrol et
    for (let day = 0; day < timeline.days; day++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const currentLoad = (dailyLoads[dateStr] && dailyLoads[dateStr][dept]) || 0;
      
      // Kapasite aşımı varsa çakışma sayısını artır
      if (currentLoad >= capacity) {
        totalConflicts++;
      }
      
      // Sonraki güne geç
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Departman değişimi için tarihi sıfırla
    currentDate = new Date(startDate);
  }
  
  return totalConflicts;
}

/**
 * Departman iş yükünü hesapla
 */
function calculateDepartmentLoad(department, dailyLoads) {
  let currentLoad = 0;
  let totalCapacity = 0;
  
  // Günlük yükleri topla
  for (const dateStr in dailyLoads) {
    if (dailyLoads[dateStr][department]) {
      currentLoad += dailyLoads[dateStr][department];
    }
    totalCapacity++;
  }
  
  return {
    currentLoad,
    totalCapacity,
    utilizationRate: totalCapacity > 0 ? currentLoad / totalCapacity : 0
  };
}

/**
 * Üretim takvimini oluştur
 */
function createProductionSchedule(startDate, departmentTimelines) {
  const schedule = [];
  
  departmentTimelines.forEach((timeline, index) => {
    // Her departman için başlangıç ve bitiş tarihleri
    const deptStartDate = new Date(startDate);
    
    // Diğer departmanlar için başlangıç tarihini ayarla
    if (index > 0) {
      // Önceki departmanın tamamlanma tarihinden başla
      const previousEndDate = schedule[index - 1].endDate;
      deptStartDate.setTime(previousEndDate.getTime());
    }
    
    const deptEndDate = new Date(deptStartDate);
    deptEndDate.setDate(deptEndDate.getDate() + timeline.days - 1);
    
    schedule.push({
      ...timeline,
      startDate: new Date(deptStartDate),
      endDate: new Date(deptEndDate)
    });
  });
  
  return schedule;
}

/**
 * Varsayılan tahmin değerleri
 */
function getDefaultEstimate(orderData) {
  const totalDays = 14; // Varsayılan 14 gün
  
  return {
    totalDays,
    startDate: new Date(),
    completionDate: getDaysLaterDate(totalDays),
    departmentTimelines: calculateDepartmentTimelines(totalDays),
    totalHours: totalDays * 8
  };
}

/**
 * Belirli bir gün sonrasının tarihini hesapla
 */
function getDaysLaterDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Güven seviyesini sayısal değere çevir
 */
function confideceLevel(confidence) {
  switch (confidence) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

export default {
  predictProductionTime,
  trainModel,
  getDefaultEstimate,
  trainingStatus: () => ({
    isTraining: trainingInProgress,
    lastTrainingDate,
    modelAccuracy
  })
};
