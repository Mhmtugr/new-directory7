/**
 * Üretim ve stok verileri için tahmin algoritmaları
 */
import * as tf from '@tensorflow/tfjs-node';

/**
 * Exponential Smoothing tahmin algoritması
 * Zaman serisi verilerinde yakın dönem ağırlıklı tahmin yapar
 * 
 * @param {Array} data - Tarihsel veri dizisi
 * @param {Number} alpha - Düzleştirme faktörü (0-1 arası)
 * @returns {Number} Bir sonraki dönem için tahmin
 */
export function exponentialSmoothing(data, alpha = 0.3) {
  if (!data || data.length === 0) return 0;
  
  let forecast = data[0];
  
  for (let i = 1; i < data.length; i++) {
    forecast = alpha * data[i] + (1 - alpha) * forecast;
  }
  
  return forecast;
}

/**
 * Holt-Winters üçlü üstel düzleştirme
 * Trend ve mevsimsellik içeren zaman serisi verileri için
 * 
 * @param {Array} data - Tarihsel veri dizisi
 * @param {Object} params - Alpha, beta, gamma parametreleri
 * @param {Number} periods - Tahmin edilecek dönem sayısı
 * @returns {Array} Tahmin sonuçları
 */
export function holtWinters(data, params = { alpha: 0.3, beta: 0.1, gamma: 0.2 }, periods = 1, seasonLength = 12) {
  if (!data || data.length < seasonLength * 2) {
    return Array(periods).fill(data.reduce((a, b) => a + b, 0) / data.length || 0);
  }
  
  const { alpha, beta, gamma } = params;
  
  // Başlangıç değerleri
  let level = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  let trend = (data.slice(seasonLength, seasonLength * 2).reduce((a, b) => a + b, 0) / seasonLength - level) / seasonLength;
  
  // Mevsimsellik faktörleri
  const seasonals = Array(seasonLength).fill(0);
  for (let i = 0; i < seasonLength; i++) {
    const sums = [];
    for (let j = 0; i + j * seasonLength < data.length; j++) {
      if (i + j * seasonLength < data.length) {
        sums.push(data[i + j * seasonLength]);
      }
    }
    seasonals[i] = sums.reduce((a, b) => a + b, 0) / sums.length / level;
  }
  
  // Tahminler
  const forecasts = [];
  
  for (let i = 0; i < periods; i++) {
    const m = (i + data.length) % seasonLength;
    const forecast = (level + trend) * seasonals[m];
    forecasts.push(forecast);
    
    if (i < data.length) {
      const observedValue = data[i];
      level = alpha * (observedValue / seasonals[m]) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonals[m] = gamma * (observedValue / level) + (1 - gamma) * seasonals[m];
    }
  }
  
  return forecasts;
}

/**
 * LSTM (Long Short-Term Memory) tahmini
 * Karmaşık zaman serisi verileri için derin öğrenme yaklaşımı
 * 
 * @param {Array} data - Tarihsel veri dizisi
 * @param {Number} futureDays - Tahmin edilecek gün sayısı
 * @returns {Promise<Array>} - Tahmin sonuçları
 */
