<template>
  <header class="app-header">
    <div class="header-left">
      <button 
        class="sidebar-toggle" 
        @click="$emit('toggle-sidebar')" 
        aria-label="Menüyü Aç/Kapat"
      >
        <i class="bi bi-list"></i>
      </button>
      <div class="app-logo">
        <img src="@/assets/images/sample-image.jpg" alt="METS Logo" />
        <h1>METS</h1>
      </div>
    </div>

    <div class="header-center">
      <div class="search-bar">
        <i class="bi bi-search"></i>
        <input 
          type="text" 
          placeholder="Ara..." 
          v-model="searchQuery" 
          @keyup.enter="handleSearch"
        />
        <button 
          v-if="searchQuery" 
          class="clear-search" 
          @click="clearSearch"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <div class="header-right">
      <div class="header-actions">
        <!-- Tema Değiştirme Butonu -->
        <button class="action-button theme-toggle-btn" @click="toggleDarkMode" title="Tema Değiştir">
          <i class="bi" :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
        </button>
        
        <!-- Bildirimler Butonu -->
        <button class="action-button notifications-button" @click="toggleNotifications" title="Bildirimler">
          <i class="bi bi-bell"></i>
          <span v-if="unreadNotifications > 0" class="notification-badge">{{ unreadNotifications }}</span>
        </button>
        
        <!-- Bildirimler Dropdown -->
        <div v-if="showNotificationsDropdown" class="notifications-dropdown">
          <div class="dropdown-header">
            <h6>Bildirimler</h6>
            <button @click="markAllAsRead" class="text-button">Tümünü Okundu İşaretle</button>
          </div>
          <div v-if="userNotifications.length === 0" class="no-notifications">
            <i class="bi bi-bell-slash"></i>
            <p>Bildiriminiz bulunmuyor</p>
          </div>
          <div v-else class="notifications-list">
            <div 
              v-for="notification in userNotifications" 
              :key="notification.id"
              class="notification-item"
              :class="{ 'unread': !notification.read }"
              @click="readNotification(notification.id)"
            >
              <div class="notification-icon" :class="notification.type">
                <i :class="getNotificationIcon(notification.type)"></i>
              </div>
              <div class="notification-content">
                <p class="notification-text">{{ notification.message }}</p>
                <span class="notification-time">{{ formatNotificationTime(notification.timestamp) }}</span>
              </div>
            </div>
          </div>
          <div class="dropdown-footer">
            <router-link to="/notifications">Tümünü Gör</router-link>
          </div>
        </div>
        
        <!-- Kullanıcı Profil Butonu -->
        <button class="action-button" @click="toggleUserMenu" title="Profil Menüsü">
          <div class="user-avatar">
            <img 
              v-if="user && user.photoURL" 
              :src="user.photoURL" 
              :alt="user?.displayName || 'Kullanıcı'"
            />
            <span v-else class="avatar-placeholder">
              {{ getUserInitials(user?.displayName || username) }}
            </span>
          </div>
        </button>
        
        <!-- Kullanıcı Dropdown Menüsü -->
        <div v-if="showUserMenu" class="user-menu-dropdown">
          <div class="user-info">
            <div class="user-avatar large">
              <img 
                v-if="user && user.photoURL" 
                :src="user.photoURL" 
                :alt="user?.displayName || 'Kullanıcı'"
              />
              <span v-else class="avatar-placeholder">
                {{ getUserInitials(user?.displayName || username) }}
              </span>
            </div>
            <div class="user-details">
              <h6>{{ user?.displayName || username }}</h6>
              <p>{{ user?.email || '' }}</p>
              <span class="user-role">{{ getUserRoleDisplay(user?.role) }}</span>
            </div>
          </div>
          
          <div class="menu-items">
            <router-link to="/profile" class="menu-item">
              <i class="bi bi-person"></i>
              <span>Profilim</span>
            </router-link>
            <router-link to="/settings" class="menu-item">
              <i class="bi bi-gear"></i>
              <span>Ayarlar</span>
            </router-link>
            <div class="menu-divider"></div>
            <button @click="logout" class="menu-item">
              <i class="bi bi-box-arrow-right"></i>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const props = defineProps({
  username: {
    type: String,
    default: 'Kullanıcı'
  }
});

const emit = defineEmits(['logout', 'toggle-dark-mode', 'toggle-sidebar']);

// Router
const router = useRouter();

// Stores
const authStore = useAuthStore();

// State
const searchQuery = ref('');
const showNotificationsDropdown = ref(false);
const showUserMenu = ref(false);
const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');
const userNotifications = ref([
  {
    id: 1,
    type: 'info',
    message: 'Yeni bir sipariş oluşturuldu',
    read: false,
    timestamp: new Date(Date.now() - 30 * 60000) // 30 dakika önce
  },
  {
    id: 2,
    type: 'warning',
    message: 'Stok seviyesi düşük: Vida 10mm',
    read: false,
    timestamp: new Date(Date.now() - 120 * 60000) // 2 saat önce
  },
  {
    id: 3,
    type: 'success',
    message: 'Sipariş #12345 tamamlandı',
    read: true,
    timestamp: new Date(Date.now() - 24 * 60 * 60000) // 1 gün önce
  }
]);

