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
import { useRouter } from 'vue-router';
import { useOrders } from '../useOrders'; // Import yolunu düzenledim

// Router
const router = useRouter();

// Composable'dan state ve metodları al
const { 
  orders, 
  filters, 
  currentPage, 
  itemsPerPage, 
  filteredOrders, 
  totalPages,
  applyFilters,
  changePage,
  getStatusClass,
  getPriorityClass,
  getProgressBarClass
} = useOrders();

// Metodlar
const openNewOrderModal = () => {
  // Yeni sipariş oluşturma sayfasına yönlendir
  router.push({ name: 'OrderCreate' });
};

const editOrder = (order) => {
  console.log('Edit order:', order);
  // Düzenleme sayfasına yönlendir
  router.push({ 
    name: 'OrderDetail', 
    params: { id: order.id }, 
    query: { edit: true } 
  });
};
</script>

<style scoped>
/* Sipariş listesi özel stilleri */
.table th {
    background-color: var(--bs-light); /* Bootstrap light değişkeni */
}

.status-badge {
  display: inline-block;
  padding: 0.25em 0.6em;
  font-size: 0.75em;
  font-weight: 600;
  border-radius: 0.25rem;
  text-align: center;
}

.status-planned {
  background-color: #cfe2ff;
  color: #084298;
}

.status-in-progress {
  background-color: #fff3cd;
  color: #664d03;
}

.status-delayed {
  background-color: #f8d7da;
  color: #842029;
}

.status-completed {
  background-color: #d1e7dd;
  color: #0f5132;
}

.progress-thin {
  height: 6px;
}

/* Öncelik renkleri */
.priority-high {
  border-left: 4px solid #dc3545;
}

.priority-medium {
  border-left: 4px solid #fd7e14;
}

.priority-low {
  border-left: 4px solid #0dcaf0;
}
</style>