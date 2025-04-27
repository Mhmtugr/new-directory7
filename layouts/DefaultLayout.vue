<template>
  <div class="app-container" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <Sidebar @toggle-sidebar="toggleSidebar" :is-collapsed="isSidebarCollapsed" />
    <div class="main-content">
      <AppHeader 
        :username="username" 
        @toggle-sidebar="toggleSidebar" 
        @logout="handleLogout"
        @toggle-dark-mode="toggleDarkMode"
      />
      <main class="content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
      <AppFooter />
    </div>
    <Notifications />
  </div>
</template>

<script setup>
import { ref, provide, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import AppHeader from '@/components/app/AppHeader.vue';
import Sidebar from '@/components/app/Sidebar.vue';
import AppFooter from '@/components/app/AppFooter.vue';
import Notifications from '@/components/ui/Notifications.vue';

// Router ve store
const router = useRouter();
const authStore = useAuthStore();

// Username
const username = computed(() => {
  return authStore.user?.displayName || 'Kullanıcı';
});

// Dark mode state
const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');

// Sidebar durumu
const isSidebarCollapsed = ref(false);

// Toggle fonksiyonları
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('darkMode', isDarkMode.value);
  document.body.classList.toggle('dark-mode', isDarkMode.value);
};

const handleLogout = () => {
  authStore.logout();
  router.push({ name: 'Login' });
};

// Provide ile alt bileşenlere aktarılması
provide('isSidebarCollapsed', isSidebarCollapsed);
provide('toggleSidebar', toggleSidebar);
provide('isDarkMode', isDarkMode);
provide('toggleDarkMode', toggleDarkMode);

// Sayfa yüklendiğinde dark mode durumunu kontrol et
document.body.classList.toggle('dark-mode', isDarkMode.value);
</script>

<style lang="scss">
@use "@/styles/base/variables" as vars;

.app-container {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 250px; /* Sidebar genişliği */
    transition: margin-left 0.3s ease;
    min-height: 100vh;
    background-color: var(--bg-content, #f8f9fa);
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: auto;
      
      .content-wrapper {
        flex: 1;
        padding: 1.5rem;
      }
    }
  }

  &.sidebar-collapsed {
    .main-content {
      margin-left: 70px; /* Daraltılmış sidebar genişliği */
    }
  }
}

/* Sayfa geçişi animasyonu */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Duyarlı tasarım ayarları */
@media (max-width: 992px) {
  .app-container {
    .main-content {
      margin-left: 0 !important;
    }
  }
}
</style>