export async function lstmPredict(data, futureDays = 7) {
  if (!data || data.length < 30) {
    return Array(futureDays).fill(data.reduce((a, b) => a + b, 0) / data.length || 0);
  }
  
  // Verileri normalize et
  const max = Math.max(...data);
  const min = Math.min(...data);
  const normalizedData = data.map(val => (val - min) / (max - min));
  
  // Eğitim verileri hazırla
  const timeSteps = 7;  // Kaç günlük veriyle tahmin yapılacak
  const X = [], y = [];
  
  for (let i = 0; i < normalizedData.length - timeSteps; i++) {
    X.push(normalizedData.slice(i, i + timeSteps));
    y.push(normalizedData[i + timeSteps]);
  }
  
  // Tensor formatına dönüştür
  const xTensor = tf.tensor3d(X, [X.length, timeSteps, 1]);
  const yTensor = tf.tensor2d(y, [y.length, 1]);
  
  // Model oluştur
  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: false,
    inputShape: [timeSteps, 1]
  }));
  model.add(tf.layers.dense({ units: 1 }));
  
  // Model eğitimi için ayarlar
  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError'
  });
  
  // Modeli eğit
  await model.fit(xTensor, yTensor, {
    epochs: 20,
    batchSize: 32,
    shuffle: true,
    verbose: 0
  });
  
  // Tahmin için son verileri al
  let lastData = normalizedData.slice(-timeSteps);
  const predictions = [];
  
  // Gelecek günleri tahmin et
  for (let i = 0; i < futureDays; i++) {
    const input = tf.tensor3d([lastData], [1, timeSteps, 1]);
    const pred = model.predict(input);
    const predValue = pred.dataSync()[0];
    predictions.push(predValue);
    
    // Son veri setini güncelle (en eski veriyi çıkar, yeni tahmini ekle)
    lastData.shift();
    lastData.push(predValue);
  }
  
  // Tahminleri orijinal ölçeğe geri dönüştür
  return predictions.map(val => val * (max - min) + min);
}

/**
 * Üretim döngüsü optimizasyonu
 * Üretim sürelerini analiz ederek en uygun üretim planlamasını hesaplar
 * 
 * @param {Array} tasks - Üretim görevleri listesi
 * @param {Object} constraints - Üretim kısıtları
 * @returns {Object} - Optimum üretim planı
 */
export function optimizeProductionSchedule(tasks, constraints) {
  // Görevleri öncelik ve süreye göre sırala
  const sortedTasks = [...tasks].sort((a, b) => {
    // Önce önceliğe göre sırala
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Sonra teslim tarihine göre sırala
    const deadlineA = new Date(a.deadline).getTime();
    const deadlineB = new Date(b.deadline).getTime();
    return deadlineA - deadlineB;
  });
  
  // Departman kapasitelerini tanımla
  const departmentCapacity = constraints.departmentCapacity || {
    'ENGINEERING': 3, 
    'ASSEMBLY': 2,
    'TESTING': 2,
    'PACKAGING': 4
  };
  
  // Departman bazında görev atama
  const departmentAssignments = {};
  const schedule = [];
  
  // Her departman için başlangıç zamanını şimdiki zaman yap
  const now = new Date();
  const departmentNextAvailable = {};
  Object.keys(departmentCapacity).forEach(dept => {
    departmentAssignments[dept] = [];
    departmentNextAvailable[dept] = Array(departmentCapacity[dept]).fill(now.getTime());
  });
  
  // Her görevi en uygun şekilde atama
  for (const task of sortedTasks) {
    const dept = task.department;
    const duration = task.duration || calculateTaskDuration(task); // Saat cinsinden
    
    // Bu departman için en erken boş zaman slotunu bul
    let earliestTime = Infinity;
    let selectedSlot = 0;
    
    for (let slot = 0; slot < departmentCapacity[dept]; slot++) {
      if (departmentNextAvailable[dept][slot] < earliestTime) {
        earliestTime = departmentNextAvailable[dept][slot];
        selectedSlot = slot;
      }
    }
    
    // Başlangıç ve bitiş zamanlarını ayarla
    const startTime = new Date(earliestTime);
    const endTime = new Date(earliestTime + duration * 60 * 60 * 1000); // Saati milisaniyeye çevir
    
    // Departman için sonraki uygun zamanı güncelle
    departmentNextAvailable[dept][selectedSlot] = endTime.getTime();
    
    // Programı güncelle
    schedule.push({
      ...task,
      scheduledStart: startTime,
      scheduledEnd: endTime,
      slot: selectedSlot
    });
  }
  
  return {
    schedule,
    departmentUtilization: calculateDepartmentUtilization(schedule, departmentCapacity)
  };
}

