<template>
  <div class="dashboard-view">
    <!-- Üst Bilgi ve İstatistik Özeti -->
    <div class="dashboard-header">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="page-title">Genel Bakış</h2>
          <p class="text-muted">Hoş geldiniz, bugün {{ formattedDate }}</p>
        </div>
        <div class="dashboard-actions">
          <div class="date-filter d-flex align-items-center me-2">
            <button class="btn btn-sm btn-outline-primary" @click="refreshDashboard">
              <i class="bi bi-arrow-clockwise"></i> Yenile
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- İstatistik Kartları -->
    <div class="row mb-4">
      <div class="col-md-3 col-sm-6 mb-3">
        <div class="stat-card card border-0 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2">Aktif Siparişler</h6>
                <h3 class="mb-0">{{ dashboardData.activeOrders || 0 }}</h3>
              </div>
              <div class="stat-icon bg-primary bg-opacity-10 rounded-circle">
                <i class="bi bi-file-earmark-text text-primary"></i>
              </div>
            </div>
            <div class="mt-3 d-flex align-items-center">
              <span :class="dashboardData.ordersTrend > 0 ? 'text-success' : 'text-danger'">
                <i :class="dashboardData.ordersTrend > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                {{ Math.abs(dashboardData.ordersTrend || 0) }}%
              </span>
              <span class="text-muted ms-2">geçen aya göre</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-sm-6 mb-3">
        <div class="stat-card card border-0 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2">Devam Eden Üretim</h6>
                <h3 class="mb-0">{{ dashboardData.ongoingProduction || 0 }}</h3>
              </div>
              <div class="stat-icon bg-warning bg-opacity-10 rounded-circle">
                <i class="bi bi-gear text-warning"></i>
              </div>
            </div>
            <div class="mt-3 d-flex align-items-center">
              <span :class="dashboardData.productionTrend > 0 ? 'text-success' : 'text-danger'">
                <i :class="dashboardData.productionTrend > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                {{ Math.abs(dashboardData.productionTrend || 0) }}%
              </span>
              <span class="text-muted ms-2">geçen aya göre</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-sm-6 mb-3">
        <div class="stat-card card border-0 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2">Geciken Siparişler</h6>
                <h3 class="mb-0">{{ dashboardData.delayedOrders || 0 }}</h3>
              </div>
              <div class="stat-icon bg-danger bg-opacity-10 rounded-circle">
                <i class="bi bi-exclamation-triangle text-danger"></i>
              </div>
            </div>
            <div class="mt-3 d-flex align-items-center">
              <span :class="dashboardData.delayedTrend < 0 ? 'text-success' : 'text-danger'">
                <i :class="dashboardData.delayedTrend < 0 ? 'bi bi-arrow-down' : 'bi bi-arrow-up'"></i>
                {{ Math.abs(dashboardData.delayedTrend || 0) }}%
              </span>
              <span class="text-muted ms-2">geçen aya göre</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-3 col-sm-6 mb-3">
        <div class="stat-card card border-0 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2">Tamamlanan Siparişler</h6>
                <h3 class="mb-0">{{ dashboardData.completedOrders || 0 }}</h3>
              </div>
              <div class="stat-icon bg-success bg-opacity-10 rounded-circle">
                <i class="bi bi-check-circle text-success"></i>
              </div>
            </div>
            <div class="mt-3 d-flex align-items-center">
              <span :class="dashboardData.completedTrend > 0 ? 'text-success' : 'text-danger'">
                <i :class="dashboardData.completedTrend > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                {{ Math.abs(dashboardData.completedTrend || 0) }}%
              </span>
              <span class="text-muted ms-2">geçen aya göre</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Grafikler ve Tablolar -->
    <div class="row">
      <!-- Üretim Durumu Grafiği -->
      <div class="col-lg-8 col-md-12 mb-4">
        <div class="card border-0 h-100">
          <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Üretim Durumu</h5>
            <div class="card-actions">
              <div class="btn-group">
                <button @click="changeChartPeriod('weekly')" :class="['btn btn-sm', chartPeriod === 'weekly' ? 'btn-primary' : 'btn-outline-primary']">Haftalık</button>
                <button @click="changeChartPeriod('monthly')" :class="['btn btn-sm', chartPeriod === 'monthly' ? 'btn-primary' : 'btn-outline-primary']">Aylık</button>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas ref="productionChart" height="300"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Hücre Tipi Dağılımı Grafiği -->
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card border-0 h-100">
          <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Hücre Tipi Dağılımı</h5>
          </div>
          <div class="card-body d-flex align-items-center justify-content-center">
            <div class="chart-container doughnut-chart-container">
              <canvas ref="cellTypeChart"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Kritik Malzeme Durumu Tablosu -->
      <div class="col-lg-6 col-md-12 mb-4">
        <div class="card border-0 h-100">
          <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Kritik Malzeme Durumu</h5>
            <router-link to="/materials" class="btn btn-sm btn-outline-primary">Tümünü Gör</router-link>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Malzeme Kodu</th>
                    <th>Malzeme Adı</th>
                    <th>Stok</th>
                    <th>İhtiyaç</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!dashboardData.criticalMaterials || dashboardData.criticalMaterials.length === 0">
                    <td colspan="5" class="text-center py-3">Kritik malzeme bulunmamaktadır.</td>
                  </tr>
                  <tr v-for="(material, index) in dashboardData.criticalMaterials" :key="index" 
                      :class="material.status === 'critical' ? 'table-danger' : 'table-warning'">
                    <td>{{ material.code }}</td>
                    <td class="text-nowrap text-truncate" style="max-width: 200px;">{{ material.name }}</td>
                    <td>{{ material.stock }}</td>
                    <td>{{ material.required }}</td>
                    <td>
                      <span :class="['badge', material.status === 'critical' ? 'bg-danger' : 'bg-warning']">
                        {{ material.status === 'critical' ? 'Kritik' : 'Eksik' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Son Uyarılar Listesi -->
      <div class="col-lg-6 col-md-12 mb-4">
        <div class="card border-0 h-100">
          <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Son Uyarılar</h5>
            <router-link to="/notifications" class="btn btn-sm btn-outline-primary">Tümünü Gör</router-link>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <div v-if="!dashboardData.alerts || dashboardData.alerts.length === 0" class="text-center p-4">
                <i class="bi bi-info-circle text-muted fs-3"></i>
                <p class="mt-2">Şu an için bildirim bulunmamaktadır.</p>
              </div>
              <a v-for="(alert, index) in dashboardData.alerts" :key="index" href="#" 
                 class="list-group-item list-group-item-action py-3 border-0" 
                 :class="{'border-danger border-start border-3': alert.type === 'danger', 'border-warning border-start border-3': alert.type === 'warning', 'border-info border-start border-3': alert.type === 'info'}">
                <div class="d-flex justify-content-between">
                  <h6 class="mb-1">{{ alert.title }}</h6>
                  <small :class="`text-${alert.type}`">{{ alert.time }}</small>
                </div>
                <p class="mb-1 text-break">{{ alert.message }}</p>
                <small class="text-muted">{{ alert.source }}</small>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import Chart from 'chart.js/auto';
import { useAuthStore } from '@/store/auth';

// References for chart instances
const productionChart = ref(null);
const cellTypeChart = ref(null);

// Chart instances
let productionChartInstance = null;
let cellTypeChartInstance = null;

// Chart period state
const chartPeriod = ref('monthly');

// Dummy data for demonstration
const dashboardData = ref({
  activeOrders: 24,
  ongoingProduction: 18,
  delayedOrders: 3,
  completedOrders: 42,
  ordersTrend: 5.2,
  productionTrend: -2.1,
  delayedTrend: -1.8,
  completedTrend: 8.7,
  criticalMaterials: [
    { code: '137998%', name: 'Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC', stock: 2, required: 8, status: 'critical' },
    { code: '144866%', name: 'KAP-80/190-95 Akım Trafosu', stock: 3, required: 5, status: 'warning' },
    { code: '157322%', name: 'Siemens 8DL5 Sekonder Kablo Seti', stock: 0, required: 2, status: 'critical' },
    { code: '119845%', name: 'LED Lamba Kiti (Kırmızı-Yeşil-Sarı) 24V', stock: 5, required: 10, status: 'warning' }
  ],
  alerts: [
    { 
      title: 'Teslim Tarihi Gecikmesi', 
      time: '1 saat önce', 
      message: 'Sipariş No: #0424-1251 - RM 36 CB hücresinin mekanik montajı gecikiyor.',
      source: 'Mekanik Üretim Birimi',
      type: 'danger'
    },
    { 
      title: 'Malzeme Eksikliği', 
      time: '3 saat önce', 
      message: 'Sipariş No: #0424-1245 için gerekli akım trafosu stokta yok.',
      source: 'Satın Alma Birimi',
      type: 'warning'
    },
    { 
      title: 'Yeni Sipariş', 
      time: '5 saat önce', 
      message: 'KEE Enerji için 12 hücrelik yeni bir sipariş oluşturuldu.',
      source: 'Satış Birimi',
      type: 'info'
    }
  ]
});

// Formatlı tarih
const formattedDate = computed(() => {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return today.toLocaleDateString('tr-TR', options);
});

// Dashboard verilerini yeniler
const refreshDashboard = async () => {
  console.log('Dashboard yenileniyor...');
  const isLoading = ref(true);
  
  try {
    await fetchDashboardData();
    updateCharts();
  } catch (error) {
    console.error('Dashboard yenilenirken hata:', error);
  } finally {
    isLoading.value = false;
  }
};

// Grafik periyodunu değiştirir
const changeChartPeriod = (period) => {
  chartPeriod.value = period;
  updateProductionChart();
};

// Üretim grafiğini oluşturur
const createProductionChart = () => {
  if (!productionChart.value) {
    console.warn('Production chart canvas not found');
    return;
  }

  const ctx = productionChart.value.getContext('2d');
  
  const data = {
    labels: chartPeriod.value === 'weekly' 
      ? ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] 
      : ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].slice(0, new Date().getMonth() + 1),
    datasets: [
      {
        label: 'Planlanan Üretim',
        data: chartPeriod.value === 'weekly' 
          ? [12, 15, 18, 14, 16, 10, 8]
          : [35, 42, 45, 50, 48, 55, 60, 58, 62, 65, 68, 70].slice(0, new Date().getMonth() + 1),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Gerçekleşen Üretim',
        data: chartPeriod.value === 'weekly' 
          ? [10, 13, 16, 14, 15, 9, 7]
          : [32, 38, 43, 45, 42, 50, 55, 52, 58, 60, 63, 65].slice(0, new Date().getMonth() + 1),
        borderColor: '#20c997',
        backgroundColor: 'rgba(32, 201, 151, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false
      },
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          color: getTextColor()
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: getGridLineColor()
        },
        ticks: {
          color: getLabelColor()
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: getLabelColor()
        }
      }
    }
  };

  try {
    productionChartInstance = new Chart(ctx, {
      type: 'line',
      data: data,
      options: options
    });
  } catch (error) {
    console.error('Production chart creation error:', error);
  }
};

