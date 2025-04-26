/**
 * AI Chatbot Servis Katmanı
 * METS uygulaması için AI sohbet asistanı servisi
 */

import { ref } from 'vue';
import { useAuthStore, useNotificationStore, useTechnicalStore } from '@/store';
import { useToast } from '@/composables/useToast';
import logger from '@/utils/logger'; // Düzeltildi: named import yerine default import kullanıldı

// Pinia store referansları
let authStore;
let notificationStore;
let technicalStore;

// Tost bildirimleri için composable
let toast;

// AI durumunu izlemek için reakif değişkenler
const isConnected = ref(false);
const isProcessing = ref(false);
const currentMode = ref('normal'); // normal, advanced, learning
const supportedLanguages = ref(['tr', 'en']);
const currentLanguage = ref('tr');
const hasNewSuggestion = ref(false);

// Öğrenme modu durumu
const learningMode = ref(false);

// Chat geçmişi
const chatHistory = ref([]);

// AI asistanına ait bilgiler
const assistantInfo = {
  name: 'METS AI',
  version: '1.0.0',
  capabilities: [
    'Üretim planlaması',
    'Stok tahmini',
    'Sipariş analizi',
    'Verimlilik önerileri',
    'Teknik destek',
    'Rapor oluşturma'
  ],
  feedbackScore: 4.7
};

// Kullanılabilir AI modları
const aiModes = [
  { id: 'normal', name: 'Normal Mod', icon: 'bi-chat' },
  { id: 'advanced', name: 'Gelişmiş Mod', icon: 'bi-gear' },
  { id: 'learning', name: 'Öğrenme Modu', icon: 'bi-lightbulb' },
  { id: 'report', name: 'Rapor Modu', icon: 'bi-file-earmark-bar-graph' }
];

/**
 * Store ve composable'ları başlat
 */
const initializeStores = () => {
  if (!authStore) authStore = useAuthStore();
  if (!notificationStore) notificationStore = useNotificationStore();
  if (!technicalStore) technicalStore = useTechnicalStore();
  if (!toast) toast = useToast();
};

/**
 * AI servisini başlatır ve bağlantıyı kurar
 * @returns {Promise<boolean>} Bağlantı durumu
 */
const initializeAI = async () => {
  if (isConnected.value) return true;
  
  try {
    // Gerçek bir AI servisi buraya entegre edilebilir
    // Şimdilik mock bağlantı simüle ediliyor
    isProcessing.value = true;
    
    // Store ve composable'ları başlat
    initializeStores();
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Bağlantı simülasyonu

    // AI modunu kullanıcının yetkisine göre ayarla
    const userRole = authStore.userRole || 'user';
    currentMode.value = userRole === 'admin' || userRole === 'technical' ? 'advanced' : 'normal';
    
    isConnected.value = true;
    isProcessing.value = false;
    
    // AI modülü için state güncellemesi
    if (technicalStore) {
      technicalStore.setAIStatus({ connected: true, mode: currentMode.value });
    }
    
    return true;
  } catch (error) {
    logger.error('AI servisi başlatılamadı:', error);
    isProcessing.value = false;
    
    toast.error('AI asistanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.');
    return false;
  }
};

/**
 * AI asistanı ile mesajlaşma
 * @param {string} message - Kullanıcı mesajı
 * @param {object} context - İsteğe bağlı kontekst bilgisi (sipariş, ürün vb.)
 * @returns {Promise<object>} AI yanıtı
 */
const sendMessage = async (message, context = {}) => {
  if (!isConnected.value) {
    const connected = await initializeAI();
    if (!connected) throw new Error('AI servisi bağlı değil');
  }
  
  try {
    isProcessing.value = true;
    
    // Store'ları başlat
    initializeStores();
    
    // Yeni mesaj ID'si oluştur
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Kullanıcı mesajını geçmişe ekle
    const userMessage = {
      id: messageId,
      sender: 'user',
      text: message,
      timestamp: new Date()
    };
    chatHistory.value.push(userMessage);
    
    // Kullanıcı mesaj geçmişini güncelle
    if (technicalStore) {
      technicalStore.addUserMessage({ text: message, timestamp: new Date() });
    }
    
    // Gerçek bir AI API'si burada entegre edilebilir
    // Şimdilik basit bir simülasyon yapılıyor
    await new Promise(resolve => setTimeout(resolve, 1500)); // İşlem simülasyonu
    
    // Cevap oluştur
    const aiResponse = generateAIResponse(message, context);
    
    // Yanıtı chat geçmişine ekle
    const aiMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: 'ai',
      text: aiResponse.text,
      timestamp: aiResponse.timestamp,
      mode: currentMode.value,
      suggestions: aiResponse.suggestions || []
    };
    
    if (aiResponse.additionalData) {
      aiMessage.additionalData = aiResponse.additionalData;
    }
    
    // Chat geçmişine ekle
    chatHistory.value.push(aiMessage);
    
    // AI yanıtını store'a ekle
    if (technicalStore) {
      technicalStore.addAIResponse(aiResponse);
    }
    
    // Eğer öneri varsa, öneri bayrağını ayarla
    if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
      hasNewSuggestion.value = true;
    }
    
    isProcessing.value = false;
    return aiResponse;
  } catch (error) {
    logger.error('AI mesajı işlenirken hata:', error);
    isProcessing.value = false;
    
    toast.error('Mesajınız işlenirken bir hata oluştu.');
    throw error;
  }
};

