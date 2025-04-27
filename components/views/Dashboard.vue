<template>
  <div class="dashboard-page">
    <h1 class="page-title">Dashboard</h1>

    <!-- Yükleniyor durumu -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
      <p class="mt-2">Veriler yükleniyor...</p>
    </div>

    <!-- Hata durumu -->
    <div v-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ error }}
    </div>

    <template v-if="!isLoading && !error">
      <!-- Stat Kartları -->
      <div class="row mb-4">
        <!-- Siparişler -->
        <div class="col-md-4">
          <div class="stat-card">
            <i class="bi bi-cart-check stat-icon"></i>
            <div class="stat-title">Toplam Sipariş</div>
            <div class="stat-value">{{ orderSummary.totalOrders }}</div>
            <div class="stat-change" :class="orderSummary.stats.growth >= 0 ? 'up' : 'down'">
              <i class="bi" :class="orderSummary.stats.growth >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
              <span class="trend-value">{{ Math.abs(orderSummary.stats.growth) }}% (geçen aya göre)</span>
            </div>
          </div>
        </div>

        <!-- Envanter -->
        <div class="col-md-4">
          <div class="stat-card stat-info">
            <i class="bi bi-box-seam stat-icon"></i>
            <div class="stat-title">Kritik Stok</div>
            <div class="stat-value">{{ inventorySummary.criticalItems }} kalem</div>
            <div class="stat-change">
              <span>Stok Devir Hızı: {{ inventorySummary.stats.turnover }} gün</span>
            </div>
          </div>
        </div>

        <!-- Üretim -->
        <div class="col-md-4">
          <div class="stat-card stat-success">
            <i class="bi bi-gear-wide-connected stat-icon"></i>
            <div class="stat-title">Aktif Üretim</div>
            <div class="stat-value">{{ productionSummary.activeTasks }} görev</div>
            <div class="stat-change up">
              <i class="bi bi-arrow-up"></i>
              <span class="trend-value">{{ productionSummary.stats.growth }}% (geçen aya göre)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grafik ve Aktivite Bölümü -->
      <div class="row mb-4">
        <!-- Haftalık Siparişler Grafiği -->
        <div class="col-md-8">
          <div class="dashboard-widget">
            <div class="widget-header">
              <h5>Haftalık Siparişler</h5>
              <div class="widget-actions">
                <button class="widget-action-btn">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
              </div>
            </div>
            <div class="widget-body">
              <base-chart
                v-if="weeklyOrdersData"
                type="line"
                :data="weeklyOrdersData"
                :options="chartOptions.weeklyOrders"
                height="300"
              />
            </div>
          </div>
        </div>

        <!-- Son Aktiviteler -->
        <div class="col-md-4">
          <div class="dashboard-widget">
            <div class="widget-header">
              <h5>Son Aktiviteler</h5>
              <div class="widget-actions">
                <button class="widget-action-btn">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
              </div>
            </div>
            <div class="widget-body p-0">
              <ul class="activity-list">
                <li v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                  <div class="activity-icon" :class="getActivityIconClass(activity.type)">
                    <i class="bi" :class="getActivityIcon(activity.type)"></i>
                  </div>
                  <div class="activity-content">
                    <h6 class="activity-title">{{ activity.title }}</h6>
                    <p class="activity-subtitle">{{ activity.description }}</p>
                  </div>
                  <div class="activity-time">
                    {{ formatTime(activity.timestamp) }}
                  </div>
                </li>
              </ul>
            </div>
            <div class="widget-footer">
              <a href="#" @click.prevent="viewAllActivities">Tüm Aktiviteleri Görüntüle</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Alt Kısım Grafikler ve Bildirimler -->
      <div class="row mb-4">
        <!-- Aylık Üretim Grafiği -->
        <div class="col-md-6">
          <div class="dashboard-widget">
            <div class="widget-header">
              <h5>Aylık Üretim</h5>
              <div class="widget-actions">
                <button class="widget-action-btn">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
              </div>
            </div>
            <div class="widget-body">
              <base-chart
                v-if="monthlyProductionData"
                type="bar"
                :data="monthlyProductionData"
                :options="chartOptions.monthlyProduction"
                height="250"
              />
            </div>
          </div>
        </div>

        <!-- Malzeme Kategorileri Grafiği -->
        <div class="col-md-3">
          <div class="dashboard-widget">
            <div class="widget-header">
              <h5>Malzeme Kategorileri</h5>
            </div>
            <div class="widget-body">
              <base-chart
                v-if="materialCategoriesData"
                type="doughnut"
                :data="materialCategoriesData"
                :options="chartOptions.materialCategories"
                height="250"
              />
            </div>
          </div>
        </div>

        <!-- Bildirimler -->
        <div class="col-md-3">
          <div class="dashboard-widget">
            <div class="widget-header">
              <h5>Bildirimler</h5>
              <div class="widget-actions">
                <button class="widget-action-btn">
                  <i class="bi bi-bell"></i>
                </button>
              </div>
            </div>
            <div class="widget-body p-0">
              <ul class="notification-list">
                <li v-for="notification in notifications" :key="notification.id" class="notification-item" :class="{ unread: !notification.read }">
                  <div class="notification-avatar" :class="`bg-${notification.type}`">
                    <i class="bi" :class="getNotificationIcon(notification.type)"></i>
                  </div>
                  <div class="notification-content">
                    <h6 class="notification-title">{{ notification.title }}</h6>
                    <p class="notification-subtitle">{{ notification.message }}</p>
                    <p class="notification-time">{{ formatTime(notification.timestamp) }}</p>
                  </div>
                </li>
              </ul>
            </div>
            <div class="widget-footer">
              <a href="#" @click.prevent="viewAllNotifications">Tüm Bildirimleri Görüntüle</a>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useDashboardData } from '@/modules/dashboard/useDashboardData';
