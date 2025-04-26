<template>
  <div class="orders-container">
    <div class="page-header">
      <h1>Siparişler</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openNewOrderModal">
          <i class="bi bi-plus-circle"></i> Yeni Sipariş
        </button>
        <button class="btn btn-outline-secondary" @click="refreshOrders">
          <i class="bi bi-arrow-clockwise"></i> Yenile
        </button>
      </div>
    </div>
    
    <div class="filter-area">
      <div class="row">
        <div class="col-md-8">
          <div class="filter-group">
            <div class="input-group search-box">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input 
                type="text" 
                class="form-control" 
                v-model="filterOptions.search" 
                placeholder="Sipariş no, müşteri adı veya ürün ara..." 
                @input="debouncedSearch"
              >
              <button 
                class="btn btn-outline-secondary" 
                type="button" 
                @click="resetFilters"
                v-if="isFiltered"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="filter-controls">
            <div class="status-filter">
              <select class="form-select" v-model="filterOptions.status" @change="applyFilters">
                <option value="">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="işlemde">İşlemde</option>
                <option value="tamamlandı">Tamamlandı</option>
                <option value="iptal">İptal</option>
              </select>
            </div>
            <div class="date-filter">
              <select class="form-select" v-model="filterOptions.dateRange" @change="applyFilters">
                <option value="all">Tüm Tarihler</option>
                <option value="today">Bugün</option>
                <option value="thisWeek">Bu Hafta</option>
                <option value="thisMonth">Bu Ay</option>
                <option value="custom">Özel Tarih</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
    </div>
    
    <div v-else-if="orders.length === 0" class="no-results">
      <div class="no-results-content">
        <i class="bi bi-inbox-fill"></i>
        <h3>Sipariş Bulunamadı</h3>
        <p v-if="isFiltered">Filtreleri değiştirerek tekrar deneyin veya yeni bir sipariş oluşturun.</p>
        <p v-else>Henüz hiç sipariş oluşturulmamış. Yeni sipariş oluşturmak için "Yeni Sipariş" butonunu kullanın.</p>
        <div class="no-results-actions">
          <button class="btn btn-primary" @click="openNewOrderModal">
            <i class="bi bi-plus-circle"></i> Yeni Sipariş
          </button>
          <button v-if="isFiltered" class="btn btn-outline-secondary" @click="resetFilters">
            <i class="bi bi-funnel"></i> Filtreleri Temizle
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="orders-list">
      <div class="table-responsive">
        <table class="table table-hover orders-table">
          <thead>
            <tr>
              <th @click="sortBy('orderNumber')" :class="{ 'sorting-active': sortConfig.key === 'orderNumber' }">
                Sipariş No
                <i v-if="sortConfig.key === 'orderNumber'" :class="getSortIconClass('orderNumber')"></i>
              </th>
              <th @click="sortBy('customer')" :class="{ 'sorting-active': sortConfig.key === 'customer' }">
                Müşteri
                <i v-if="sortConfig.key === 'customer'" :class="getSortIconClass('customer')"></i>
              </th>
              <th @click="sortBy('createdAt')" :class="{ 'sorting-active': sortConfig.key === 'createdAt' }">
                Sipariş Tarihi
                <i v-if="sortConfig.key === 'createdAt'" :class="getSortIconClass('createdAt')"></i>
              </th>
              <th @click="sortBy('deliveryDate')" :class="{ 'sorting-active': sortConfig.key === 'deliveryDate' }">
                Teslim Tarihi
                <i v-if="sortConfig.key === 'deliveryDate'" :class="getSortIconClass('deliveryDate')"></i>
              </th>
              <th @click="sortBy('amount')" :class="{ 'sorting-active': sortConfig.key === 'amount' }">
                Toplam Tutar
                <i v-if="sortConfig.key === 'amount'" :class="getSortIconClass('amount')"></i>
              </th>
              <th @click="sortBy('status')" :class="{ 'sorting-active': sortConfig.key === 'status' }">
                Durum
                <i v-if="sortConfig.key === 'status'" :class="getSortIconClass('status')"></i>
              </th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in sortedOrders" :key="order.id" @click="goToOrderDetail(order.id)">
              <td class="order-number">{{ order.orderNumber }}</td>
              <td class="customer-name">{{ order.customer }}</td>
              <td class="date-column">{{ formatDate(order.createdAt) }}</td>
              <td class="date-column">{{ formatDate(order.deliveryDate) }}</td>
              <td class="amount-column">{{ formatCurrency(order.amount) }}</td>
              <td class="status-column">
                <span class="status-badge" :class="getStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td class="actions-column" @click.stop>
                <div class="btn-group">
                  <button 
                    class="btn btn-sm btn-outline-primary" 
                    @click="goToOrderDetail(order.id)"
                    title="Detay Görüntüle"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-secondary" 
                    @click="printOrder(order.id)"
                    title="Yazdır"
                  >
                    <i class="bi bi-printer"></i>
                  </button>
                  <div class="btn-group">
                    <button 
                      type="button" 
                      class="btn btn-sm btn-outline-secondary dropdown-toggle"
                      data-bs-toggle="dropdown" 
                      aria-expanded="false"
                    >
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu">
                      <li>
                        <a class="dropdown-item" href="#" @click.prevent="duplicateOrder(order.id)">
                          <i class="bi bi-copy"></i> Kopyala
                        </a>
                      </li>
                      <li v-if="order.status !== 'iptal'">
                        <a class="dropdown-item text-danger" href="#" @click.prevent="confirmCancelOrder(order.id)">
                          <i class="bi bi-x-circle"></i> İptal Et
                        </a>
                      </li>
                      <li v-if="userHasAdminPermissions">
                        <a class="dropdown-item text-danger" href="#" @click.prevent="confirmDeleteOrder(order.id)">
                          <i class="bi bi-trash"></i> Sil
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="pagination-container">
        <div class="pagination-info">
          Toplam {{ totalOrders }} sipariş içinden {{ startIndex + 1 }}-{{ Math.min(endIndex, totalOrders) }} arası gösteriliyor
        </div>
        <nav aria-label="Sipariş Sayfaları">
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <a class="page-link" href="#" @click.prevent="goToPage(1)">
                <i class="bi bi-chevron-double-left"></i>
              </a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">
                <i class="bi bi-chevron-left"></i>
              </a>
            </li>
            <li 
              v-for="page in visiblePageNumbers" 
              :key="page" 
              class="page-item"
              :class="{ active: page === currentPage }"
            >
              <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">
                <i class="bi bi-chevron-right"></i>
              </a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <a class="page-link" href="#" @click.prevent="goToPage(totalPages)">
                <i class="bi bi-chevron-double-right"></i>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notification';