/**
 * AI modunu değiştirir
 * @param {string} mode - AI modu ('normal', 'advanced', 'learning', 'report')
 * @returns {boolean} İşlem başarı durumu
 */
const setMode = (mode) => {
  if (!aiModes.some(m => m.id === mode)) {
    logger.error('Geçersiz AI modu:', mode);
    return false;
  }
  
  try {
    currentMode.value = mode;
    
    // Store'ları başlat
    initializeStores();
    
    // Eğer store varsa, store'u güncelle
    if (technicalStore) {
      technicalStore.setAIStatus({ mode });
    }
    
    toast?.info(`AI asistanı ${getModeDisplayName(mode)} moduna geçirildi.`);
    return true;
  } catch (error) {
    logger.error('AI modu değiştirilirken hata:', error);
    return false;
  }
};

/**
 * AI dil ayarını değiştirir
 * @param {string} language - Dil kodu ('tr', 'en')
 * @returns {boolean} İşlem başarı durumu
 */
const setLanguage = (language) => {
  if (!supportedLanguages.value.includes(language)) {
    logger.error('Desteklenmeyen dil:', language);
    return false;
  }
  
  try {
    currentLanguage.value = language;
    return true;
  } catch (error) {
    logger.error('AI dili değiştirilirken hata:', error);
    return false;
  }
};

/**
 * Chat geçmişini temizler
 */
const clearChatHistory = () => {
  chatHistory.value = [];
  
  // Store'ları başlat
  initializeStores();
  
  // Store'u da temizle
  if (technicalStore) {
    technicalStore.clearAIMessages();
  }
};

/**
 * AI öğrenme modunu açar/kapatır
 * @param {boolean} enable - Öğrenme modunu aktif etme durumu
 */
const setLearningMode = (enable) => {
  learningMode.value = enable;
  
  // Öğrenme modu açıksa, AI modunu learning yap
  if (enable) {
    setMode('learning');
  } else {
    // Öğrenme modu kapalıysa, önceki moda geri dön
    setMode('normal');
  }
};

/**
 * AI tarafından otomatik rapor oluşturur
 * @param {string} reportType - Rapor tipi ('production', 'inventory', 'orders', 'efficiency')
 * @param {object} params - Rapor parametreleri
 * @returns {Promise<object>} Oluşturulan rapor
 */
const generateReport = async (reportType, params = {}) => {
  if (!isConnected.value) {
    const connected = await initializeAI();
    if (!connected) throw new Error('AI servisi bağlı değil');
  }
  
  try {
    isProcessing.value = true;
    
    // Store'ları başlat
    initializeStores();
    
    // Rapor oluşturma için AI simülasyonu
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const report = createMockReport(reportType, params);
    
    // Rapor oluşturma başarılı
    isProcessing.value = false;
    toast.success('Rapor başarıyla oluşturuldu');
    
    return report;
  } catch (error) {
    logger.error(`${reportType} raporu oluşturulurken hata:`, error);
    isProcessing.value = false;
    toast.error('Rapor oluşturulurken bir hata meydana geldi');
    throw error;
  }
};

/**
 * AI öğrenme modülünü çalıştırır - belirli verileri öğrenmesini sağlar
 * @param {Array} dataset - Öğrenilecek veri seti
 * @param {string} dataType - Veri tipi ('orders', 'production', 'materials')
 * @returns {Promise<object>} Öğrenme sonucu
 */
