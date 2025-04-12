import { createContext, useState, useEffect, useContext } from 'react';
import { 
  syncOfflineData, 
  hasOfflineData, 
  saveOfflineAction, 
  cacheReportData,
  getCachedReportData
} from '../lib/offlineService';
import { useSyncStatus } from './SyncStatusContext';
import { logInfo, logError } from '../lib/errorLogging';

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const { isOnline } = useSyncStatus();
  const [offlineData, setOfflineData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Uygulama başladığında çevrimdışı verileri yükle
  useEffect(() => {
    const initOfflineData = async () => {
      try {
        setLoading(true);
        
        // Çevrimdışı veri var mı kontrol et
        const hasData = await hasOfflineData();
        
        if (hasData) {
          // Varolan çevrimdışı verileri yükle
          setOfflineData({ exists: true });
          setIsInitialized(true);
          logInfo('Offline data loaded from cache');
        } else if (isOnline) {
          // Çevrimiçiyse ve veri yoksa, sunucudan indir
          const result = await syncOfflineData();
          if (result.success) {
            setOfflineData({ exists: true, freshlyLoaded: true });
            setIsInitialized(true);
            logInfo('Fresh offline data downloaded');
          }
        }
      } catch (error) {
        logError('Failed to initialize offline data', { error }, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    initOfflineData();
  }, [isOnline]);
  
  // Çevrimiçi olduğunda verileri güncelle
  useEffect(() => {
    if (isOnline && isInitialized) {
      const syncData = async () => {
        try {
          await syncOfflineData();
          logInfo('Offline data synced after going online');
        } catch (error) {
          logError('Failed to sync offline data', { error }, 'error');
        }
      };
      
      syncData();
    }
  }, [isOnline, isInitialized]);
  
  /**
   * Çevrimdışı aksiyon kaydet
   */
  const recordOfflineAction = async (actionType, entityType, data) => {
    try {
      const result = await saveOfflineAction(actionType, entityType, data);
      return result;
    } catch (error) {
      logError('Failed to save offline action', { actionType, entityType, error }, 'error');
      return { success: false, error };
    }
  };
  
  /**
   * Rapor önbelleğe al
   */
  const cacheReport = async (reportId, reportData) => {
    try {
      return await cacheReportData(reportId, reportData);
    } catch (error) {
      logError('Failed to cache report', { reportId, error }, 'error');
      return { success: false, error };
    }
  };
  
  /**
   * Önbellekteki raporu getir
   */
  const getCachedReport = async (reportId) => {
    try {
      return await getCachedReportData(reportId);
    } catch (error) {
      logError('Failed to get cached report', { reportId, error }, 'warning');
      return null;
    }
  };
  
  return (
    <OfflineContext.Provider value={{
      offlineData,
      isInitialized,
      loading,
      recordOfflineAction,
      cacheReport,
      getCachedReport
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

// Kullanım kolaylığı için hook
export const useOffline = () => useContext(OfflineContext);