import { apiService } from '@/services/api-service';

// Router ve store'lar
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

// State tanımlamaları
const isLoading = ref(false);
const orders = ref([]);
const totalOrders = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = ref([5, 10, 20, 50]);

// Filtreleme state'i
const filterOptions = ref({
  search: '',
  status: '',
  dateRange: 'all',
  startDate: null,
  endDate: null
});

// Sıralama state'i
const sortConfig = ref({
  key: 'createdAt',
  direction: 'desc'
});

// Modal state'leri
const showNewOrderModal = ref(false);
const showConfirmModal = ref(false);
const confirmModalTitle = ref('');
const confirmModalMessage = ref('');
const confirmModalButtonText = ref('');
const confirmModalAction = ref('');
const confirmModalOrderId = ref(null);

// Hesaplanan özellikler
const userHasAdminPermissions = computed(() => {
  return authStore.hasRole(['admin', 'manager']);
});

const isFiltered = computed(() => {
  return filterOptions.value.search !== '' || 
         filterOptions.value.status !== '' || 
         filterOptions.value.dateRange !== 'all';
});

const totalPages = computed(() => {
  return Math.ceil(totalOrders.value / pageSize.value) || 1;
});

const startIndex = computed(() => {
  return (currentPage.value - 1) * pageSize.value;
});

