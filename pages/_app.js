import { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from '../components/Layout';
import { UserProvider } from '../context/UserContext';
import { OrderProvider } from '../context/OrderContext';
import { InventoryProvider } from '../context/InventoryContext';
import { ProductionProvider } from '../context/ProductionContext';
import { AIProvider } from '../context/AIContext';
import { OfflineProvider } from '../context/OfflineContext';
import { setupGlobalErrorHandler } from '../lib/errorLogging';
import GlobalChatbot from '../components/GlobalChatbot';
import OfflineNotification from '../components/OfflineNotification';
import { SyncStatusProvider } from '../context/SyncStatusContext';
import '../styles/globals.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function MyApp({ Component, pageProps }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Global hata yakalayıcıyı kur
    setupGlobalErrorHandler();
    
    // Çevrimdışı durumu dinle
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
        <SyncStatusProvider>
          <OfflineProvider>
            <AIProvider>
              <OrderProvider>
                <InventoryProvider>
                  <ProductionProvider>
                    <Layout>
                      {!isOnline && <OfflineNotification />}
                      <Component {...pageProps} />
                      <GlobalChatbot /> {/* Global chatbot bileşenini ekleyin */}
                    </Layout>
                  </ProductionProvider>
                </InventoryProvider>
              </OrderProvider>
            </AIProvider>
          </OfflineProvider>
        </SyncStatusProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default MyApp;
