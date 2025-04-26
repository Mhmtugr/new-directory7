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
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Ana Panel' }
      },
      // Orders Module Routes
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: 'Siparişler' }
      },
      {
        path: 'orders/create',
        name: 'OrderCreate',
        component: () => import('@/modules/orders/OrderCreation.vue'),
        meta: { title: 'Yeni Sipariş' }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/modules/orders/OrderDetail.vue'),
        props: true,
        meta: { title: 'Sipariş Detayı' }
      },
      // Production Module Route
      {
        path: 'production',
        name: 'Production',
        component: () => import('@/modules/production/ProductionView.vue'),
        meta: { title: 'Üretim' }
      },
      // Purchasing Module Route
      {
        path: 'purchasing',
        name: 'Purchasing',
        component: () => import('@/modules/purchasing/PurchasingView.vue'),
        meta: { title: 'Satın Alma' }
      },
      // Technical Module Route
      {
        path: 'technical',
        name: 'Technical',
        component: () => import('@/views/Technical.vue'),
        meta: { title: 'Teknik Veri' }
      },
      // Inventory Module Route
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/modules/inventory/InventoryView.vue'),
        meta: { title: 'Envanter' }
      },
      // Materials Module Route
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('@/views/Materials.vue'),
        meta: { title: 'Malzeme Yönetimi' }
      },
      // Planning Module Route
      {
        path: 'planning',
        name: 'Planning',
        component: () => import('@/views/Planning.vue'),
        meta: { title: 'Planlama' }
      },
      // Reports Module Route
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Raporlar' }
      },
    ]
  },
  {
    path: '/auth',
    component: BlankLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { title: 'Giriş Yap' }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/Login.vue'),
        meta: { title: 'Kayıt Ol' }
      }
    ]
  },
  // Catchall 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/NotFound.vue'),
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