// Hücre tipi grafiğini oluşturur
const createCellTypeChart = () => {
  if (!cellTypeChart.value) {
    console.warn('Cell type chart canvas not found');
    return;
  }

  const ctx = cellTypeChart.value.getContext('2d');
  
  const data = {
    labels: ['RM 36 CB', 'RM 36 Switch', 'RM 36 VT', 'RM 36 Cable', 'RM 36 M+F', 'RM 36 Others'],
    datasets: [
      {
        data: [35, 25, 15, 10, 8, 7],
        backgroundColor: [
          '#0d6efd',
          '#20c997',
          '#ffc107',
          '#fd7e14',
          '#6f42c1',
          '#adb5bd'
        ],
        borderWidth: 0,
        borderRadius: 3,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          boxWidth: 8,
          font: {
            size: 10
          },
          color: getTextColor()
        }
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            return `${tooltipItem.label}: ${tooltipItem.raw}%`;
          }
        }
      }
    },
    cutout: '65%'
  };

  try {
    cellTypeChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: options
    });
  } catch (error) {
    console.error('Cell type chart creation error:', error);
  }
};

function getTextColor() {
  return document.body.classList.contains('dark-mode') ? '#e2e2e2' : '#6c757d';
}

function getGridLineColor() {
  return document.body.classList.contains('dark-mode') 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(200, 200, 200, 0.15)';
}

