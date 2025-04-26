<template>
  <div class="orders-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1>Siparişler</h1>
      <router-link :to="{ name: 'OrderCreate' }" class="btn btn-primary">
        <i class="bi bi-plus-circle me-2"></i>
        Yeni Sipariş
      </router-link>
    </div>

    <!-- Filtreler -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <label for="searchQuery" class="form-label">Arama</label>
            <input
              type="text"
              id="searchQuery"
              v-model="filters.searchQuery"
              class="form-control"
              placeholder="Sipariş No, Müşteri..."
            />
          </div>
          <div class="col-md-2">
            <label for="cellType" class="form-label">Hücre Tipi</label>
            <select id="cellType" v-model="filters.cellType" class="form-select">
              <option value="">Tümü</option>
              <option v-for="type in cellTypeList" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          <div class="col-md-2">
            <label for="status" class="form-label">Durum</label>
            <select id="status" v-model="filters.status" class="form-select">
              <option value="">Tümü</option>
              <option value="planned">Planlandı</option>
              <option value="in_progress">Üretimde</option>
              <option value="delayed">Gecikmiş</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
          <div class="col-md-2">
            <label for="priorityLevel" class="form-label">Öncelik</label>
            <select id="priorityLevel" v-model="filters.priorityLevel" class="form-select">
              <option value="">Tümü</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
          </div>
          <div class="col-md-3">
            <label for="customerName" class="form-label">Müşteri</label>
            <select id="customerName" v-model="filters.customerName" class="form-select">
              <option value="">Tümü</option>
              <option v-for="customer in customerList" :key="customer" :value="customer">
                {{ customer }}
              </option>
            </select>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-md-4">
            <div class="input-group">
              <span class="input-group-text">Tarih</span>
              <input
                type="date"
                v-model="filters.dateRange.start"
                class="form-control"
                placeholder="Başlangıç"
              />
              <input
                type="date"
                v-model="filters.dateRange.end"
                class="form-control"
                placeholder="Bitiş"
              />
            </div>
          </div>
          <div class="col-md-8 d-flex justify-content-end">
            <button @click="clearFilters" class="btn btn-outline-secondary">
              <i class="bi bi-x-circle me-1"></i>
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sipariş Tablosu -->
    <div class="card">
      <div class="card-body">
        <div v-if="isLoading" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
        
        <div v-else-if="paginatedOrders.length === 0" class="text-center py-4">
          <p class="mb-0">Sipariş bulunamadı.</p>
        </div>
        
        <div v-else>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th @click="sortBy('orderNo')" class="cursor-pointer">
                    Sipariş No
                    <i v-if="sorting.field === 'orderNo'" 
                       :class="sorting.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                  </th>
                  <th @click="sortBy('customerInfo.name')" class="cursor-pointer">
                    Müşteri
                    <i v-if="sorting.field === 'customerInfo.name'" 
                       :class="sorting.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                  </th>
                  <th>Hücreler</th>
                  <th @click="sortBy('orderDate')" class="cursor-pointer">
                    Sipariş Tarihi
                    <i v-if="sorting.field === 'orderDate'" 
                       :class="sorting.direction === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                  </th>
                  <th>Durum</th>
                  <th>İlerleme</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in paginatedOrders" :key="order.id">
                  <td>{{ order.orderNo }}</td>
                  <td>{{ order.customerInfo?.name }}</td>
                  <td>
                    <div v-if="order.cells && order.cells.length">
                      <div v-for="(cell, index) in order.cells" :key="index" class="mb-1">
                        {{ cell.productTypeCode }} ({{ cell.quantity }} adet)
                      </div>
                    </div>
                    <span v-else>-</span>
                  </td>
                  <td>{{ new Date(order.orderDate).toLocaleDateString('tr-TR') }}</td>
                  <td>
                    <span :class="'badge ' + getStatusBadgeClass(order.status)">
                      {{ getStatusText(order.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="progress">
                      <div 
                        class="progress-bar" 
                        :class="getProgressBarClass(order.progress)"
                        role="progressbar" 
                        :style="`width: ${order.progress}%`"
                        :aria-valuenow="order.progress" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        {{ order.progress }}%
                      </div>
                    </div>
                  </td>
                  <td>
                    <router-link :to="{ name: 'OrderDetail', params: { id: order.id }}" 
                              class="btn btn-sm btn-outline-primary me-1">
                      <i class="bi bi-eye"></i>
                    </router-link>
                    <button @click="confirmDelete(order)" class="btn btn-sm btn-outline-danger">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Sayfalama -->
          <div v-if="pagination.totalPages > 1" class="d-flex justify-content-center mt-3">
            <nav>
              <ul class="pagination">
                <li class="page-item" :class="{ disabled: pagination.currentPage === 1 }">
                  <a class="page-link" href="#" @click.prevent="prevPage">Önceki</a>
                </li>
                <li v-for="page in pagination.totalPages" :key="page" 
                    class="page-item" :class="{ active: page === pagination.currentPage }">
                  <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                </li>
                <li class="page-item" :class="{ disabled: pagination.currentPage === pagination.totalPages }">
                  <a class="page-link" href="#" @click.prevent="nextPage">Sonraki</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Silme Onay Modalı -->
    <div v-if="showDeleteModal" class="modal fade show" style="display: block;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Sipariş Silme</h5>
            <button type="button" class="btn-close" @click="showDeleteModal = false"></button>
          </div>
          <div class="modal-body">
            <p>
              <strong>{{ selectedOrder?.orderNo }}</strong> numaralı siparişi silmek istediğinizden emin misiniz?
            </p>
            <p class="text-danger">Bu işlem geri alınamaz!</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">İptal</button>
            <button type="button" class="btn btn-danger" @click="deleteOrder" :disabled="isDeleting">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Siparişi Sil
            </button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useOrders } from './useOrders';

// useOrders composable'dan gerekli state ve metotları al
const {
  orders,
  isLoading,
  filters,
  sorting,
  pagination,
  filteredOrders,
  paginatedOrders,
  customerList,
  cellTypeList,
  loadOrders,
  nextPage,
  prevPage,
  goToPage,
  sortBy,
  clearFilters,
  getStatusText,
  getStatusBadgeClass
} = useOrders();

// Silme işlemi için state
const showDeleteModal = ref(false);
const selectedOrder = ref(null);
const isDeleting = ref(false);

// Sipariş silme onay modalını göster
function confirmDelete(order) {
  selectedOrder.value = order;
  showDeleteModal.value = true;
}

// Sipariş silme işlemi
async function deleteOrder() {
  if (!selectedOrder.value) return;
  
  try {
    isDeleting.value = true;
    
    // Firebase kullanılabilirse
    if (window.firebase && window.firebase.firestore) {
      await window.firebase.firestore().collection('orders').doc(selectedOrder.value.id).delete();
    }
    
    // Listeyi yenile
    await loadOrders();
    
    // Modalı kapat
    showDeleteModal.value = false;
    selectedOrder.value = null;
  } catch (error) {
    console.error('Sipariş silinirken hata oluştu:', error);
    alert('Sipariş silinemedi: ' + error.message);
  } finally {
    isDeleting.value = false;
  }
}

// İlerleme çubuğu sınıfı
function getProgressBarClass(progress) {
  if (progress >= 100) return 'bg-success';
  if (progress >= 75) return 'bg-info';
  if (progress >= 50) return 'bg-primary';
  if (progress >= 25) return 'bg-warning';
  return 'bg-danger';
}

// Sayfa yüklendiğinde siparişleri yükle
loadOrders();
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.table th {
  white-space: nowrap;
}
</style>