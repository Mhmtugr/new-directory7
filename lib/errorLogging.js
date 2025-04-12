/**
 * METS-R2 Hata Yönetimi ve Loglama Modülü
 * Uygulama hatalarını yönetir, loglar ve gerekirse sunucuya bildirir.
 */

// Hata log seviyesi türleri
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Yerel depolama için store
let errorLogs = [];
const MAX_LOCAL_LOGS = 100;

/**
 * Hata loglamak için ana fonksiyon
 * @param {Error|String} error - Hata nesnesi veya mesajı
 * @param {Object} context - Hata kontekst bilgisi 
 * @param {String} level - Hata seviyesi
 * @returns {String} - Hata referans ID'si
 */
export function logError(error, context = {}, level = LogLevel.ERROR) {
  const timestamp = new Date().toISOString();
  const errorId = generateErrorId();
  
  // Hata nesnesini yapılandır
  const errorObject = {
    id: errorId,
    timestamp,
    level,
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : null,
    context: {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    }
  };
  
  // Konsola log
  logToConsole(errorObject);
  
  // Lokale kaydet
  saveToLocalStorage(errorObject);
  
  // Kritik hataları sunucuya bildir
  if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
    sendToServer(errorObject).catch(e => 
      console.error('Error reporting failed:', e)
    );
  }
  
  return errorId;
}

/**
 * Debug seviyesinde log
 * @param {String} message - Log mesajı
 * @param {Object} context - Kontekst bilgisi
 */
export function logDebug(message, context = {}) {
  logError(message, context, LogLevel.DEBUG);
}

/**
 * Info seviyesinde log
 * @param {String} message - Log mesajı
 * @param {Object} context - Kontekst bilgisi
 */
export function logInfo(message, context = {}) {
  logError(message, context, LogLevel.INFO);
}

/**
 * Warning seviyesinde log
 * @param {String} message - Log mesajı
 * @param {Object} context - Kontekst bilgisi
 */
export function logWarning(message, context = {}) {
  logError(message, context, LogLevel.WARNING);
}

/**
 * Critical seviyesinde log
 * @param {Error|String} error - Hata nesnesi veya mesajı
 * @param {Object} context - Kontekst bilgisi
 */
export function logCritical(error, context = {}) {
  logError(error, context, LogLevel.CRITICAL);
}

/**
 * Global hata yakalayıcı
 * Tüm yakalanmayan React hataları için
 */
export function setupGlobalErrorHandler() {
  if (typeof window !== 'undefined') {
    // Yakalanmayan hataları yakala
    window.onerror = (message, source, lineno, colno, error) => {
      logError(
        error || message, 
        { source, lineno, colno }, 
        LogLevel.ERROR
      );
      
      // Hata yönetimi sonrası normal davranışa devam et
      return false;
    };
    
    // Promise hatalarını yakala
    window.addEventListener('unhandledrejection', (event) => {
      logError(
        event.reason, 
        { type: 'unhandledRejection' }, 
        LogLevel.ERROR
      );
    });
    
    logInfo('Global error handlers initialized');
  }
}

/**
 * Tüm hata loglarını getir
 * @returns {Array} - Hata logları
 */
export function getAllLogs() {
  try {
    const storedLogs = localStorage.getItem('mets_error_logs');
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    console.error('Error retrieving logs:', e);
    return [];
  }
}

/**
 * Hata loglarını temizle
 */
export function clearLogs() {
  try {
    localStorage.removeItem('mets_error_logs');
    errorLogs = [];
  } catch (e) {
    console.error('Error clearing logs:', e);
  }
}

// Yardımcı fonksiyonlar

/**
 * Benzersiz hata ID oluştur
 */
