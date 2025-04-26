<template>
  <aside class="app-sidebar" :class="{ 'collapsed': isCollapsed }">
    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li class="nav-item" v-for="item in menuItems" :key="item.path">
          <!-- Ana menü öğeleri -->
          <router-link
            v-if="!item.children"
            :to="item.path"
            class="nav-link"
            :class="{ 'active': isActiveRoute(item.path) }"
          >
            <i :class="item.icon"></i>
            <span class="nav-text">{{ item.title }}</span>
          </router-link>
          
          <!-- Alt menü öğeleri olan grup -->
          <div v-else class="nav-group">
            <div 
              class="nav-group-header"
              @click="toggleSubMenu(item.id)"
              :class="{ 'active': expandedMenus.includes(item.id) || isActiveInGroup(item) }"
            >
              <div class="nav-link-content">
                <i :class="item.icon"></i>
                <span class="nav-text">{{ item.title }}</span>
              </div>
              <i class="bi" :class="expandedMenus.includes(item.id) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
            </div>
            
            <transition name="submenu">
              <ul v-if="expandedMenus.includes(item.id) || isActiveInGroup(item)" class="sub-nav-list">
                <li v-for="child in item.children" :key="child.path" class="sub-nav-item">
                  <router-link
                    :to="child.path"
                    class="sub-nav-link"
                    :class="{ 'active': isActiveRoute(child.path) }"
                  >
                    <i :class="child.icon"></i>
                    <span class="nav-text">{{ child.title }}</span>
                  </router-link>
                </li>
              </ul>
            </transition>
          </div>
        </li>
      </ul>
    </nav>
    
    <div class="sidebar-footer">
      <div class="collapse-button" @click="toggleSidebar">
        <i class="bi" :class="isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'"></i>
      </div>
      
      <div class="help-section">
        <router-link to="/help" class="help-link">
          <i class="bi bi-question-circle"></i>
          <span class="nav-text">Yardım</span>
        </router-link>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// Router
const route = useRoute();

// Stores
const authStore = useAuthStore();

// Provide/Inject
const isCollapsed = inject('isSidebarCollapsed');
const toggleSidebar = inject('toggleSidebar');

// State
const expandedMenus = ref([]);

// Computed
const user = computed(() => authStore.user);