// Computed properties
const user = computed(() => authStore.user);

const unreadNotifications = computed(() => {
  return userNotifications.value.filter(n => !n.read).length;
});

// Methods
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  emit('toggle-dark-mode');
}

function handleSearch() {
  if (!searchQuery.value.trim()) return;
  
  // Search işlemini gerçekleştir
  router.push({
    name: 'Search',
    query: { q: searchQuery.value }
  });
  
  // Dropdown'ları kapat
  showNotificationsDropdown.value = false;
  showUserMenu.value = false;
}

function clearSearch() {
  searchQuery.value = '';
}

function toggleNotifications() {
  showNotificationsDropdown.value = !showNotificationsDropdown.value;
  showUserMenu.value = false;
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
  showNotificationsDropdown.value = false;
}

function markAllAsRead() {
  userNotifications.value.forEach(notification => {
    notification.read = true;
  });
}

function readNotification(id) {
  const notification = userNotifications.value.find(n => n.id === id);
  if (notification) {
    notification.read = true;
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'info': return 'bi bi-info-circle-fill';
    case 'success': return 'bi bi-check-circle-fill';
    case 'warning': return 'bi bi-exclamation-triangle-fill';
    case 'error': return 'bi bi-x-circle-fill';
    default: return 'bi bi-bell-fill';
  }
}

function formatNotificationTime(timestamp) {
  if (!timestamp) return '';
  
  try {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 60000); // Dakika cinsinden fark
    
    if (diff < 1) return 'Şimdi';
    if (diff < 60) return `${diff} dk önce`;
    
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} saat önce`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} gün önce`;
    
    const months = Math.floor(days / 30);
    return `${months} ay önce`;
  } catch (error) {
    console.error('Zaman formatlanırken hata:', error);
    return '';
  }
}