function generateErrorId() {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hatayı konsola logla
 */
function logToConsole(errorObject) {
  const { level, message, context } = errorObject;
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(`[DEBUG] ${message}`, context);
      break;
    case LogLevel.INFO:
      console.info(`[INFO] ${message}`, context);
      break;
    case LogLevel.WARNING:
      console.warn(`[WARNING] ${message}`, context);
      break;
    case LogLevel.ERROR:
      console.error(`[ERROR] ${message}`, context);
      break;
    case LogLevel.CRITICAL:
      console.error(`[CRITICAL] ${message}`, context);
      break;
    default:
      console.log(`[${level}] ${message}`, context);
  }
}

/**
 * Hatayı localStorage'a kaydet
 */
function saveToLocalStorage(errorObject) {
  try {
    // Eski logları yükle
    const storedLogs = localStorage.getItem('mets_error_logs');
    errorLogs = storedLogs ? JSON.parse(storedLogs) : [];
    
    // Yeni log ekle (başa)
    errorLogs.unshift(errorObject);
    
    // Maksimum log sayısını aşmayacak şekilde kırp
    if (errorLogs.length > MAX_LOCAL_LOGS) {
      errorLogs = errorLogs.slice(0, MAX_LOCAL_LOGS);
    }
    
    // Logları kaydet
    localStorage.setItem('mets_error_logs', JSON.stringify(errorLogs));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

/**
 * Hatayı sunucuya gönder
 */
async function sendToServer(errorObject) {
  try {
    const response = await fetch('/api/log/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorObject)
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    console.error('Failed to send error to server:', e);
    // Başarısız olursa hatayı kaydet ve daha sonra tekrar dene
    saveFailedErrorReport(errorObject);
    throw e;
  }
}

/**
 * Başarısız hata raporlarını kaydet
 */
function saveFailedErrorReport(errorObject) {
  try {
    // Başarısız raporları yükle
    const storedReports = localStorage.getItem('mets_failed_error_reports');
    const failedReports = storedReports ? JSON.parse(storedReports) : [];
    
    // Yeni raporu ekle
    failedReports.push({
      ...errorObject,
      reportAttempts: (errorObject.reportAttempts || 0) + 1,
      lastAttempt: new Date().toISOString()
    });
    
    // Kaç tane saklayacağımızı sınırla
    const recentReports = failedReports.slice(-20);
    
    // Kaydet
    localStorage.setItem('mets_failed_error_reports', JSON.stringify(recentReports));
  } catch (e) {
    console.error('Error saving failed report:', e);
  }
}

/**
 * Başarısız hata raporlarını tekrar göndermeyi dene
 */
export async function retrySendingFailedReports() {
  try {
    const storedReports = localStorage.getItem('mets_failed_error_reports');
    if (!storedReports) return { success: true, sent: 0 };
    
    const failedReports = JSON.parse(storedReports);
    if (failedReports.length === 0) return { success: true, sent: 0 };
    
    const results = [];
    const successfulIndices = [];
    
    // Her raporu tekrar gönder
    for (let i = 0; i < failedReports.length; i++) {
      const report = failedReports[i];
      
      try {
        const response = await fetch('/api/log/error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...report,
            reportAttempts: (report.reportAttempts || 0) + 1,
            retryTimestamp: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          successfulIndices.push(i);
          results.push({ id: report.id, success: true });
        } else {
          results.push({ 
            id: report.id, 
            success: false, 
            error: `Server responded with ${response.status}` 
          });
        }
      } catch (error) {
        results.push({ 
          id: report.id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    // Başarılı olanları kaldır
    const updatedReports = failedReports.filter((_, index) => 
      !successfulIndices.includes(index)
    );
    
    // Güncellenen listeyi kaydet
    localStorage.setItem('mets_failed_error_reports', JSON.stringify(updatedReports));
    
    return {
      success: true,
      sent: successfulIndices.length,
      failed: failedReports.length - successfulIndices.length,
      results
    };
  } catch (e) {
    console.error('Error retrying failed reports:', e);
    return { success: false, error: e.message };
  }
}

export default {
  logError,
  logDebug,
  logInfo,
  logWarning,
  logCritical,
  setupGlobalErrorHandler,
  getAllLogs,
  clearLogs,
  retrySendingFailedReports,
  LogLevel
};