const trainAI = async (dataset, dataType) => {
  if (!isConnected.value) {
    await initializeAI();
  }
  
  if (currentMode.value !== 'learning') {
    setMode('learning');
  }
  
  try {
    isProcessing.value = true;
    
    // Store'ları başlat
    initializeStores();
    
    // Öğrenme simülasyonu
    const totalItems = dataset.length;
    let processedItems = 0;
    
    // İlerleme güncellemesi için callback
    const updateProgress = (processed) => {
      processedItems = processed;
      
      if (technicalStore) {
        technicalStore.updateAILearningProgress({
          total: totalItems,
          processed: processedItems,
          percentage: Math.round((processedItems / totalItems) * 100)
        });
      }
    };
    
    // Öğrenme döngüsü simülasyonu
    for (let i = 0; i < totalItems; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProgress(i + 1);
    }
    
    isProcessing.value = false;
    
    const result = {
      success: true,
      itemsProcessed: totalItems,
      insights: generateMockInsights(dataType, dataset),
      completionDate: new Date()
    };
    
    // Öğrenme tamamlandıktan sonra normal moda geç
    setMode('advanced');
    
    toast.success(`${dataType} verilerinin analizi ve öğrenme süreci tamamlandı`);
    return result;
    
  } catch (error) {
    logger.error('AI öğrenme sürecinde hata:', error);
    isProcessing.value = false;
    setMode('normal');
    
    toast.error('Öğrenme süreci sırasında bir hata oluştu');
    throw error;
  }
};

/**
 * Öğrenme modunun durumunu döndürür
 * @returns {boolean} Öğrenme modu durumu
 */
const getLearningMode = () => {
  return learningMode.value;
};

/**
 * Mevcut AI modunu döndürür
 * @returns {string} Mevcut AI modu
 */
const getCurrentMode = () => {
  return currentMode.value;
};

/**
 * Tüm AI modlarını döndürür
 * @returns {Array} AI modları listesi
 */
const getModes = () => {
  return aiModes;
};

/**
 * Chat geçmişini döndürür
 * @returns {Array} Chat geçmişi
 */
const getChatHistory = () => {
  return chatHistory.value;
};

/**
 * AI'nin yardım önerilerini temizler
 */
const clearSuggestions = () => {
  hasNewSuggestion.value = false;
};

/**
 * AI moduna göre ekran adı döndürür
 * @param {string} mode - AI modu
 * @returns {string} Görüntülenecek mod adı
 */
const getModeDisplayName = (mode) => {
  const modeNames = {
    normal: 'Normal',
    advanced: 'Gelişmiş',
    learning: 'Öğrenme',
    report: 'Rapor'
  };
  
  return modeNames[mode] || 'Bilinmeyen';
};

/**
 * Kullanıcı mesajına göre AI yanıtı oluşturur
 * @private
 * @param {string} message - Kullanıcı mesajı
 * @param {object} context - Kontekst bilgisi
 * @returns {object} AI yanıtı
 */
