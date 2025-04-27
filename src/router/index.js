import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BlankLayout from '@/layouts/BlankLayout.vue';

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/dashboard/Dashboard.vue'),
        meta: { title: 'Ana Panel' }
      },
      
      // Orders Module Routes
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/OrderList.vue'),
        meta: { title: 'Siparişler' }
      },
      {
        path: 'orders/create',
        name: 'OrderCreate',
        component: () => import('@/views/orders/OrderCreate.vue'),
        meta: { title: 'Yeni Sipariş' }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/orders/OrderDetail.vue'),
        props: true,
        meta: { title: 'Sipariş Detayı' }
      },
      
      // Production Module Routes
      {
        path: 'production',
        name: 'Production',
        component: () => import('@/views/production/Production.vue'),
        meta: { title: 'Üretim' }
      },
      {
        path: 'production/planning',
        name: 'ProductionPlanning',
        component: () => import('@/views/planning/Planning.vue'),
        meta: { title: 'Üretim Planlaması' }
      },
      {
        path: 'production/monitoring',
        name: 'ProductionMonitoring',
        component: () => import('@/views/production/Production.vue'),
        meta: { title: 'Üretim İzleme' }
      },
      
      // Inventory Module Routes
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/Inventory.vue'),
        meta: { title: 'Envanter' }
      },
      {
        path: 'inventory/stock',
        name: 'Stock',
        component: () => import('@/views/inventory/Stock.vue'),
        meta: { title: 'Stok Yönetimi' }
      },
      {
        path: 'inventory/materials',
        name: 'Materials',
        component: () => import('@/views/inventory/Materials.vue'),
        meta: { title: 'Malzeme Yönetimi' }
      },
      
      // Purchasing Module Routes
      {
        path: 'purchasing',
        name: 'Purchasing',
        component: () => import('@/views/purchasing/Purchasing.vue'),
        meta: { title: 'Satın Alma' }
      },
      {
        path: 'purchasing/suppliers',
        name: 'Suppliers',
        component: () => import('@/views/purchasing/Suppliers.vue'),
        meta: { title: 'Tedarikçiler' }
      },
      
      // Technical Module Route
      {
        path: 'technical',
        name: 'Technical',
        component: () => import('@/views/technical/Technical.vue'),
        meta: { title: 'Teknik Veri' }
      },
      
      // Planning Module Route
      {
        path: 'planning',
        name: 'Planning',
        component: () => import('@/views/planning/Planning.vue'),
        meta: { title: 'Planlama' }
      },
      
      // Reports Module Routes
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/Reports.vue'),
        meta: { title: 'Raporlar' }
      },
      {
        path: 'reports/orders',
        name: 'OrderReports',
        component: () => import('@/views/reports/OrderReports.vue'),
        meta: { title: 'Sipariş Raporları' }
      },
      {
        path: 'reports/production',
        name: 'ProductionReports',
        component: () => import('@/views/reports/ProductionReports.vue'),
        meta: { title: 'Üretim Raporları' }
      },
      
      // User Management and Settings (Admin Only)
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { title: 'Kullanıcı Yönetimi', requiredRole: 'admin' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { title: 'Ayarlar', requiredRole: 'admin' }
      },
      
      // Help Page
      {
        path: 'help',
        name: 'Help',
        component: () => import('@/views/help/Help.vue'),
        meta: { title: 'Yardım' }
      }
    ]
  },
  {
    path: '/auth',
    component: BlankLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/auth/Login.vue'),
        meta: { title: 'Giriş Yap' }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/auth/Login.vue'),
        meta: { title: 'Kayıt Ol' }
      }
    ]
  },
  // Catchall 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/shared/NotFound.vue'),
    meta: { layout: 'blank', title: 'Sayfa Bulunamadı' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

router.beforeEach(async (to, from, next) => {
  // Get the auth store
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  // If the route requires authentication
  if (requiresAuth) {
    try {
      // Check if the user is logged in
      await authStore.checkAuthState();
      
      if (!authStore.isAuthenticated) {
        // Redirect to login page
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
      }
      
      // Check for specific role requirements if needed
      if (to.meta.requiredRole && !authStore.hasRole(to.meta.requiredRole)) {
        next({ name: 'Home' }); // Redirect to home if user doesn't have required role
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      next({ name: 'Login', query: { redirect: to.fullPath } });
      return;
    }
  }
  
  // If the route is a login page and user is already logged in, redirect to home
  if (to.path.includes('/auth/') && authStore.isAuthenticated) {
    next({ name: 'Home' });
    return;
  }
  
  next();
});

router.afterEach((to) => {
  const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);
  if (nearestWithTitle) {
    document.title = `${nearestWithTitle.meta.title} | MehmetEndüstriyelTakip`;
  } else {
    document.title = 'MehmetEndüstriyelTakip';
  }
});

export default router;