function getUserInitials(name) {
  if (!name) return 'K';
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

function getUserRoleDisplay(role) {
  switch(role) {
    case 'admin': return 'Yönetici';
    case 'manager': return 'Müdür';
    case 'technician': return 'Teknisyen';
    case 'user': return 'Kullanıcı';
    default: return role || 'Kullanıcı';
  }
}

function logout() {
  emit('logout');
}

// Handle clicks outside of dropdowns
function handleOutsideClick(event) {
  const notificationsButton = event.target.closest('.notifications-button');
  const notificationsDropdown = event.target.closest('.notifications-dropdown');
  const userButton = event.target.closest('.user-avatar');
  const userMenuDropdown = event.target.closest('.user-menu-dropdown');
  
  if (!notificationsButton && !notificationsDropdown && showNotificationsDropdown.value) {
    showNotificationsDropdown.value = false;
  }
  
  if (!userButton && !userMenuDropdown && showUserMenu.value) {
    showUserMenu.value = false;
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style lang="scss">
@use "@/styles/base/variables" as vars;

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 1.5rem;
  background-color: var(--card-bg);
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  
  .header-left {
    display: flex;
    align-items: center;
    
    .sidebar-toggle {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-color);
      cursor: pointer;
      padding: 0.25rem 0.75rem;
      margin-right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      
      &:hover {
        color: var(--primary);
      }
    }
    
    .app-logo {
      display: flex;
      align-items: center;
      
      img {
        height: 32px;
        margin-right: 0.75rem;
      }
      
      h1 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        background: linear-gradient(45deg, #0d6efd, #6610f2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-fill-color: transparent;
      }
    }
  }
  
  .header-center {
    flex: 1;
    max-width: 600px;
    padding: 0 2rem;
    
    .search-bar {
      position: relative;
      width: 100%;
      
      i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
      }
      
      input {
        width: 100%;
        padding: 0.6rem 1rem 0.6rem 2.5rem;
        border-radius: 30px;
        border: 1px solid var(--border-color);
        background-color: transparent;
        color: var(--text-color);
        font-size: 0.9rem;
        transition: all 0.2s ease;
        
        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
        }
        
        &::placeholder {
          color: var(--text-muted);
        }
      }
      
      .clear-search {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        padding: 0;
        cursor: pointer;
        font-size: 1rem;
        transition: color 0.2s ease;
        
        &:hover {
          color: var(--primary);
        }
      }
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    
    .header-actions {
      display: flex;
      align-items: center;
      position: relative;
      
      .action-button {
        background: none;
        border: none;
        width: 40px;
        height: 40px;
        margin-left: 0.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-color);
        font-size: 1.2rem;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background-color: var(--bg-hover);
          color: var(--primary);
        }
        
        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: var(--danger);
          color: #fff;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .avatar-placeholder {
            width: 100%;
            height: 100%;
            background-color: var(--primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
          }
          
          &.large {
            width: 48px;
            height: 48px;
            font-size: 1.2rem;
          }
        }
      }
      
      // Notifications dropdown
      .notifications-dropdown {
        position: absolute;
        top: calc(100% + 0.75rem);
        right: 0;
        width: 320px;
        background-color: var(--card-bg);
        border-radius: 0.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--border-color);
        animation: fadeInDown 0.2s ease;
        
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          
          h6 {
            margin: 0;
            font-weight: 600;
            font-size: 1.1rem;
          }
          
          .text-button {
            background: none;
            border: none;
            color: var(--primary);
            font-size: 0.8rem;
            padding: 0;
            cursor: pointer;
            
            &:hover {
              text-decoration: underline;
            }
          }
        }
        
        .no-notifications {
          padding: 2rem 1rem;
          text-align: center;
          color: var(--text-muted);
          
          i {
            font-size: 2rem;
            margin-bottom: 0.75rem;
          }
          
          p {
            margin: 0;
          }
        }
        
        .notifications-list {
          overflow-y: auto;
          max-height: 350px;
          
          .notification-item {
            display: flex;
            padding: 1rem;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.15s ease;
            
            &.unread {
              background-color: rgba(13, 110, 253, 0.05);
              
              .notification-text {
                font-weight: 500;
              }
            }
            
            &:hover {
              background-color: rgba(0, 0, 0, 0.03);
            }
            
            .notification-icon {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 1rem;
              font-size: 1rem;
              
              &.info { 
                color: white;
                background-color: #0dcaf0; 
              }
              &.success { 
                color: white;
                background-color: #198754; 
              }
              &.warning { 
                color: #212529;
                background-color: #ffc107; 
              }
              &.error { 
                color: white;
                background-color: #dc3545; 
              }
            }
            
            .notification-content {
              flex: 1;
              
              .notification-text {
                margin: 0 0 0.25rem;
                font-size: 0.875rem;
                word-break: break-word;
                color: var(--text-color);
              }
              
              .notification-time {
                font-size: 0.75rem;
                color: var(--text-muted);
              }
            }
          }
        }
        
        .dropdown-footer {
          padding: 0.75rem;
          text-align: center;
          border-top: 1px solid var(--border-color);
          
          a {
            color: var(--primary);
            font-size: 0.875rem;
            text-decoration: none;
            
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
      
      // User menu dropdown
      .user-menu-dropdown {
        position: absolute;
        top: calc(100% + 0.75rem);
        right: 0;
        width: 280px;
        background-color: var(--card-bg);
        border-radius: 0.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        overflow: hidden;
        border: 1px solid var(--border-color);
        animation: fadeInDown 0.2s ease;
        
        .user-info {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(13, 110, 253, 0.05), rgba(13, 202, 240, 0.05));
          display: flex;
          align-items: center;
          
          .user-avatar {
            margin-right: 1rem;
          }
          
          .user-details {
            h6 {
              margin: 0;
              font-weight: 600;
              font-size: 1.05rem;
              color: var(--text-color);
            }
            
            p {
              margin: 0.25rem 0 0.5rem;
              font-size: 0.85rem;
              color: var(--text-muted);
            }
            
            .user-role {
              display: inline-block;
              font-size: 0.75rem;
              background-color: rgba(13, 110, 253, 0.1);
              color: var(--primary);
              padding: 0.2rem 0.6rem;
              border-radius: 30px;
              font-weight: 500;
            }
          }
        }
        
        .menu-items {
          padding: 0.5rem 0;
          
          .menu-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1.5rem;
            color: var(--text-color);
            text-decoration: none;
            font-size: 0.95rem;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: all 0.15s ease;
            
            &:hover {
              background-color: rgba(0, 0, 0, 0.03);
              color: var(--primary);
            }
            
            i {
              margin-right: 1rem;
              font-size: 1.1rem;
              width: 20px;
              text-align: center;
              color: var(--text-muted);
              transition: color 0.15s ease;
            }
            
            &:hover i {
              color: var(--primary);
            }
          }
          
          .menu-divider {
            height: 1px;
            background-color: var(--border-color);
            margin: 0.5rem 1rem;
          }
        }
      }
    }
  }
}

// Animation
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Dark mode specific overrides
body.dark-mode {
  .app-header {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    
    .header-center {
      .search-bar input {
        background-color: rgba(255, 255, 255, 0.05);
        
        &:focus {
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
        }
      }
    }
    
    .header-actions {
      .action-button:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      .notifications-dropdown,
      .user-menu-dropdown {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        
        .notification-item:hover,
        .menu-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .notification-item.unread {
          background-color: rgba(13, 110, 253, 0.1);
        }
      }
    }
  }
}

// Responsive styles
@media (max-width: 992px) {
  .app-header {
    .header-center {
      padding: 0 1rem;
      max-width: 400px;
    }
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 1rem;
    
    .header-center {
      display: none;
    }
    
    .header-right .header-actions {
      .notifications-dropdown,
      .user-menu-dropdown {
        position: fixed;
        top: 64px;
        right: 0;
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: calc(100vh - 64px);
        border-radius: 0;
        box-shadow: none;
        animation: none;
        border: none;
        border-top: 1px solid var(--border-color);
      }
    }
  }
}
</style>