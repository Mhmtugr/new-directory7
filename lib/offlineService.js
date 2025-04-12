    } catch (error) {
      console.error('Offline sync error:', error);
      return { success: false, error };
    }
  }

/**
 * Çevrimdışı aksiyonları kaydet
 * @param {String} actionType - Aksiyon tipi ('create', 'update', 'delete')
 * @param {String} entityType - İşlem yapılan varlık tipi ('order', 'task', 'note', vs)
 * @param {Object} data - İşlem yapılacak veri
 * @returns {Promise<Object>} - Kaydedilen aksiyon bilgisi
 */
export async function saveOfflineAction(actionType, entityType, data) {
  try {
    // Benzersiz bir ID ile aksiyon oluştur
    const action = {
      id: uuidv4(),
      actionType,
      entityType,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    // Aksiyonu çevrimdışı veritabanına kaydet
    await offlineStore.pendingActions.setItem(action.id, action);
    
    console.log('Offline action saved:', action);
    return { success: true, action };
  } catch (error) {
    console.error('Error saving offline action:', error);
    return { success: false, error };
  }
}

/**
 * Çevrimdışı aksiyonları sunucu ile senkronize et
 * @returns {Promise<Object>} - Senkronizasyon sonucu
 */
export async function syncPendingActions() {
  try {
    // Bekleyen aksiyonları al
    let pendingActions = [];
    await offlineStore.pendingActions.iterate((action, key) => {
      if (!action.synced) {
        pendingActions.push({ ...action, key });
      }
    });
    
    if (pendingActions.length === 0) {
      return { success: true, message: 'No pending actions to sync', synced: 0 };
    }
    
    // Bekleyen aksiyonları çevrimiçi olduğunda senkronize et
    const syncResults = [];
    const successfulKeys = [];
    
    for (const action of pendingActions) {
      try {
        // API endpoint belirle
        let endpoint = `/api/${action.entityType}s`;
        let method = 'POST';
        
        if (action.actionType === 'update') {
          endpoint = `/api/${action.entityType}s/${action.data.id}`;
          method = 'PUT';
        } else if (action.actionType === 'delete') {
          endpoint = `/api/${action.entityType}s/${action.data.id}`;
          method = 'DELETE';
        }
        
        // Sunucuya istek gönder
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(action.data)
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        syncResults.push({ id: action.id, success: true, result });
        successfulKeys.push(action.key);
        
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        syncResults.push({ id: action.id, success: false, error: error.message });
      }
    }
    
    // Başarılı olan aksiyonları işaretle
    for (const key of successfulKeys) {
      const action = await offlineStore.pendingActions.getItem(key);
      if (action) {
        action.synced = true;
        action.syncedAt = new Date().toISOString();
        await offlineStore.pendingActions.setItem(key, action);
      }
    }
    
    return { 
      success: true, 
      results: syncResults, 
      totalActions: pendingActions.length,
      synced: successfulKeys.length,
      failed: pendingActions.length - successfulKeys.length
    };
  } catch (error) {
    console.error('Error syncing pending actions:', error);
    return { success: false, error };
  }
}

/**
 * Çevrimdışı veriyi kontrol et
 * @returns {Promise<Boolean>} - Çevrimdışı veri var mı?
 */
export async function hasOfflineData() {
  try {
    const data = await offlineStore.data.getItem('syncData');
    return !!data;
  } catch (error) {
    console.error('Error checking offline data:', error);
    return false;
  }
}

/**
 * Bekleyen işlem sayısını kontrol et
 * @returns {Promise<Number>} - Bekleyen işlem sayısı
 */
export async function getPendingActionsCount() {
  try {
    let count = 0;
    await offlineStore.pendingActions.iterate(value => {
      if (!value.synced) count++;
    });
    return count;
  } catch (error) {
    console.error('Error counting pending actions:', error);
    return 0;
  }
}

/**
 * Çevrimdışı veriyi temizle
 * @returns {Promise<Object>} - Temizleme sonucu
 */
export async function clearOfflineData() {
  try {
    await offlineStore.data.clear();
    await offlineStore.settings.setItem('lastSync', null);
    return { success: true };
  } catch (error) {
    console.error('Error clearing offline data:', error);
    return { success: false, error };
  }
}

/**
 * Önbelleğe alınmış rapor verisini kaydet
 * @param {String} reportId - Rapor ID
 * @param {Object} reportData - Rapor verisi
 * @returns {Promise<Object>} - Kayıt sonucu
 */
export async function cacheReportData(reportId, reportData) {
  try {
    await offlineStore.data.setItem(`report_${reportId}`, {
      ...reportData,
      cachedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error caching report data:', error);
    return { success: false, error };
  }
}

/**
 * Önbelleğe alınmış rapor verisini getir
 * @param {String} reportId - Rapor ID
 * @returns {Promise<Object|null>} - Rapor verisi veya null
 */
export async function getCachedReportData(reportId) {
  try {
    return await offlineStore.data.getItem(`report_${reportId}`);
  } catch (error) {
    console.error('Error getting cached report:', error);
    return null;
  }
}

export default {
  syncOfflineData,
  saveOfflineAction,
  syncPendingActions,
  hasOfflineData,
  getPendingActionsCount,
  clearOfflineData,
  cacheReportData,
  getCachedReportData
};
