<template>
  <div class="purchasing-container">
    <div class="page-header">
      <h1>Tedarik Yönetimi</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openNewPurchaseForm">
          <i class="bi bi-plus-lg"></i> Yeni Satın Alma
        </button>
        <button class="btn btn-outline-secondary" @click="refreshData">
          <i class="bi bi-arrow-clockwise"></i> Yenile
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
    </div>
    
    <div v-else class="purchasing-content">
      <!-- Filtreler -->
      <div class="filters-section">
        <div class="row">
          <div class="col-md-3">
            <div class="form-group">
              <label for="supplierFilter">Tedarikçi</label>
              <select id="supplierFilter" class="form-select" v-model="filters.supplier">
                <option value="">Tümü</option>
                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                  {{ supplier.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="col-md-3">
            <div class="form-group">
              <label for="statusFilter">Durum</label>
              <select id="statusFilter" class="form-select" v-model="filters.status">
                <option value="">Tümü</option>
                <option value="pending">Beklemede</option>
                <option value="ordered">Sipariş Verildi</option>
                <option value="received">Teslim Alındı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
          </div>
          <div class="col-md-3">
            <div class="form-group">
              <label for="dateRangeFilter">Tarih Aralığı</label>
              <select id="dateRangeFilter" class="form-select" v-model="filters.dateRange">
                <option value="all">Tümü</option>
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="quarter">Bu Çeyrek</option>
                <option value="custom">Özel Aralık</option>
              </select>
            </div>
          </div>
          <div class="col-md-3">
            <div class="form-group">
              <label>&nbsp;</label>
              <div class="d-flex">
                <button class="btn btn-secondary w-100" @click="applyFilters">
                  <i class="bi bi-funnel"></i> Filtrele
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ana Tablo -->
      <div class="data-table-container">
        <table class="table table-hover">
          <thead>
            <tr>
              <th @click="sortBy('orderNumber')">
                Sipariş No
                <i v-if="sortColumn === 'orderNumber'" :class="getSortIconClass"></i>
              </th>
              <th @click="sortBy('supplier')">
                Tedarikçi
                <i v-if="sortColumn === 'supplier'" :class="getSortIconClass"></i>
              </th>
              <th @click="sortBy('dateOrdered')">
                Sipariş Tarihi
                <i v-if="sortColumn === 'dateOrdered'" :class="getSortIconClass"></i>
              </th>
              <th @click="sortBy('expectedDelivery')">
                Tahmini Teslimat
                <i v-if="sortColumn === 'expectedDelivery'" :class="getSortIconClass"></i>
              </th>
              <th @click="sortBy('totalAmount')">
                Toplam Tutar
                <i v-if="sortColumn === 'totalAmount'" :class="getSortIconClass"></i>
              </th>
              <th @click="sortBy('status')">
                Durum
                <i v-if="sortColumn === 'status'" :class="getSortIconClass"></i>
              </th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in purchaseOrders" :key="order.id" @click="viewOrderDetails(order.id)">
              <td>{{ order.orderNumber }}</td>
              <td>{{ order.supplier }}</td>
              <td>{{ formatDate(order.dateOrdered) }}</td>
              <td>{{ formatDate(order.expectedDelivery) }}</td>
              <td>{{ formatCurrency(order.totalAmount) }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(order.status)">
                  {{ getStatusText(order.status) }}
                </span>
              </td>
              <td class="text-center" @click.stop>
                <div class="dropdown">
                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    İşlemler
                  </button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" @click.prevent="viewOrderDetails(order.id)">Detaylar</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="editOrder(order.id)">Düzenle</a></li>
                    <li v-if="order.status === 'pending'"><a class="dropdown-item" href="#" @click.prevent="cancelOrder(order.id)">İptal Et</a></li>
                    <li v-if="order.status === 'ordered'"><a class="dropdown-item" href="#" @click.prevent="markReceived(order.id)">Teslim Alındı İşaretle</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="printOrder(order.id)">Yazdır</a></li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr v-if="purchaseOrders.length === 0">
              <td colspan="7" class="text-center py-3">Satın alma siparişi bulunamadı</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Sayfalama -->
      <div class="pagination-container d-flex justify-content-between align-items-center">
        <div class="showing-info">
          {{ startItem }}-{{ endItem }}/{{ totalItems }} gösteriliyor
        </div>
        <nav aria-label="Sayfa navigasyonu">
          <ul class="pagination mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">Önceki</a>
            </li>
            <li v-for="page in pageNumbers" :key="page" class="page-item" :class="{ active: page === currentPage }">
              <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">Sonraki</a>
            </li>
          </ul>
        </nav>
        <div class="per-page-selector">
          <select v-model="itemsPerPage" class="form-select form-select-sm" @change="changeItemsPerPage">
            <option :value="10">10 / sayfa</option>
            <option :value="20">20 / sayfa</option>
            <option :value="50">50 / sayfa</option>
            <option :value="100">100 / sayfa</option>
          </select>
        </div>
      </div>

      <!-- Tedarikçi Performans Analizi -->
      <div class="supplier-analytics mt-4">
        <h3 class="section-title">Tedarikçi Performans Analizi</h3>
        <div class="row">
          <div class="col-lg-6">
            <div class="chart-container">
              <div class="chart-header d-flex justify-content-between align-items-center">
                <h4>Tedarikçi Dağılımı</h4>
                <div class="chart-actions">
                  <select v-model="supplierChartPeriod" class="form-select form-select-sm" @change="updateSupplierChart">
                    <option value="month">Bu Ay</option>
                    <option value="quarter">Bu Çeyrek</option>
                    <option value="year">Bu Yıl</option>
                  </select>
                </div>
              </div>
              <div class="chart-body" ref="supplierDistributionChart"></div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="chart-container">
              <div class="chart-header d-flex justify-content-between align-items-center">
                <h4>Tedarik Süresi</h4>
                <div class="chart-actions">
                  <select v-model="deliveryTimeChartType" class="form-select form-select-sm" @change="updateDeliveryTimeChart">
                    <option value="bar">Çubuk Grafik</option>
                    <option value="line">Çizgi Grafik</option>
                  </select>
                </div>
              </div>
              <div class="chart-body" ref="deliveryTimeChart"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notification';
import { apiService } from '@/services/api-service';
import * as echarts from 'echarts';

// Router ve store'lar
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

// State tanımlamaları
const isLoading = ref(true);
const purchaseOrders = ref([]);
const suppliers = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortColumn = ref('dateOrdered');
const sortDirection = ref('desc');
const supplierChart = ref(null);
const deliveryTimeChart = ref(null);
const supplierDistributionChart = ref(null);
const deliveryTimeChartRef = ref(null);
const supplierChartPeriod = ref('month');
const deliveryTimeChartType = ref('bar');

// Filtreler
const filters = ref({
  supplier: '',
  status: '',
  dateRange: 'month',
  startDate: null,
  endDate: null
});

// Sayfalama bilgileri
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value));
const startItem = computed(() => ((currentPage.value - 1) * itemsPerPage.value) + 1);
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value));

