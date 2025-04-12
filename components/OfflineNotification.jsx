import { useState, useEffect } from 'react';
import { Alert, Snackbar, Box, Typography, Button } from '@mui/material';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';
import { useSyncStatus } from '../context/SyncStatusContext';

const OfflineNotification = () => {
  const { pendingCount, isOnline, syncNow } = useSyncStatus();
  const [showSnackbar, setShowSnackbar] = useState(!isOnline);
  const [showBanner, setShowBanner] = useState(!isOnline);
  
  useEffect(() => {
    // Çevrimdışı olduğunda bildir
    if (!isOnline) {
      setShowSnackbar(true);
      setShowBanner(true);
    } else {
      // Çevrimiçi olduğunda banner'ı gizle
      setShowBanner(false);
      
      // Bekleyen işlemler varsa bildir
      if (pendingCount > 0) {
        setShowSnackbar(true);
      }
    }
  }, [isOnline, pendingCount]);
  
  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };
  
  const handleSync = async () => {
    if (isOnline && pendingCount > 0) {
      await syncNow();
    }
  };
  
  return (
    <>
      {/* Çevrimdışı banner */}
      {showBanner && (
        <Box 
          sx={{ 
            bgcolor: 'warning.main', 
            color: 'warning.contrastText', 
            p: 1, 
            textAlign: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <WifiOffIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">
            Çevrimdışı moddasınız. İnternet bağlantısı kurulduğunda verileriniz otomatik olarak senkronize edilecektir.
          </Typography>
        </Box>
      )}
      
      {/* Bildirim snackbar */}
      <Snackbar 
        open={showSnackbar}
        autoHideDuration={isOnline ? 6000 : null}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity={isOnline ? "info" : "warning"}
          onClose={handleSnackbarClose}
          sx={{ width: '100%' }}
          action={
            isOnline && pendingCount > 0 ? (
              <Button color="inherit" size="small" onClick={handleSync}>
                Senkronize Et
              </Button>
            ) : null
          }
        >
          {!isOnline ? (
            "Çevrimdışı moddasınız. Bazı özellikler kısıtlı olabilir."
          ) : (
            pendingCount > 0 ? (
              `${pendingCount} adet senkronize edilmemiş işlem var.`
            ) : (
              "İnternet bağlantısı kuruldu."
            )
          )}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineNotification;
