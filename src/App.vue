<template>
  <router-view></router-view>
</template>

<script setup>
import { onMounted, provide } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useEventBus, Events } from '@/utils/event-bus';
import logger from '@/utils/logger';

// Store
const authStore = useAuthStore();
const eventBus = useEventBus();

// Tema ayarlarını global olarak sağla
const darkMode = localStorage.getItem('darkMode') === 'true';
provide('isDarkMode', darkMode);

// Tema ayarını gövdeye uygula
onMounted(async () => {
  logger.info('Uygulama başlatılıyor...');
  
  try {
    // Kullanıcı kimlik doğrulama durumunu kontrol et
    await authStore.checkAuthState();
    
    // Tema tercihini ayarla
    document.body.classList.toggle('dark-mode', darkMode);
    
    // Service Worker kayıt işlemi
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker başarıyla kaydedildi:', registration.scope);
          })
          .catch(error => {
            console.error('ServiceWorker kaydı başarısız oldu:', error);
          });
      } catch (error) {
        console.error('ServiceWorker kayıt hatası:', error);
      }
    }
    
    // Uygulama hazır olayını yayınla
    eventBus.emit(Events.APP_READY, { timestamp: new Date() });
    logger.info('Uygulama başlatıldı');
  } catch (error) {
    logger.error('Uygulama başlatma hatası:', error);
    eventBus.emit(Events.APP_ERROR, { error });
  }
});
</script>

<style lang="scss">
/* Import main styles */
@use "@/styles/main.scss";

/* Base styles */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s ease, color 0.3s ease;
}

body {
  background-color: #f8f9fa;
  color: #212529;
}

body.dark-mode {
  background-color: #121212;
  color: #e2e2e2;
}

/* Tema değişkenleri */
:root {
  --primary: #0d6efd;
  --secondary: #6c757d;
  --success: #198754;
  --danger: #dc3545;
  --warning: #ffc107;
  --info: #0dcaf0;
  --light: #f8f9fa;
  --dark: #212529;
  --bg-content: #f8f9fa;
  --text-color: #212529;
  --border-color: #dee2e6;
  --card-bg: #ffffff;
  --card-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

/* Dark mode variables */
body.dark-mode {
  --bg-content: #1a1a1a;
  --text-color: #e2e2e2;
  --border-color: #2c2c2c;
  --card-bg: #242424;
  --card-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.2);
}

/* Bootstrap dark mode overrides */
body.dark-mode {
  .card {
    background-color: var(--card-bg);
    border-color: var(--border-color);
  }
  
  .table {
    color: var(--text-color);
  }
  
  .dropdown-menu {
    background-color: var(--card-bg);
    border-color: var(--border-color);
  }
  
  .dropdown-item {
    color: var(--text-color);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
  
  .modal-content {
    background-color: var(--card-bg);
    color: var(--text-color);
  }
  
  .form-control, .form-select {
    background-color: #2c2c2c;
    color: var(--text-color);
    border-color: var(--border-color);
    
    &:focus {
      background-color: #333;
      color: var(--text-color);
    }
  }
}

/* PWA install prompt */
.pwa-install-prompt {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  box-shadow: var(--card-shadow);
  padding: 1rem;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 90%;
  width: 500px;
  
  .prompt-content {
    margin-right: 1rem;
    
    h5 {
      margin: 0 0 0.5rem;
    }
    
    p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
  }
  
  .prompt-actions {
    display: flex;
    gap: 0.5rem;
  }
}
</style>