const generateAIResponse = (message, context) => {
  // Basit bir mesaj eşleştirici yapılabilir
  const lowercaseMsg = message.toLowerCase();
  
  // Farklı mesaj kalıplarına göre yanıtlar
  let response = {
    text: 'Üzgünüm, ne demek istediğinizi anlayamadım. Lütfen daha açık bir şekilde sorunuzu ifade edebilir misiniz?',
    timestamp: new Date(),
    suggestions: []
  };
  
  // Sipariş ile ilgili sorular
  if (lowercaseMsg.includes('sipariş') || lowercaseMsg.includes('order')) {
    response = {
      text: 'Siparişleriniz hakkında bilgi almak için, sipariş numarasını veya müşteri adını belirtmeniz gerekiyor. Yardımcı olabilir miyim?',
      timestamp: new Date(),
      suggestions: [
        'Son siparişleri göster',
        'Geciken siparişleri listele',
        'Yarınki teslimatları göster'
      ]
    };
    
    // Eğer sipariş konteksti varsa daha spesifik yanıt
    if (context.orderId) {
      response.text = `${context.orderId} numaralı sipariş hakkında bilgi almak istediniz. Bu sipariş ${Math.random() > 0.5 ? 'hazırlanıyor' : 'sevkiyatta'} durumunda.`;
    }
  }
  
  // Üretim ile ilgili sorular
  else if (lowercaseMsg.includes('üretim') || lowercaseMsg.includes('production')) {
    response = {
      text: 'Üretim planlaması ve durumu hakkında yardımcı olabilirim. Hangi tarih veya dönem hakkında bilgi almak istersiniz?',
      timestamp: new Date(),
      suggestions: [
        'Bugünkü üretim durumunu göster',
        'Bu haftaki üretim planını göster',
        'Üretim verimliliğini analiz et'
      ]
    };
  }
  
  // Stok ile ilgili sorular
  else if (lowercaseMsg.includes('stok') || lowercaseMsg.includes('inventory') || lowercaseMsg.includes('malzeme')) {
    response = {
      text: 'Stok durumu ve malzemeler hakkında bilgi verebilirim. Hangi malzeme veya kategori hakkında bilgi almak istersiniz?',
      timestamp: new Date(),
      suggestions: [
        'Kritik stok seviyesindeki malzemeleri göster',
        'En çok kullanılan malzemelerin stok durumunu kontrol et',
        'Stok tahmin raporu oluştur'
      ]
    };
  }
  
  // Genel yardım
  else if (lowercaseMsg.includes('yardım') || lowercaseMsg.includes('help')) {
    response = {
      text: `Merhaba, ben ${assistantInfo.name}. Size nasıl yardımcı olabilirim?`,
      timestamp: new Date(),
      suggestions: assistantInfo.capabilities.map(cap => `${cap} konusunda yardım et`)
    };
  }
  
  // Gelişmiş mod özel yanıtları
  if (currentMode.value === 'advanced' && response.suggestions.length > 0) {
    response.suggestions.push('Detaylı analiz raporu oluştur');
    response.suggestions.push('Verimlilik önerileri göster');
  }
  
  return response;
};

/**
 * Mock rapor oluşturur
 * @private
 * @param {string} reportType - Rapor tipi
 * @param {object} params - Rapor parametreleri
 * @returns {object} Oluşturulan mock rapor
 */
const createMockReport = (reportType, params) => {
  const now = new Date();
  const reportDate = now.toLocaleDateString('tr-TR');
  
  // Baz rapor objesi
  const baseReport = {
    id: `report-${Date.now()}`,
    createdAt: now,
    createdBy: 'AI Assistant',
    format: params.format || 'pdf',
    language: params.language || currentLanguage.value
  };
  
  // Rapora özel alanlar
  switch (reportType) {
    case 'production':
      return {
        ...baseReport,
        title: 'Üretim Performans Raporu',
        description: `${reportDate} tarihli üretim performans analizi`,
        metrics: {
          efficiency: Math.floor(Math.random() * 30) + 70, // 70-100 arası
          completedOrders: Math.floor(Math.random() * 50) + 10,
          delayedOrders: Math.floor(Math.random() * 10),
          averageCycleTime: Math.floor(Math.random() * 60) + 120 // 120-180 dk arası
        },
        recommendations: [
          'Kesim bölümünde iş akışı optimizasyonu yapılmalı',
          'Montaj hattında personel takviyesi yapılabilir',
          'Kalite kontrol süreçleri hızlandırılmalı'
        ]
      };
    
    case 'inventory':
      return {
        ...baseReport,
        title: 'Stok Durum Raporu',
        description: `${reportDate} tarihli stok analizi ve tahminleri`,
        metrics: {
          totalItems: Math.floor(Math.random() * 5000) + 1000,
          lowStockItems: Math.floor(Math.random() * 50) + 5,
          overStockItems: Math.floor(Math.random() * 30) + 10,
          stockValue: Math.floor(Math.random() * 1000000) + 500000
        },
        recommendations: [
          'A kategorisindeki malzemeler için minimum stok seviyesi artırılmalı',
          'B7, C12 kodlu malzemeler için alternatif tedarikçi bulunmalı',
          'D kategorisindeki fazla stoklar eritilmeli'
        ]
      };
      
    case 'orders':
      return {
        ...baseReport,
        title: 'Sipariş Analiz Raporu',
        description: `${reportDate} tarihli sipariş analizi`,
        metrics: {
          totalOrders: Math.floor(Math.random() * 200) + 50,
          completedOrders: Math.floor(Math.random() * 150) + 30,
          pendingOrders: Math.floor(Math.random() * 50) + 10,
          averageOrderValue: Math.floor(Math.random() * 50000) + 10000
        },
        topCustomers: [
          { name: 'ABC Ltd. Şti.', orderCount: Math.floor(Math.random() * 20) + 5 },
          { name: 'XYZ A.Ş.', orderCount: Math.floor(Math.random() * 15) + 3 },
          { name: 'DEF Holding', orderCount: Math.floor(Math.random() * 10) + 2 }
        ],
        recommendations: [
          'Ortalama teslimat süresi %15 kısaltılabilir',
          'Müşteri bazlı özel kampanyalar düzenlenebilir',
          'Tekrarlayan siparişler için otomatik süreç başlatılabilir'
        ]
      };
      
    case 'efficiency':
      return {
        ...baseReport,
        title: 'Verimlilik İyileştirme Raporu',
        description: `${reportDate} tarihli verimlilik analizi ve öneriler`,
        bottlenecks: [
          { process: 'Malzeme Kabulü', efficiency: Math.floor(Math.random() * 30) + 60 },
          { process: 'Kesim İşlemleri', efficiency: Math.floor(Math.random() * 20) + 75 },
          { process: 'Montaj Hattı', efficiency: Math.floor(Math.random() * 10) + 85 }
        ],
        recommendations: [
          'İş istasyonları arası mesafeler optimize edilmeli',
          'Vardiya planlaması gözden geçirilmeli',
          'Personel eğitimleri artırılmalı',
          'Makine bakım periyotları yeniden planlanmalı'
        ],
        potentialSavings: {
          time: Math.floor(Math.random() * 100) + 50, // 50-150 saat/ay
          cost: Math.floor(Math.random() * 50000) + 10000 // 10000-60000 TL/ay
        }
      };
      
    default:
      return {
        ...baseReport,
        title: 'Genel Durum Raporu',
        description: `${reportDate} tarihli genel durum raporu`,
        summary: 'Bu rapor sistemdeki genel durumu özetlemektedir.',
        sections: [
          { name: 'Üretim', status: Math.random() > 0.5 ? 'normal' : 'dikkat' },
          { name: 'Stok', status: Math.random() > 0.7 ? 'normal' : 'kritik' },
          { name: 'Siparişler', status: Math.random() > 0.6 ? 'normal' : 'gecikme' },
          { name: 'Planlama', status: 'normal' }
        ]
      };
  }
};