// Sayfa numaraları
const pageNumbers = computed(() => {
  const pages = [];
  const maxPages = 5;
  const startPage = Math.max(1, currentPage.value - Math.floor(maxPages / 2));
  const endPage = Math.min(totalPages.value, startPage + maxPages - 1);
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return pages;
});

// Sıralama ikon sınıfı
const getSortIconClass = computed(() => {
  return sortDirection.value === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down';
});

// Veri yükleme işlevi
async function fetchPurchaseOrders() {
  isLoading.value = true;
  
  try {
    // Satın alma siparişlerini getir
    const response = await apiService.get('/purchasing/orders', {
      params: {
        page: currentPage.value,
        limit: itemsPerPage.value,
        sort: sortColumn.value,
        direction: sortDirection.value,
        supplier: filters.value.supplier,
        status: filters.value.status,
        dateRange: filters.value.dateRange,
        startDate: filters.value.startDate,
        endDate: filters.value.endDate
      }
    });
    
    purchaseOrders.value = response.data;
    totalItems.value = response.totalItems;
    
    // Tedarikçileri getir
    const suppliersResponse = await apiService.get('/purchasing/suppliers');
    suppliers.value = suppliersResponse;
    
    // Grafik verilerini getir ve grafikleri yükle
    await loadChartData();
    
  } catch (error) {
    console.error('Satın alma siparişleri yüklenirken hata:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Satın alma verileri yüklenirken bir hata oluştu.'
    });
  } finally {
    isLoading.value = false;
  }
}

