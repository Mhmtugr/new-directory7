import { createContext, useState, useEffect, useContext } from 'react';
import { getPendingActionsCount, syncPendingActions } from '../lib/offlineService';

export const SyncStatusContext = createContext();

export const SyncStatusProvider = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Çevrimdışı durumu dinle
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Bekleyen işlem sayısını kontrol et
    checkPendingActions();
    
    // Düzenli olarak bekleyen işlemleri kontrol et
    const checkInterval = setInterval(checkPendingActions, 30000); // 30 saniyede bir
    
    // Online olduğunda bekleyen işlemleri senkronize et
    if (isOnline) {
      syncWhenOnline();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [isOnline]);

  // Bekleyen işlem sayısını kontrol et
  const checkPendingActions = async () => {
    const count = await getPendingActionsCount();
    setPendingCount(count);
  };
  
  // Online olduğunda bekleyen işlemleri senkronize et
  const syncWhenOnline = async () => {
    const count = await getPendingActionsCount();
    if (count > 0 && !isSyncing) {
      await syncNow();
    }
  };
  
  // Manuel senkronizasyon
  const syncNow = async () => {
    if (!isOnline || isSyncing) return { success: false, message: 'Cannot sync now' };
    
    setIsSyncing(true);
    try {
      const result = await syncPendingActions();
      setLastSyncTime(new Date());
      await checkPendingActions();
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncStatusContext.Provider value={{
      pendingCount,
      isSyncing,
      lastSyncTime,
      isOnline,
      syncNow,
      checkPendingActions
    }}>
      {children}
    </SyncStatusContext.Provider>
  );
};

// Kullanım kolaylığı için hook
export const useSyncStatus = () => useContext(SyncStatusContext);
