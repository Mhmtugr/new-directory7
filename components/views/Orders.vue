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
            <div v-if="filterOptions.dateRange === 'custom'" class="custom-date">
              <div class="btn-group">
                <button class="btn btn-outline-secondary" @click="showDateRangePicker = !showDateRangePicker">
                  {{ formatDateRange(filterOptions.startDate, filterOptions.endDate) }}
                  <i class="bi bi-calendar"></i>
                </button>
                <button class="btn btn-outline-secondary" @click="clearDateRange">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              
              <!-- Date Picker Component (implement or use library) -->
              <div v-if="showDateRangePicker" class="date-picker-dropdown">
                <!-- Tarih aralığı seçici bileşeni -->
                <div class="date-range-controls">
                  <button class="btn btn-sm btn-primary" @click="applyDateRange">Uygula</button>
                  <button class="btn btn-sm btn-outline-secondary" @click="showDateRangePicker = false">İptal</button>
                </div>
              </div>
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
        <div class="page-size-selector">
          <select class="form-select form-select-sm" v-model="pageSize" @change="handlePageSizeChange">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          <span class="page-size-label">Adet / Sayfa</span>
        </div>
      </div>
    </div>
    
    <!-- New Order Modal -->
    <div v-if="showNewOrderModal" class="modal-backdrop" @click="closeNewOrderModal"></div>
    <div v-if="showNewOrderModal" class="modal show d-block" tabindex="-1">
      <div class="modal-dialog modal-lg" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Yeni Sipariş Oluştur</h5>
            <button type="button" class="btn-close" @click="closeNewOrderModal"></button>
          </div>
          <div class="modal-body">
            <!-- Yeni sipariş formu içeriği -->
            <form @submit.prevent="saveNewOrder">
              <div class="mb-3">
                <label for="customer" class="form-label">Müşteri</label>
                <select id="customer" class="form-select" v-model="newOrder.customerId" required>
                  <option value="" disabled>Müşteri Seçin</option>
                  <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                    {{ customer.name }}
                  </option>
                </select>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="orderDate" class="form-label">Sipariş Tarihi</label>
                    <input type="date" id="orderDate" class="form-control" v-model="newOrder.orderDate" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="deliveryDate" class="form-label">Teslim Tarihi</label>
                    <input type="date" id="deliveryDate" class="form-control" v-model="newOrder.deliveryDate" required>
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Sipariş Kalemleri</label>
                <div class="order-items">
                  <div v-for="(item, index) in newOrder.items" :key="index" class="order-item">
                    <div class="row">
                      <div class="col-md-4">
                        <div class="mb-2">
                          <select class="form-select" v-model="item.productId" required>
                            <option value="" disabled>Ürün Seçin</option>
                            <option v-for="product in products" :key="product.id" :value="product.id">
                              {{ product.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="mb-2">
                          <input type="number" class="form-control" v-model.number="item.quantity" min="1" required placeholder="Adet">
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="mb-2">
                          <div class="input-group">
                            <input type="number" class="form-control" v-model.number="item.unitPrice" required placeholder="Birim Fiyat">
                            <span class="input-group-text">₺</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="mb-2 item-total">
                          {{ formatCurrency(item.quantity * item.unitPrice) }}
                        </div>
                      </div>
                      <div class="col-md-1">
                        <button 
                          type="button" 
                          class="btn btn-outline-danger btn-sm item-remove" 
                          @click="removeOrderItem(index)"
                          :disabled="newOrder.items.length === 1"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="add-item-row">
                    <button type="button" class="btn btn-outline-primary btn-sm" @click="addOrderItem">
                      <i class="bi bi-plus"></i> Ürün Ekle
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="order-summary">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="orderNotes" class="form-label">Sipariş Notları</label>
                      <textarea id="orderNotes" class="form-control" v-model="newOrder.notes" rows="3"></textarea>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="order-totals">
                      <div class="total-row">
                        <span class="total-label">Ara Toplam:</span>
                        <span class="total-value">{{ formatCurrency(subtotal) }}</span>
                      </div>
                      <div class="total-row">
                        <span class="total-label">KDV (%18):</span>
                        <span class="total-value">{{ formatCurrency(taxAmount) }}</span>
                      </div>
                      <div class="total-row grand-total">
                        <span class="total-label">Genel Toplam:</span>
                        <span class="total-value">{{ formatCurrency(totalAmount) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeNewOrderModal">İptal</button>
            <button type="button" class="btn btn-primary" @click="saveNewOrder" :disabled="isSaving">
              <span v-if="isSaving" class="spinner-border spinner-border-sm"></span>
              Sipariş Oluştur
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-backdrop"></div>
    <div v-if="showConfirmModal" class="modal show d-block" tabindex="-1">
      <div class="modal-dialog" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ confirmModalTitle }}</h5>
            <button type="button" class="btn-close" @click="closeConfirmModal"></button>
          </div>
          <div class="modal-body">
            {{ confirmModalMessage }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeConfirmModal">İptal</button>
            <button 
              type="button" 
              class="btn" 
              :class="confirmModalAction === 'delete' ? 'btn-danger' : 'btn-warning'"
              @click="executeConfirmAction"
            >
              {{ confirmModalButtonText }}
            </button>
          </div>
        </div>
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
const isSaving = ref(false);
const orders = ref([]);
const customers = ref([]);
const products = ref([]);
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
const showDateRangePicker = ref(false);
const confirmModalTitle = ref('');
const confirmModalMessage = ref('');
const confirmModalButtonText = ref('');
const confirmModalAction = ref('');
const confirmModalOrderId = ref(null);

// Yeni sipariş nesnesi
const newOrder = ref({
  customerId: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  notes: '',
  items: [
    { productId: '', quantity: 1, unitPrice: 0 }
  ]
});

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
  
  // Sayfa numaraları arasına ... ekleme mantığı buraya eklenebilir
  
  return pages;
});

// Yeni sipariş bileşen hesaplamaları
const subtotal = computed(() => {
  return newOrder.value.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice || 0);
  }, 0);
});