// Grafikler için veri yükleme
async function loadChartData() {
  try {
    // Tedarikçi dağılımı verisi
    const supplierDistributionData = await apiService.get(`/purchasing/analytics/supplier-distribution?period=${supplierChartPeriod.value}`);
    initSupplierDistributionChart(supplierDistributionData);
    
    // Teslimat süresi verisi
    const deliveryTimeData = await apiService.get('/purchasing/analytics/delivery-time');
    initDeliveryTimeChart(deliveryTimeData);
    
  } catch (error) {
    console.error('Grafik verileri yüklenirken hata:', error);
  }
}

// Tedarikçi dağılımı grafiği
function initSupplierDistributionChart(data) {
  if (supplierChart.value) {
    supplierChart.value.dispose();
  }
  
  if (!supplierDistributionChart.value) return;
  
  supplierChart.value = echarts.init(supplierDistributionChart.value);
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      type: 'scroll',
      data: data.map(item => item.name)
    },
    series: [
      {
        name: 'Tedarikçi Dağılımı',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };
  
  supplierChart.value.setOption(option);
}

// Teslimat süresi grafiği
function initDeliveryTimeChart(data) {
  if (deliveryTimeChart.value) {
    deliveryTimeChart.value.dispose();
  }
  
  if (!deliveryTimeChartRef.value) return;
  
  deliveryTimeChart.value = echarts.init(deliveryTimeChartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        return `${params[0].name}<br/>Ortalama: ${params[0].value} gün`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.suppliers
    },
    yAxis: {
      type: 'value',
      name: 'Ortalama Gün'
    },
    series: [
      {
        name: 'Ortalama Teslimat Süresi',
        type: deliveryTimeChartType.value,
        data: data.deliveryTimes,
        itemStyle: {
          color: '#0d6efd'
        }
      }
    ]
  };
  
  deliveryTimeChart.value.setOption(option);
}

// Grafikleri güncelleme işlevleri
async function updateSupplierChart() {
  try {
    const supplierDistributionData = await apiService.get(`/purchasing/analytics/supplier-distribution?period=${supplierChartPeriod.value}`);
    initSupplierDistributionChart(supplierDistributionData);
  } catch (error) {
    console.error('Tedarikçi grafiği güncellenirken hata:', error);
  }
}

async function updateDeliveryTimeChart() {
  try {
    const deliveryTimeData = await apiService.get('/purchasing/analytics/delivery-time');
    initDeliveryTimeChart(deliveryTimeData);
  } catch (error) {
    console.error('Teslimat süresi grafiği güncellenirken hata:', error);
  }
}

// Filtreleri uygula
function applyFilters() {
  currentPage.value = 1;
  fetchPurchaseOrders();
}

// Sıralama işlevi
function sortBy(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
  
  fetchPurchaseOrders();
}

// Sayfalama işlevleri
function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchPurchaseOrders();
}

function changeItemsPerPage() {
  currentPage.value = 1;
  fetchPurchaseOrders();
}

// Veri yenileme
function refreshData() {
  fetchPurchaseOrders();
  notificationStore.showNotification({
    type: 'success',
    message: 'Tedarik verileri güncellendi'
  });
}

// Yeni satın alma formu açma
function openNewPurchaseForm() {
  // Modal açma veya yeni sayfaya yönlendirme
  // Bu örnek için uyarı gösteriyoruz
  notificationStore.showNotification({
    type: 'info',
    message: 'Yeni satın alma formu açılıyor...'
  });
}

// Sipariş detaylarını görüntüleme
function viewOrderDetails(id) {
  notificationStore.showNotification({
    type: 'info',
    message: `Sipariş detayları görüntüleniyor: ${id}`
  });
}

