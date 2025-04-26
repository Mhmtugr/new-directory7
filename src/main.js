/**
 * METS - MehmetEndüstriyelTakip Ana Uygulama Giriş Noktası
 * Version: 2.0.0
 * Author: MehmetMETS Team
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './store';
import './styles/main_new.scss'; // Changed to use our clean SCSS file

// Bootstrap ikonları ve CSS yükleniyor
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Global event bus için özel event
window.addEventListener('load', () => {
  document.dispatchEvent(new Event('app-loaded'));
});

// Uygulama başlatılıyor
const app = createApp(App);

// Router ve Pinia store ekleniyor
app.use(router);
app.use(pinia);

// Hata yakalama
app.config.errorHandler = (err, vm, info) => {
  console.error('Uygulama Hatası:', err, info);
};

// Tema değişikliklerini dinleyen global olay yayıcısı
const emitThemeChange = () => {
  document.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { isDarkMode: localStorage.getItem('darkMode') === 'true' }
  }));
};

// LocalStorage değişikliklerini dinle
window.addEventListener('storage', (event) => {
  if (event.key === 'darkMode') {
    document.body.classList.toggle('dark-mode', event.newValue === 'true');
    emitThemeChange();
  }
});

// Uygulama DOM'a bağlanıyor
app.mount('#app');

// Not: Service Worker kaydı App.vue içinde yönetiliyor, bu sayede
// hem VitePWA hem de manuel kontrol sağlanabiliyor