const taxAmount = computed(() => {
  return subtotal.value * 0.18;
});

const totalAmount = computed(() => {
  return subtotal.value + taxAmount.value;
});

const sortedOrders = computed(() => {
  // orders array'inin bir kopyasını oluştur
  const sortableOrders = [...orders.value];
  
  // Sıralama fonksiyonu
  return sortableOrders.sort((a, b) => {
    let aValue = a[sortConfig.value.key];
    let bValue = b[sortConfig.value.key];
    
    // String ise büyük/küçük harf duyarsız sıralama
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
  await fetchCustomers();
  await fetchProducts();
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
    
    const response = await apiService.get('/orders', { params });
    orders.value = response.data;
    totalOrders.value = response.total;
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

async function fetchCustomers() {
  try {
    const response = await apiService.get('/customers');
    customers.value = response;
  } catch (error) {
    console.error('Müşteri listesi yüklenirken hata:', error);
  }
}

async function fetchProducts() {
  try {
    const response = await apiService.get('/products');
    products.value = response;
  } catch (error) {
    console.error('Ürün listesi yüklenirken hata:', error);
  }
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
  // Aynı key'e tıklandığında yön değiştir
  if (sortConfig.value.key === key) {
    sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.value.key = key;
    sortConfig.value.direction = 'asc';
  }
  currentPage.value = 1;
  fetchOrders();
}

// Sıralama ikon sınıfını hesapla
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
      return 'status-processing';
    case 'beklemede':
      return 'status-pending';
    case 'iptal':
      return 'status-cancelled';
    default:
      return '';
  }
}

// Sipariş detay sayfasına git
function goToOrderDetail(orderId) {
  router.push({ name: 'order-detail', params: { id: orderId } });
}

// Sipariş yazdırma işlemi
function printOrder(orderId) {
  // Yazdırma servisi
  window.open(`/api/orders/${orderId}/print`, '_blank');
}

function refreshOrders() {
  fetchOrders();
  notificationStore.showNotification({
    type: 'success',
    message: 'Sipariş listesi güncellendi.'
  });
}

// Yeni sipariş modalı
function openNewOrderModal() {
  showNewOrderModal.value = true;
}

function closeNewOrderModal() {
  showNewOrderModal.value = false;
  resetNewOrderForm();
}

function resetNewOrderForm() {
  newOrder.value = {
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: '',
    items: [
      { productId: '', quantity: 1, unitPrice: 0 }
    ]
  };
}

function addOrderItem() {
  newOrder.value.items.push({ productId: '', quantity: 1, unitPrice: 0 });
}

function removeOrderItem(index) {
  if (newOrder.value.items.length > 1) {
    newOrder.value.items.splice(index, 1);
  }
}

async function saveNewOrder() {
  // Form doğrulama
  if (!validateOrderForm()) {
    return;
  }
  
  isSaving.value = true;
  
  try {
    const response = await apiService.post('/orders', newOrder.value);
    
    notificationStore.showNotification({
      type: 'success',
      message: `#${response.orderNumber} numaralı sipariş başarıyla oluşturuldu.`
    });
    
    closeNewOrderModal();
    fetchOrders();
  } catch (error) {
    console.error('Sipariş oluşturulurken hata:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Sipariş oluşturulurken bir hata oluştu.'
    });
  } finally {
    isSaving.value = false;
  }
}

function validateOrderForm() {
  if (!newOrder.value.customerId) {
    notificationStore.showNotification({
      type: 'warning',
      message: 'Lütfen bir müşteri seçin.'
    });
    return false;
  }
  
  if (!newOrder.value.deliveryDate) {
    notificationStore.showNotification({
      type: 'warning',
      message: 'Lütfen bir teslim tarihi seçin.'
    });
    return false;
  }
  
  // Sipariş kalemlerini kontrol et
  for (let i = 0; i < newOrder.value.items.length; i++) {
    const item = newOrder.value.items[i];
    
    if (!item.productId) {
      notificationStore.showNotification({
        type: 'warning',
        message: `Lütfen ${i+1}. ürünü seçin.`
      });
      return false;
    }
    
    if (!item.quantity || item.quantity <= 0) {
      notificationStore.showNotification({
        type: 'warning',
        message: `Lütfen ${i+1}. ürün için geçerli bir miktar girin.`
      });
      return false;
    }
    
    if (!item.unitPrice || item.unitPrice <= 0) {
      notificationStore.showNotification({
        type: 'warning',
        message: `Lütfen ${i+1}. ürün için geçerli bir birim fiyat girin.`
      });
      return false;
    }
  }
  
  return true;
}

// Pagination işlevleri
function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
}