// Sipariş düzenleme
function editOrder(id) {
  notificationStore.showNotification({
    type: 'info',
    message: `Sipariş düzenleniyor: ${id}`
  });
}

// Siparişi iptal etme
async function cancelOrder(id) {
  try {
    await apiService.put(`/purchasing/orders/${id}/cancel`);
    notificationStore.showNotification({
      type: 'success',
      message: 'Sipariş iptal edildi'
    });
    fetchPurchaseOrders();
  } catch (error) {
    console.error('Sipariş iptal edilirken hata:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Sipariş iptal edilemedi'
    });
  }
}

// Siparişi teslim alındı olarak işaretleme
async function markReceived(id) {
  try {
    await apiService.put(`/purchasing/orders/${id}/receive`);
    notificationStore.showNotification({
      type: 'success',
      message: 'Sipariş teslim alındı olarak işaretlendi'
    });
    fetchPurchaseOrders();
  } catch (error) {
    console.error('Sipariş güncelleme hatası:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Sipariş durumu güncellenemedi'
    });
  }
}

// Siparişi yazdırma
function printOrder(id) {
  notificationStore.showNotification({
    type: 'info',
    message: `Sipariş yazdırılıyor: ${id}`
  });
}

// Yardımcı fonksiyonlar
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
}

function getStatusClass(status) {
  switch(status) {
    case 'pending': return 'status-pending';
    case 'ordered': return 'status-ordered';
    case 'received': return 'status-received';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-default';
  }
}

function getStatusText(status) {
  switch(status) {
    case 'pending': return 'Beklemede';
    case 'ordered': return 'Sipariş Verildi';
    case 'received': return 'Teslim Alındı';
    case 'cancelled': return 'İptal Edildi';
    default: return status;
  }
}

// Pencere boyutu değişikliğinde grafikleri yeniden boyutlandırma
function handleResize() {
  if (supplierChart.value) {
    supplierChart.value.resize();
  }
  if (deliveryTimeChart.value) {
    deliveryTimeChart.value.resize();
  }
}

// Component lifecycle
onMounted(() => {
  fetchPurchaseOrders();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (supplierChart.value) {
    supplierChart.value.dispose();
  }
  if (deliveryTimeChart.value) {
    deliveryTimeChart.value.dispose();
  }
});
</script>

<style scoped lang="scss">
.purchasing-container {
  padding: 1rem 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.filters-section {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  
  .form-group {
    margin-bottom: 0;
    
    label {
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }
  }
}

.data-table-container {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  overflow-x: auto;
  
  th {
    cursor: pointer;
    position: relative;
    white-space: nowrap;
    
    i {
      margin-left: 0.25rem;
      font-size: 0.75rem;
    }
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  
  tbody tr {
    cursor: pointer;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
  }
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  
  &.status-pending {
    background-color: rgba(255, 193, 7, 0.15);
    color: #ffc107;
  }
  
  &.status-ordered {
    background-color: rgba(13, 110, 253, 0.15);
    color: #0d6efd;
  }
  
  &.status-received {
    background-color: rgba(25, 135, 84, 0.15);
    color: #198754;
  }
  
  &.status-cancelled {
    background-color: rgba(220, 53, 69, 0.15);
    color: #dc3545;
  }
}

.pagination-container {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  padding: 0.75rem 1rem;
  
  .showing-info {
    font-size: 0.875rem;
    color: #6c757d;
  }
  
  .page-link {
    color: #0d6efd;
    
    &:focus {
      box-shadow: none;
    }
  }
  
  .page-item.active .page-link {
    background-color: #0d6efd;
    border-color: #0d6efd;
  }
  
  .per-page-selector {
    width: 120px;
  }
}

.supplier-analytics {
  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  .chart-container {
    background-color: #fff;
    border-radius: 0.5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    padding: 1rem;
    margin-bottom: 1.5rem;
    
    .chart-header {
      margin-bottom: 1rem;
      
      h4 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
      }
      
      .chart-actions {
        width: 140px;
      }
    }
    
    .chart-body {
      height: 300px;
    }
  }
}
</style>