/**
 * Departman kullanım oranlarını hesapla
 */
function calculateDepartmentUtilization(schedule, departmentCapacity) {
  const utilization = {};
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Her departman için toplam ve planlanan saatleri hesapla
  Object.keys(departmentCapacity).forEach(dept => {
    const totalCapacityHours = departmentCapacity[dept] * 8 * 5; // 8 saat/gün, 5 gün/hafta
    
    const deptTasks = schedule.filter(task => 
      task.department === dept && 
      new Date(task.scheduledStart) < oneWeekLater && 
      new Date(task.scheduledEnd) > now
    );
    
    let plannedHours = 0;
    for (const task of deptTasks) {
      const taskStart = Math.max(now.getTime(), new Date(task.scheduledStart).getTime());
      const taskEnd = Math.min(oneWeekLater.getTime(), new Date(task.scheduledEnd).getTime());
      plannedHours += (taskEnd - taskStart) / (1000 * 60 * 60);
    }
    
    utilization[dept] = {
      totalCapacityHours,
      plannedHours,
      utilizationRate: Math.min(100, (plannedHours / totalCapacityHours) * 100)
    };
  });
  
  return utilization;
}

/**
 * Görev süresini tahmin et
 */
function calculateTaskDuration(task) {
  // Basit bir varsayılan değer
  const defaultDuration = { 
    'ENGINEERING': 24, 
    'ASSEMBLY': 16, 
    'TESTING': 8, 
    'PACKAGING': 4 
  };
  
  return task.estimatedHours || defaultDuration[task.department] || 8;
}

/**
 * Stok seviyesini optimize etme
 * Talep tahmini ve tedarik sürelerine göre optimal stok seviyesini hesaplar
 * 
 * @param {Object} item - Malzeme bilgisi
 * @param {Array} demandHistory - Geçmiş talep verisi
 * @param {Number} leadTime - Tedarik süresi (gün)
 * @returns {Object} - Optimal stok seviyeleri
 */
export function calculateOptimalStock(item, demandHistory, leadTime) {
  // Son 90 günlük ortalama günlük talep
  const avgDailyDemand = demandHistory.slice(-90).reduce((a, b) => a + b, 0) / 90;
  
  // Standart sapma hesapla
  const demandStdDev = calculateStandardDeviation(demandHistory.slice(-90));
  
  // Güvenlik faktörü (Service level %95 için ~1.65)
  const safetyFactor = 1.65;
  
  // Güvenlik stoku = Std. sapma * Güvenlik faktörü * Tedarik süresinin karekökü
  const safetyStock = Math.ceil(demandStdDev * safetyFactor * Math.sqrt(leadTime));
  
  // Yeniden sipariş noktası = Ortalama günlük talep * Tedarik süresi + Güvenlik stoku
  const reorderPoint = Math.ceil(avgDailyDemand * leadTime + safetyStock);
  
  // Ekonomik sipariş miktarı (EOQ) formülü
  // EOQ = sqrt((2 * Yıllık talep * Sipariş maliyeti) / (Birim fiyat * Stok tutma oranı))
  const annualDemand = avgDailyDemand * 365;
  const orderCost = item.orderCost || 50; // TL olarak sipariş maliyeti
  const unitCost = item.unitCost || 10;   // TL olarak birim fiyat
  const holdingRate = 0.25; // Stok tutma oranı (%25)
  
  const economicOrderQuantity = Math.ceil(
    Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingRate))
  );
  
  return {
    safetyStock,
    reorderPoint,
    economicOrderQuantity,
    avgDailyDemand,
    demandVariability: demandStdDev / avgDailyDemand // Değişkenlik katsayısı
  };
}

/**
 * Standart sapma hesaplama
 */
function calculateStandardDeviation(values) {
  if (!values || values.length < 2) return 0;
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export default {
  exponentialSmoothing,
  holtWinters,
  lstmPredict,
  optimizeProductionSchedule,
  calculateOptimalStock
};