import BaseChart from '@/components/ui/charts/BaseChart.vue';

// Dashboard verilerini al
const dashboardData = useDashboardData();
const isLoading = ref(true);
const error = ref(null);

// Verileri tutacak state değişkenleri
const orderSummary = ref({
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  delayedOrders: 0,
  stats: { growth: 0 }
});

const inventorySummary = ref({
  totalItems: 0,
  lowStockItems: 0,
  criticalItems: 0,
  onOrderItems: 0,
  stats: { turnover: 0, usage: 0 }
});

const productionSummary = ref({
  activeTasks: 0,
  completedTasks: 0,
  efficiency: 0,
  utilization: 0,
  stats: { growth: 0 }
});

const recentActivities = ref([]);
const notifications = ref([]);
const weeklyOrdersData = ref(null);
const monthlyProductionData = ref(null);
const materialCategoriesData = ref(null);

// Grafik seçenekleri
const chartOptions = reactive({
  weeklyOrders: {
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  },
  monthlyProduction: {
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  },
  materialCategories: {
    cutout: '60%',
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
            const value = context.raw;
            const percentage = Math.round((value * 100) / total);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  }
});

// Tüm verileri yükle
const loadAllData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Paralel olarak tüm verileri yükle
    const [orderData, inventoryData, productionData, activitiesData, notificationsData, weeklyOrders, monthlyProduction, materialCategories] = 
      await Promise.all([
        dashboardData.getOrderSummary(),
        dashboardData.getInventorySummary(),
        dashboardData.getProductionSummary(),
        dashboardData.getRecentActivities(),
        dashboardData.getNotifications(),
        dashboardData.getWeeklyOrdersData(),
        dashboardData.getMonthlyProductionData(),
        dashboardData.getMaterialCategoriesData()
      ]);

    // Verileri state'e aktar
    orderSummary.value = orderData;
    inventorySummary.value = inventoryData;
    productionSummary.value = productionData;
    recentActivities.value = activitiesData;
    notifications.value = notificationsData;
    weeklyOrdersData.value = weeklyOrders;
    monthlyProductionData.value = monthlyProduction;
    materialCategoriesData.value = materialCategories;

  } catch (err) {
    console.error('Dashboard verileri yüklenirken hata:', err);
    error.value = 'Dashboard verileri yüklenirken bir hata oluştu.';
  } finally {
    isLoading.value = false;
  }
};

// Yardımcı metodlar
const formatTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`;
  } else {
    return date.toLocaleDateString('tr-TR');
  }
};

const getActivityIcon = (type) => {
  switch (type) {
    case 'order': return 'bi-cart-check';
    case 'inventory': return 'bi-box-seam';
    case 'production': return 'bi-gear';
    case 'purchase': return 'bi-bag-check';
    default: return 'bi-check-circle';
  }
};

const getActivityIconClass = (type) => {
  switch (type) {
    case 'order': return 'bg-primary';
    case 'inventory': return 'bg-info';
    case 'production': return 'bg-success';
    case 'purchase': return 'bg-warning';
    default: return 'bg-secondary';
  }
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'info': return 'bi-info-circle';
    case 'warning': return 'bi-exclamation-triangle';
    case 'success': return 'bi-check-circle';
    case 'danger': return 'bi-x-circle';
    default: return 'bi-bell';
  }
};

const viewAllActivities = () => {
  // İleride aktiviteler sayfasına yönlendirme yapılabilir
  console.log('Tüm aktivitelere git');
};

const viewAllNotifications = () => {
  // İleride bildirimler sayfasına yönlendirme yapılabilir
  console.log('Tüm bildirimlere git');
};

// Komponent yüklendiğinde verileri yükle
onMounted(() => {
  loadAllData();
});
</script>

<style lang="scss" scoped>
// Stil kuralları main.scss içindeki dashboard-widgets ve diğer stil dosyalarında tanımlanmıştır

.page-title {
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

// Özel yerel stil gerekirse burada tanımlayın
</style>