const endIndex = computed(() => {
  return Math.min(startIndex.value + pageSize.value, totalOrders.value);
});

const visiblePageNumbers = computed(() => {
  const delta = 2;
  const pages = [];
  const left = currentPage.value - delta;
  const right = currentPage.value + delta + 1;
  
  for (let i = 1; i <= totalPages.value; i++) {
    if (
      i === 1 || 
      i === totalPages.value ||
      (i >= left && i < right)
    ) {
      pages.push(i);
    }
  }
  
  return pages;
});

const sortedOrders = computed(() => {
  const sortableOrders = [...orders.value];
  
  return sortableOrders.sort((a, b) => {
    let aValue = a[sortConfig.value.key];
    let bValue = b[sortConfig.value.key];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortConfig.value.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.value.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
});

// Lifecycle hooks
onMounted(async () => {
  await fetchOrders();
});

// Sayfa değiştiğinde filtreleri uygula
watch(currentPage, () => {
  fetchOrders();
});

// Debounced search için timer
let searchTimer = null;
function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    applyFilters();
  }, 300);
}

// Methods
async function fetchOrders() {
  isLoading.value = true;
  
  try {
    // API çağrısı parametrelerini hazırla
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      sort: `${sortConfig.value.key},${sortConfig.value.direction}`,
    };
    
    // Eğer filtreler varsa ekle
    if (filterOptions.value.search) {
      params.search = filterOptions.value.search;
    }
    
    if (filterOptions.value.status) {
      params.status = filterOptions.value.status;
    }
    
    if (filterOptions.value.startDate && filterOptions.value.endDate) {
      params.startDate = filterOptions.value.startDate;
      params.endDate = filterOptions.value.endDate;
    } else if (filterOptions.value.dateRange !== 'all') {
      // Özel tarih aralığı fonksiyonu ile tarih aralığını hesapla
      const dateRange = calculateDateRange(filterOptions.value.dateRange);
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    // Şimdilik örnek veri kullanıyoruz - gerçek API entegrasyonunda bu kısım değişecek
    // const response = await apiService.get('/orders', { params });
    // orders.value = response.data;
    // totalOrders.value = response.total;
    
    // Örnek veri
    orders.value = getDemoOrders();
    totalOrders.value = orders.value.length;
  } catch (error) {
    console.error('Siparişler yüklenirken hata:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Sipariş listesi yüklenirken bir hata oluştu.'
    });
  } finally {
    isLoading.value = false;
  }
}

function getDemoOrders() {
  return [
    {
      id: '1',
      orderNumber: 'ORD-2023-001',
      customer: 'METS Enerji Ltd. Şti.',
      createdAt: '2023-04-15T10:30:00',
      deliveryDate: '2023-05-15T00:00:00',
      amount: 125000,
      status: 'tamamlandı'
    },
    {
      id: '2',
      orderNumber: 'ORD-2023-002',
      customer: 'Teknik Yapı A.Ş.',
      createdAt: '2023-04-18T14:20:00',
      deliveryDate: '2023-05-20T00:00:00',
      amount: 86500,
      status: 'işlemde'
    },
    {
      id: '3',
      orderNumber: 'ORD-2023-003',
      customer: 'Güç Sistemleri Ltd.',
      createdAt: '2023-04-20T09:15:00',
      deliveryDate: '2023-05-25T00:00:00',
      amount: 42800,
      status: 'beklemede'
    }
  ];
}

function applyFilters() {
  currentPage.value = 1;
  fetchOrders();
}

function resetFilters() {
  filterOptions.value = {
    search: '',
    status: '',
    dateRange: 'all',
    startDate: null,
    endDate: null
  };
  applyFilters();
}

function sortBy(key) {
  if (sortConfig.value.key === key) {
    sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.value.key = key;
    sortConfig.value.direction = 'asc';
  }
  currentPage.value = 1;
  fetchOrders();
}

function getSortIconClass(key) {
  if (sortConfig.value.key === key) {
    return sortConfig.value.direction === 'asc' 
      ? 'bi bi-arrow-up' 
      : 'bi bi-arrow-down';
  }
  return '';
}

