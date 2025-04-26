<template>
  <div class="order-list-view">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Sipariş Yönetimi</h5>
        <button class="btn btn-primary" @click="openNewOrderModal">
          <i class="bi bi-plus"></i> Yeni Sipariş Ekle
        </button>
      </div>
      <div class="card-body">
        <!-- Filtreleme Bölümü -->
        <div class="mb-3">
          <div class="row g-2">
            <div class="col-md-4">
              <input type="text" class="form-control" placeholder="Sipariş No Ara..." v-model="filters.orderNumber">
            </div>
            <div class="col-md-3">
              <select class="form-select" v-model="filters.cellType">
                <option value="">Hücre Tipi Seçin</option>
                <option>RM 36 CB</option>
                <option>RM 36 LB</option>
                <option>RM 36 FL</option>
                <option>RMU</option>
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-select" v-model="filters.status">
                <option value="">Durum Seçin</option>
                <option>Planlandı</option>
                <option>Devam Ediyor</option>
                <option>Gecikmiş</option>
                <option>Tamamlandı</option>
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn btn-outline-secondary w-100" @click="applyFilters">Filtrele</button>
            </div>
          </div>
        </div>

        <!-- Sipariş Tablosu -->
        <div class="table-responsive">
          <table class="table table-hover custom-table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Hücre Tipi</th>
                <th>Miktar</th>
                <th>Planlanan Teslim</th>
                <th>Durum</th>
                <th>İlerleme</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              <!-- Dinamik Veri (v-for ile döngüye alınacak) -->
              <tr v-for="order in filteredOrders" :key="order.id" :class="getPriorityClass(order)">
                <td>{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td>{{ order.cellType }}</td>
                <td>{{ order.quantity }}</td>
                <td>{{ order.deliveryDate }}</td>
                <td><span :class="getStatusClass(order.status)">{{ order.status }}</span></td>
                <td>
                  <div class="progress progress-thin">
                    <div :class="getProgressBarClass(order.status)" role="progressbar" :style="{ width: order.progress + '%' }"></div>
                  </div>
                </td>
                <td>
                  <router-link :to="{ name: 'OrderDetail', params: { id: order.id } }" class="btn btn-sm btn-outline-primary me-1"><i class="bi bi-eye"></i></router-link>
                  <button class="btn btn-sm btn-outline-secondary" @click="editOrder(order)"><i class="bi bi-pencil"></i></button>
                </td>
              </tr>
              <tr v-if="filteredOrders.length === 0">
                 <td colspan="8" class="text-center">Gösterilecek sipariş bulunamadı.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sayfalama -->
        <nav aria-label="Page navigation" v-if="totalPages > 1">
          <ul class="pagination justify-content-center">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Önceki</a>
            </li>
            <li class="page-item" v-for="page in totalPages" :key="page" :class="{ active: currentPage === page }">
              <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Sonraki</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Yeni Sipariş Modalı (Ayrı bileşen olabilir) -->
    <!-- <NewOrderModal v-if="isModalOpen" @close="closeNewOrderModal" /> -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
// import apiService from '@/services/api-service'; // Gerçek API servisi
// import NewOrderModal from '@/components/orders/NewOrderModal.vue';

// Reaktif referanslar
const orders = ref([]);
const filters = ref({
  orderNumber: '',
  cellType: '',
  status: ''
});
const currentPage = ref(1);
const itemsPerPage = ref(10); // Sayfa başına öğe sayısı
const isModalOpen = ref(false);

// Veri Yükleme (Örnek)
onMounted(async () => {
  // orders.value = await apiService.getOrders();
  // Örnek veriler:
  orders.value = [
      { id: '#0424-1251', customer: 'AYEDAŞ', cellType: 'RM 36 CB', quantity: 1, deliveryDate: '15.11.2024', status: 'Gecikiyor', progress: 65, priority: 'high' },
      { id: '#0424-1245', customer: 'TEİAŞ', cellType: 'RM 36 CB', quantity: 1, deliveryDate: '20.11.2024', status: 'Devam Ediyor', progress: 45, priority: 'medium' },
      { id: '#0424-1239', customer: 'BEDAŞ', cellType: 'RM 36 LB', quantity: 1, deliveryDate: '25.11.2024', status: 'Devam Ediyor', progress: 30, priority: 'low' },
      { id: '#0424-1235', customer: 'OSMANİYE ELEKTRİK', cellType: 'RM 36 FL', quantity: 1, deliveryDate: '30.11.2024', status: 'Planlandı', progress: 10, priority: 'low' },
      { id: '#0424-1233', customer: 'ENERJİSA', cellType: 'RM 36 LB', quantity: 1, deliveryDate: '05.12.2024', status: 'Tamamlandı', progress: 100, priority: 'low' },
      // Daha fazla örnek veri eklenebilir
  ];
});

// Filtrelenmiş ve Sayfalanmış Siparişler
const filteredOrders = computed(() => {
  let filtered = orders.value;

  if (filters.value.orderNumber) {
    filtered = filtered.filter(order => order.id.toLowerCase().includes(filters.value.orderNumber.toLowerCase()));
  }
  if (filters.value.cellType) {
    filtered = filtered.filter(order => order.cellType === filters.value.cellType);
  }
  if (filters.value.status) {
    filtered = filtered.filter(order => order.status === filters.value.status);
  }

  // Sayfalama
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filtered.slice(start, end);
});

// Toplam Sayfa Sayısı
const totalPages = computed(() => {
    // Filtrelenmiş tüm veriler üzerinden hesaplama
    let filteredAll = orders.value;
    if (filters.value.orderNumber) { filteredAll = filteredAll.filter(order => order.id.toLowerCase().includes(filters.value.orderNumber.toLowerCase())); }
    if (filters.value.cellType) { filteredAll = filteredAll.filter(order => order.cellType === filters.value.cellType); }
    if (filters.value.status) { filteredAll = filteredAll.filter(order => order.status === filters.value.status); }
    return Math.ceil(filteredAll.length / itemsPerPage.value);
});

// Metodlar
const applyFilters = () => {
  currentPage.value = 1; // Filtre uygulandığında ilk sayfaya dön
};

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const openNewOrderModal = () => {
  isModalOpen.value = true;
  // Veya modalı göstermek için router'a push edilebilir
  // router.push({ name: 'OrderCreate' });
};

const closeNewOrderModal = () => {
  isModalOpen.value = false;
};

const editOrder = (order) => {
  console.log('Edit order:', order);
  // Düzenleme modalını aç veya düzenleme sayfasına yönlendir
  // router.push({ name: 'OrderDetail', params: { id: order.id }, query: { edit: true } });
};

// Yardımcı Fonksiyonlar (Stil sınıfları için)
const getStatusClass = (status) => {
  switch (status) {
    case 'Planlandı': return 'status-badge status-planned';
    case 'Devam Ediyor': return 'status-badge status-in-progress';
    case 'Gecikiyor': return 'status-badge status-delayed';
    case 'Tamamlandı': return 'status-badge status-completed';
    default: return 'status-badge';
  }
};

const getPriorityClass = (order) => {
  return order.priority ? `priority-${order.priority}` : '';
};

const getProgressBarClass = (status) => {
  switch (status) {
    case 'Planlandı': return 'progress-bar bg-info';
    case 'Devam Ediyor': return 'progress-bar bg-warning';
    case 'Gecikiyor': return 'progress-bar bg-danger';
    case 'Tamamlandı': return 'progress-bar bg-success';
    default: return 'progress-bar';
  }
};

</script>

<style scoped>
/* Sipariş listesi özel stilleri */
.table th {
    background-color: var(--bs-light); /* Bootstrap light değişkeni */
}
</style> 