function handlePageSizeChange() {
  currentPage.value = 1;
  fetchOrders();
}

// Sipariş iptal ve silme onay işlemleri
function confirmCancelOrder(orderId) {
  confirmModalTitle.value = 'Sipariş İptali';
  confirmModalMessage.value = 'Bu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.';
  confirmModalButtonText.value = 'Siparişi İptal Et';
  confirmModalAction.value = 'cancel';
  confirmModalOrderId.value = orderId;
  showConfirmModal.value = true;
}

function confirmDeleteOrder(orderId) {
  confirmModalTitle.value = 'Sipariş Silme';
  confirmModalMessage.value = 'Bu siparişi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm veriler silinecektir.';
  confirmModalButtonText.value = 'Siparişi Sil';
  confirmModalAction.value = 'delete';
  confirmModalOrderId.value = orderId;
  showConfirmModal.value = true;
}

function closeConfirmModal() {
  showConfirmModal.value = false;
}

async function executeConfirmAction() {
  if (!confirmModalOrderId.value) return;
  
  const orderId = confirmModalOrderId.value;
  const action = confirmModalAction.value;
  
  try {
    if (action === 'cancel') {
      await apiService.patch(`/orders/${orderId}/cancel`);
      notificationStore.showNotification({
        type: 'success',
        message: 'Sipariş başarıyla iptal edildi.'
      });
    } else if (action === 'delete') {
      await apiService.delete(`/orders/${orderId}`);
      notificationStore.showNotification({
        type: 'success',
        message: 'Sipariş başarıyla silindi.'
      });
    }
    
    closeConfirmModal();
    fetchOrders();
  } catch (error) {
    console.error(`Sipariş ${action === 'cancel' ? 'iptal' : 'silme'} hatası:`, error);
    notificationStore.showNotification({
      type: 'error',
      message: `Sipariş ${action === 'cancel' ? 'iptal edilirken' : 'silinirken'} bir hata oluştu.`
    });
  }
}

