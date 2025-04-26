import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  // State
  const notifications = ref([]);
  const modal = ref(null);

  // Bildirim oluşturma fonksiyonu
  function showNotification(notification) {
    const id = Date.now(); // Benzersiz id oluştur
    const newNotification = {
      id,
      type: notification.type || 'info',
      message: notification.message,
      title: notification.title || getDefaultTitle(notification.type),
      duration: notification.duration || 5000, // Varsayılan 5 saniye
      closable: notification.closable !== false, // Varsayılan true
      timestamp: new Date()
    };

    // Bildirimi listeye ekle
    notifications.value.push(newNotification);

    // Otomatik kapatma
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  // Bildirim kaldırma fonksiyonu
  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  // Tüm bildirimleri temizleme
  function clearAllNotifications() {
    notifications.value = [];
  }

  // Modal gösterme fonksiyonu
  function showModal(modalData) {
    modal.value = {
      id: Date.now(),
      title: modalData.title || 'Bilgi',
      content: modalData.content || '',
      type: modalData.type || 'info',
      confirmText: modalData.confirmText || 'Tamam',
      cancelText: modalData.cancelText || 'İptal',
      showCancel: modalData.showCancel !== false,
      onConfirm: modalData.onConfirm || (() => {}),
      onCancel: modalData.onCancel || (() => {}),
      size: modalData.size || 'md' // sm, md, lg, xl
    };
  }

  // Modal kapatma
  function closeModal() {
    modal.value = null;
  }

  // Varsayılan başlık belirleme
  function getDefaultTitle(type) {
    switch (type) {
      case 'success': return 'Başarılı';
      case 'error': return 'Hata';
      case 'warning': return 'Uyarı';
      case 'info':
      default: return 'Bilgi';
    }
  }

  return {
    // State
    notifications,
    modal,
    
    // Actions
    showNotification,
    removeNotification,
    clearAllNotifications,
    showModal,
    closeModal
  };
});