/**
 * Öğrenilen verilerden mock içgörüler oluşturur
 * @private
 * @param {string} dataType - Veri tipi
 * @param {Array} dataset - Öğrenilen veri seti
 * @returns {Array} Oluşturulan içgörüler
 */
const generateMockInsights = (dataType, dataset) => {
  const insights = [];
  
  // Veri tipine göre farklı içgörüler oluştur
  switch(dataType) {
    case 'orders':
      insights.push('Siparişlerin %68\'i ilk teslim tarihinde karşılanıyor');
      insights.push('Son 30 günde ortalama sipariş değeri %12 arttı');
      insights.push('En çok sipariş verilen ürün kategorisi: Mobilya Aksesuarları');
      insights.push('Siparişlerin %23\'ü İstanbul\'dan geliyor');
      break;
      
    case 'production':
      insights.push('Ortalama üretim döngü süresi 143 dakika');
      insights.push('En verimli hat: Montaj Hattı 2 (%94 verimlilik)');
      insights.push('Kesim departmanında %18 darboğaz tespit edildi');
      insights.push('Fire oranı ortalama %4.2 seviyesinde');
      break;
      
    case 'materials':
      insights.push('5 malzeme kritik stok seviyesinin altında');
      insights.push('B7 kodlu malzemede %32 fazla stok mevcut');
      insights.push('En sık kullanılan malzeme: M12 kodlu bağlantı elemanı');
      insights.push('Ortalama tedarik süresi 8.3 gün');
      break;
      
    default:
      insights.push('Veri setinden önemli bir kalıp tespit edilemedi');
      insights.push('Daha fazla veri ile öğrenme sürecinin tekrarlanması önerilir');
  }
  
  return insights;
};

// Dışa aktarılan özellikler ve fonksiyonlar
export const aiService = {
  // Durum ve bilgiler
  isConnected,
  isProcessing,
  currentMode,
  supportedLanguages,
  currentLanguage,
  hasNewSuggestion,
  assistantInfo,
  
  // Fonksiyonlar
  initialize: initializeAI,
  sendMessage,
  setMode,
  setLanguage,
  generateReport,
  trainAI,
  clearSuggestions,
  
  // Yardımcı fonksiyonlar
  getModeDisplayName,
  
  // Yeni eklenen fonksiyonlar
  getChatHistory,
  clearChatHistory,
  getLearningMode,
  setLearningMode,
  getCurrentMode,
  getModes
};