function getLabelColor() {
  return document.body.classList.contains('dark-mode') ? '#adb5bd' : '#6c757d';
}

// Tüm grafikleri günceller
const updateCharts = () => {
  updateProductionChart();
  updateCellTypeChart();
};

// Üretim grafiğini günceller
const updateProductionChart = () => {
  if (productionChartInstance) {
    try {
      productionChartInstance.destroy();
    } catch (error) {
      console.error('Error destroying production chart:', error);
    }
  }
  createProductionChart();
};

// Hücre tipi grafiğini günceller
const updateCellTypeChart = () => {
  if (cellTypeChartInstance) {
    try {
      cellTypeChartInstance.destroy();
    } catch (error) {
      console.error('Error destroying cell type chart:', error);
    }
  }
  createCellTypeChart();
};

// Grafik periyodu değişikliklerini takip eder
watch(chartPeriod, () => {
  updateProductionChart();
});

// Tema değişikliklerini dinle ve grafikleri güncelle
const handleThemeChange = () => {
  updateCharts();
};

document.addEventListener('themeChanged', handleThemeChange);

onMounted(() => {
  setTimeout(() => {
    createProductionChart();
    createCellTypeChart();
  }, 0);
});

onBeforeUnmount(() => {
  if (productionChartInstance) {
    productionChartInstance.destroy();
    productionChartInstance = null;
  }
  
  if (cellTypeChartInstance) {
    cellTypeChartInstance.destroy();
    cellTypeChartInstance = null;
  }
  
  document.removeEventListener('themeChanged', handleThemeChange);
  window.removeEventListener('resize', resizeCharts);
});

