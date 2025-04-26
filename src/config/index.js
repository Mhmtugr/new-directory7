/**
 * Uygulama Yapılandırması
 * Varsayılan değerleri ve .env dosyalarından gelen değerleri birleştirir.
 */

// Varsayılan yapılandırma değerleri
const defaults = {
  appName: "MehmetEndüstriyelTakip",
  version: "2.0.0", // Sürümü güncelleyelim
  // Ortamı import.meta.env.MODE'dan alacağız
  apiUrl: '/api', // Varsayılan olarak göreceli yol
  useLocalStorage: true,
  debugMode: import.meta.env.DEV, // Geliştirme modunda debug aktif

  // AI Yapılandırması (API Anahtarı .env'den gelmeli)
  ai: {
    enabled: true,
    geminiApiKey: null, // .env'den VITE_GEMINI_API_KEY olarak okunacak
    modelName: 'gemini-1.5-pro-latest', // .env'den VITE_AI_MODEL_NAME olarak okunacak
    temperature: 0.7,
    maxTokens: 1500,
    systemPrompt: `
      Sen MehmetEndüstriyelTakip sisteminin yapay zeka asistanısın.
      Orta Gerilim Hücre Üretim Takip Sistemi hakkında uzman bir asistan olarak görev yapıyorsun.
      Her zaman doğru, net ve teknik bilgileri içeren yanıtlar vermelisin.
      Sistemdeki sipariş durumları, malzeme stokları ve teknik dokümantasyon hakkında detaylı bilgi sahibisin.
      Eğer sorular net değilse, daha net bilgi iste ve kullanıcıyı yönlendir.
    `
  },

  // Firebase Yapılandırması (Anahtarlar .env'den gelmeli)
  firebase: {
    apiKey: null,           // .env ->    VITE_FIREBASE_API_KEY
    authDomain: null,       // .env -> VITE_FIREBASE_AUTH_DOMAIN
    projectId: null,        // .env -> VITE_FIREBASE_PROJECT_ID
    storageBucket: null,    // .env -> VITE_FIREBASE_STORAGE_BUCKET
    messagingSenderId: null,// .env -> VITE_FIREBASE_MESSAGING_SENDER_ID
    appId: null,            // .env -> VITE_FIREBASE_APP_ID
    measurementId: null     // .env -> VITE_FIREBASE_MEASUREMENT_ID (Opsiyonel)
  },

  // Loglama Yapılandırması
  log: {
    level: import.meta.env.PROD ? 'WARN' : 'DEBUG', // Prod'da WARN, dev'de DEBUG
    enableConsole: true,
    enableMemory: !import.meta.env.PROD,
    maxMemoryEntries: 500,
    remote: {
        enabled: false,
        url: null,
        level: 'WARN'
    }
  },
  
  // Demo Modu (Otomatik olarak geliştirme ortamında aktif)
  useDemoMode: import.meta.env.DEV 
};

// .env dosyasından gelen değerleri oku ve birleştir
const config = {
  ...defaults,
  environment: import.meta.env.MODE || 'development',
  apiUrl: import.meta.env.VITE_API_URL || defaults.apiUrl,
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true' || defaults.debugMode,
  useDemoMode: import.meta.env.VITE_DEMO_MODE === 'true' || defaults.useDemoMode,
  
  ai: {
      ...defaults.ai,
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || defaults.ai.geminiApiKey,
      modelName: import.meta.env.VITE_AI_MODEL_NAME || defaults.ai.modelName,
      // Diğer AI ayarları da .env'den okunabilir
  },
  
  firebase: {
      ...defaults.firebase,
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaults.firebase.apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaults.firebase.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaults.firebase.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaults.firebase.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaults.firebase.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || defaults.firebase.appId,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaults.firebase.measurementId,
  },
  
  log: {
    ...defaults.log,
    level: import.meta.env.VITE_LOG_LEVEL || defaults.log.level,
    remote: {
        ...defaults.log.remote,
        enabled: import.meta.env.VITE_REMOTE_LOGGING_ENABLED === 'true' || defaults.log.remote.enabled,
        url: import.meta.env.VITE_REMOTE_LOGGING_URL || defaults.log.remote.url,
        level: import.meta.env.VITE_REMOTE_LOGGING_LEVEL || defaults.log.remote.level,
    }
  }
  // R3'teki modules etkinleştirme durumu kaldırıldı, bu genellikle router veya özellik bayrakları ile yönetilir.
};

// Yapılandırmayı dondurarak değiştirilmesini engelle (isteğe bağlı)
// Object.freeze(config);

export default config; 