// Sipariş kopyalama
async function duplicateOrder(orderId) {
  try {
    const response = await apiService.post(`/orders/${orderId}/duplicate`);
    
    notificationStore.showNotification({
      type: 'success',
      message: `#${response.orderNumber} numaralı sipariş başarıyla kopyalandı.`
    });
    
    fetchOrders();
  } catch (error) {
    console.error('Sipariş kopyalanırken hata:', error);
    notificationStore.showNotification({
      type: 'error',
      message: 'Sipariş kopyalanırken bir hata oluştu.'
    });
  }
}

// Tarih işlevleri
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Tarih Seçin';
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function calculateDateRange(rangeType) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  switch (rangeType) {
    case 'today':
      return {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString()
      };
      
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return {
        startDate: startOfWeek.toISOString(),
        endDate: endOfWeek.toISOString()
      };
    }
    
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      return {
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString()
      };
    }
    
    default:
      return {
        startDate: null,
        endDate: null
      };
  }
}

function applyDateRange() {
  // Burada datepicker'dan seçilen tarih aralığı alınıp filterOptions'a atanmalı
  // Örnek: filterOptions.value.startDate = selectedStartDate
  //        filterOptions.value.endDate = selectedEndDate
  
  showDateRangePicker.value = false;
  applyFilters();
}

function clearDateRange() {
  filterOptions.value.dateRange = 'all';
  filterOptions.value.startDate = null;
  filterOptions.value.endDate = null;
  applyFilters();
}

// Para birimi formatı
function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
}
</script>

<style scoped lang="scss">
.orders-container {
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

.filter-area {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .search-box {
      max-width: 100%;
    }
  }
  
  .filter-controls {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    
    @media (max-width: 768px) {
      margin-top: 1rem;
      justify-content: space-between;
    }
    
    .status-filter, .date-filter {
      width: 150px;
      
      @media (max-width: 576px) {
        width: 100%;
      }
    }
  }
  
  .custom-date {
    position: relative;
    margin-top: 0.5rem;
    
    .btn-group {
      width: 100%;
    }
    
    .date-picker-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 1000;
      min-width: 300px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 0.25rem;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      padding: 1rem;
      
      .date-range-controls {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
      }
    }
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.no-results {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  
  .no-results-content {
    text-align: center;
    max-width: 500px;
    
    i {
      font-size: 3rem;
      color: #6c757d;
      margin-bottom: 1rem;
    }
    
    h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    p {
      color: #6c757d;
      margin-bottom: 1.5rem;
    }
    
    .no-results-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
  }
}

.orders-table {
  margin-bottom: 1rem;
  
  th {
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 1.5rem;
    vertical-align: middle;
    
    &.sorting-active {
      color: var(--primary);
    }
    
    i {
      position: absolute;
      right: 0.5rem;
      font-size: 0.75rem;
    }
  }
  
  td {
    vertical-align: middle;
    
    &.order-number {
      font-weight: 600;
    }
    
    &.actions-column {
      width: 120px;
      text-align: right;
    }
  }
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  
  &.status-completed {
    background-color: rgba(25, 135, 84, 0.15);
    color: #198754;
  }
  
  &.status-processing {
    background-color: rgba(13, 110, 253, 0.15);
    color: #0d6efd;
  }
  
  &.status-pending {
    background-color: rgba(255, 193, 7, 0.15);
    color: #ffc107;
  }
  
  &.status-cancelled {
    background-color: rgba(220, 53, 69, 0.15);
    color: #dc3545;
  }
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
  
  .pagination-info {
    color: #6c757d;
    font-size: 0.875rem;
  }
  
  .page-size-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .form-select {
      width: auto;
    }
    
    .page-size-label {
      color: #6c757d;
      font-size: 0.875rem;
    }
  }
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
}

.order-items {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.25rem;
  
  .order-item {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed #dee2e6;
    
    &:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
  }
  
  .item-total {
    display: flex;
    align-items: center;
    height: 100%;
    font-weight: 600;
  }
  
  .add-item-row {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
  }
}

.order-summary {
  margin-top: 1.5rem;
  
  .order-totals {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.25rem;
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      
      &.grand-total {
        margin-top: 0.5rem;
        border-top: 1px solid #dee2e6;
        padding-top: 0.5rem;
        font-size: 1.1rem;
        font-weight: 600;
      }
    }
  }
}
</style>