const resizeCharts = () => {
  if (productionChartInstance) productionChartInstance.resize();
  if (cellTypeChartInstance) cellTypeChartInstance.resize();
};

const fetchDashboardData = async () => {
  try {
    // const response = await fetch('/api/dashboard');
    // dashboardData.value = await response.json();
    // updateCharts();
  } catch (error) {
    console.error('Dashboard verilerini çekerken hata oluştu:', error);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/base/variables" as vars;

.dashboard-view {
  .dashboard-header {
    margin-bottom: 1.5rem;
    
    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
  }
  
  .stat-card {
    box-shadow: var(--card-shadow);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    background-color: var(--card-bg);
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
    }
    
    .stat-icon {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      i {
        font-size: 1.5rem;
      }
    }
  }
  
  .card {
    box-shadow: var(--card-shadow);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--card-bg);
    
    .card-header {
      padding: 1.25rem 1.5rem;
      background-color: var(--card-bg);
      
      .card-title {
        font-weight: 600;
        color: var(--text-color);
      }
    }
    
    .card-body {
      padding: 1.25rem 1.5rem;
    }
  }
  
  .chart-container {
    position: relative;
    width: 100%;
    
    &.doughnut-chart-container {
      max-width: 300px;
      max-height: 300px;
      margin: 0 auto;
    }
    
    canvas {
      max-width: 100%;
    }
  }
  
  .table {
    color: var(--text-color);
    
    th {
      font-weight: 600;
      border-top: 0;
      padding: 1rem 1.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    
    td {
      padding: 1rem 1.5rem;
      vertical-align: middle;
      border-color: var(--border-color);
    }
  }
  
  .list-group-item {
    padding: 1.25rem 1.5rem;
    background-color: var(--card-bg);
    color: var(--text-color);
    border-color: var(--border-color);
    
    &:hover {
      background-color: var(--bg-hover);
    }
    
    h6 {
      font-weight: 600;
      color: var(--text-color);
    }
    
    p, small {
      color: var(--text-muted);
    }
  }
}

// Responsive styles
@media (max-width: 768px) {
  .dashboard-view {
    .dashboard-header {
      .page-title {
        font-size: 1.5rem;
      }
    }
    
    .stat-card {
      margin-bottom: 1rem;
    }
    
    .chart-container {
      &.doughnut-chart-container {
        max-width: 100%;
      }
    }
    
    .table {
      th, td {
        padding: 0.75rem 1rem;
      }
    }
    
    .list-group-item {
      padding: 1rem;
    }
  }
}
</style>