const menuItems = computed(() => {
  const items = [
    {
      id: 'dashboard',
      title: 'Gösterge Paneli',
      path: '/',
      icon: 'bi bi-grid-1x2'
    },
    {
      id: 'orders',
      title: 'Siparişler',
      icon: 'bi bi-cart',
      children: [
        {
          title: 'Sipariş Listesi',
          path: '/orders',
          icon: 'bi bi-list-ul'
        },
        {
          title: 'Yeni Sipariş',
          path: '/orders/create',
          icon: 'bi bi-plus-circle'
        }
      ]
    },
    {
      id: 'production',
      title: 'Üretim',
      icon: 'bi bi-gear',
      children: [
        {
          title: 'Üretim Planlaması',
          path: '/production/planning',
          icon: 'bi bi-calendar4-week'
        },
        {
          title: 'Üretim İzleme',
          path: '/production/monitoring',
          icon: 'bi bi-activity'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Envanter',
      icon: 'bi bi-box',
      children: [
        {
          title: 'Stok Yönetimi',
          path: '/inventory/stock',
          icon: 'bi bi-boxes'
        },
        {
          title: 'Malzemeler',
          path: '/inventory/materials',
          icon: 'bi bi-tools'
        }
      ]
    },
    {
      id: 'purchasing',
      title: 'Satın Alma',
      icon: 'bi bi-bag',
      children: [
        {
          title: 'Satın Alma',
          path: '/purchasing',
          icon: 'bi bi-cart-plus'
        },
        {
          title: 'Tedarikçiler',
          path: '/purchasing/suppliers',
          icon: 'bi bi-building'
        }
      ]
    },
    {
      id: 'reports',
      title: 'Raporlar',
      icon: 'bi bi-bar-chart',
      children: [
        {
          title: 'Sipariş Raporları',
          path: '/reports/orders',
          icon: 'bi bi-file-earmark-text'
        },
        {
          title: 'Üretim Raporları',
          path: '/reports/production',
          icon: 'bi bi-file-earmark-bar-graph'
        }
      ]
    }
  ];

  // Sadece yöneticilerin görebileceği menü öğeleri
  if (user.value?.role === 'admin' || user.value?.role === 'manager') {
    items.push(
      {
        id: 'users',
        title: 'Kullanıcılar',
        path: '/users',
        icon: 'bi bi-people'
      },
      {
        id: 'settings',
        title: 'Ayarlar',
        path: '/settings',
        icon: 'bi bi-gear'
      }
    );
  }
  
  return items;
});

// Methods
function isActiveRoute(path) {
  return route.path === path;
}

function isActiveInGroup(item) {
  if (!item.children) return false;
  
  return item.children.some(child => {
    // Tam eşleşme veya alt yol kontrolü
    return route.path === child.path || 
           route.path.startsWith(`${child.path}/`);
  });
}

function toggleSubMenu(menuId) {
  const index = expandedMenus.value.indexOf(menuId);
  if (index === -1) {
    expandedMenus.value.push(menuId);
  } else {
    expandedMenus.value.splice(index, 1);
  }
}

// Lifecycle
onMounted(() => {
  // İlk yüklemede aktif olan menüyü otomatik olarak aç
  menuItems.value.forEach(item => {
    if (item.children && isActiveInGroup(item)) {
      expandedMenus.value.push(item.id);
    }
  });
});

// Route değiştiğinde kontrol et
watch(
  () => route.path,
  () => {
    // Eğer sidebar daraltılmışsa ve bir menü öğesine tıklanmışsa
    // sidebar'ı genişlet (özellikle mobil görünümde)
    if (isCollapsed.value && window.innerWidth < 768) {
      toggleSidebar();
    }
    
    // Aktif olan menüyü otomatik olarak aç
    menuItems.value.forEach(item => {
      if (item.children && isActiveInGroup(item) && !expandedMenus.value.includes(item.id)) {
        expandedMenus.value.push(item.id);
      }
    });
  }
);
</script>

<style lang="scss">
.app-sidebar {
  width: 260px;
  height: 100%;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, transform 0.3s ease;
  overflow-x: hidden;
  border-right: 1px solid var(--border-color);
  position: relative;
  z-index: 80;
  
  &.collapsed {
    width: 70px;
    
    .nav-text,
    .sub-nav-list,
    .nav-group-header i.bi-chevron-down,
    .nav-group-header i.bi-chevron-right {
      display: none;
    }
    
    .nav-item .nav-link,
    .nav-group-header {
      justify-content: center;
      padding: 0.75rem 0;
      
      i {
        margin-right: 0;
        font-size: 1.25rem;
      }
    }
    
    .sidebar-footer {
      .help-link {
        justify-content: center;
        
        i {
          margin-right: 0;
        }
      }
    }
  }
  
  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
    
    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .nav-item {
      margin-bottom: 0.25rem;
    }
    
    .nav-link,
    .nav-group-header {
      display: flex;
      align-items: center;
      padding: 0.75rem 1.25rem;
      color: var(--sidebar-text);
      text-decoration: none;
      border-radius: 0.25rem;
      margin: 0 0.5rem;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--sidebar-hover);
      }
      
      &.active {
        background: var(--primary);
        color: #fff;
      }
      
      i {
        font-size: 1.1rem;
        margin-right: 1rem;
        width: 20px;
        text-align: center;
      }
    }
    
    .nav-group {
      .nav-group-header {
        cursor: pointer;
        justify-content: space-between;
        user-select: none;
        
        .nav-link-content {
          display: flex;
          align-items: center;
        }
      }
      
      .sub-nav-list {
        list-style: none;
        padding-left: 2.75rem;
        margin: 0.5rem 0;
      }
      
      .sub-nav-link {
        display: flex;
        align-items: center;
        padding: 0.6rem 1rem;
        color: var(--sidebar-text);
        text-decoration: none;
        border-radius: 0.25rem;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        
        &:hover {
          background: var(--sidebar-hover);
        }
        
        &.active {
          color: var(--primary);
          background: var(--primary-light);
        }
        
        i {
          font-size: 0.9rem;
          margin-right: 0.75rem;
          width: 16px;
          text-align: center;
        }
      }
    }
  }
  
  .sidebar-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border-color);
    
    .collapse-button {
      cursor: pointer;
      text-align: center;
      padding: 0.5rem;
      margin-bottom: 0.75rem;
      color: var(--text-muted);
      border-radius: 0.25rem;
      
      &:hover {
        background: var(--sidebar-hover);
        color: var(--sidebar-text);
      }
      
      i {
        font-size: 1.1rem;
      }
    }
    
    .help-link {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      color: var(--sidebar-text);
      text-decoration: none;
      border-radius: 0.25rem;
      
      &:hover {
        background: var(--sidebar-hover);
      }
      
      i {
        font-size: 1.1rem;
        margin-right: 0.75rem;
      }
    }
  }
}

// Submenu animation
.submenu-enter-active,
.submenu-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}

.submenu-enter-from,
.submenu-leave-to {
  max-height: 0;
  opacity: 0;
}

// Responsive styles
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    height: calc(100vh - 60px);
    box-shadow: 5px 0 15px rgba(0, 0, 0, 0.1);
    transform: translateX(0);
    
    &.collapsed {
      transform: translateX(-100%);
    }
  }
}
</style>