function getStatusClass(status) {
  switch(status.toLowerCase()) {
    case 'tamamlandı':
      return 'status-completed';
    case 'işlemde':
      return 'status-in-progress';
    case 'beklemede':
      return 'status-pending';
    case 'iptal':
      return 'status-canceled';
    default:
      return '';
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount);
}

function calculateDateRange(rangeType) {
  const today = new Date();
  const startDate = new Date();
  const endDate = new Date();
  
  switch (rangeType) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      // Haftanın başlangıcı (Pazartesi) ve bitişi (Pazar)
      const dayOfWeek = today.getDay() || 7; // Pazar günü 0 yerine 7 olarak değerlendiriyoruz
      startDate.setDate(today.getDate() - dayOfWeek + 1); // Pazartesi
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6); // Pazar
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      startDate.setDate(1); // Ayın ilk günü
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(today.getMonth() + 1, 0); // Ayın son günü
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      return { startDate: null, endDate: null };
  }
  
  return { 
    startDate: startDate.toISOString(), 
    endDate: endDate.toISOString() 
  };
}

// Navigasyon işlevleri
function goToOrderDetail(orderId) {
  router.push({ name: 'OrderDetail', params: { id: orderId } });
}

function openNewOrderModal() {
  router.push({ name: 'OrderCreate' });
}

function refreshOrders() {
  fetchOrders();
}

function printOrder(orderId) {
  console.log(`Sipariş yazdırılıyor: ${orderId}`);
  // Bu kısım gerçek bir yazdırma işlevi ile genişletilebilir
  // window.print() veya özel yazdırma hizmetiyle entegrasyon
}

function duplicateOrder(orderId) {
  console.log(`Sipariş kopyalanıyor: ${orderId}`);
  // Duplikasyon mantığı burada implemente edilecek
}

function confirmCancelOrder(orderId) {
  confirmModalTitle.value = 'Siparişi İptal Et';
  confirmModalMessage.value = 'Bu siparişi iptal etmek istediğinizden emin misiniz?';
  confirmModalButtonText.value = 'Siparişi İptal Et';
  confirmModalAction.value = 'cancel';
  confirmModalOrderId.value = orderId;
  showConfirmModal.value = true;
}

function confirmDeleteOrder(orderId) {
  confirmModalTitle.value = 'Siparişi Sil';
  confirmModalMessage.value = 'Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!';
  confirmModalButtonText.value = 'Siparişi Sil';
  confirmModalAction.value = 'delete';
  confirmModalOrderId.value = orderId;
  showConfirmModal.value = true;
}
</script>

<style scoped>
.orders-container {
  padding: 15px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-area {
  background-color: #f8f9fa;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  width: 100%;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.status-filter,
.date-filter {
  flex: 1;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.no-results {
  background-color: #f8f9fa;
  border-radius: 5px;
  padding: 40px;
  text-align: center;
}

.no-results-content {
  max-width: 500px;
  margin: 0 auto;
}

.no-results-content i {
  font-size: 48px;
  color: #adb5bd;
  margin-bottom: 15px;
}

.no-results-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.orders-table {
  margin-bottom: 0;
}

.sorting-active {
  color: #0d6efd;
}

.order-number {
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 50rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-completed {
  background-color: #d1e7dd;
  color: #0f5132;
}

.status-in-progress {
  background-color: #cfe2ff;
  color: #0a58ca;
}

.status-pending {
  background-color: #fff3cd;
  color: #664d03;
}

.status-canceled {
  background-color: #f8d7da;
  color: #842029;
}

.date-column {
  white-space: nowrap;
}

.amount-column {
  text-align: right;
  white-space: nowrap;
}

.actions-column {
  white-space: nowrap;
  width: 120px;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 0 15px;
}

.pagination-info {
  color: #6c757d;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
    gap: 15px;
  }
  
  .actions-column {
    width: auto;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .pagination-info {
    text-align: center;
  }
}
</style>