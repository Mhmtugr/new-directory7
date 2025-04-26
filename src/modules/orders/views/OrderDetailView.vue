<template>
  <div class="order-detail">
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
    </div>
    
    <div v-else-if="!order" class="alert alert-warning">
      Sipariş bulunamadı veya erişim yetkiniz yok.
    </div>
    
    <div v-else>
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1>{{ order.orderNo }}</h1>
          <p class="text-muted">
            Sipariş Tarihi: {{ new Date(order.orderDate).toLocaleDateString('tr-TR') }}
          </p>
        </div>
        
        <div class="d-flex gap-2">
          <button v-if="!isEditing" @click="startEditing" class="btn btn-outline-primary">
            <i class="bi bi-pencil me-1"></i> Düzenle
          </button>
          <button v-if="!isEditing" @click="confirmClone" class="btn btn-outline-secondary">
            <i class="bi bi-copy me-1"></i> Kopyala
          </button>
          <button v-if="!isEditing" @click="confirmDelete" class="btn btn-outline-danger">
            <i class="bi bi-trash me-1"></i> Sil
          </button>
          <router-link :to="{ name: 'Orders' }" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-1"></i> Siparişler
          </router-link>
        </div>
      </div>
      
      <!-- Durum Bilgisi -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col-md-3">
              <div class="d-flex align-items-center">
                <span class="me-2">Durum:</span>
                <span class="badge" :class="getStatusBadgeClass(order.status)">
                  {{ getStatusText(order.status) }}
                </span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex align-items-center">
                <span class="me-2">İlerleme:</span>
                <div class="progress flex-grow-1">
                  <div 
                    class="progress-bar" 
                    role="progressbar" 
                    :style="`width: ${orderProgress}%`"
                    :class="{
                      'bg-success': orderProgress === 100,
                      'bg-info': orderProgress >= 75 && orderProgress < 100,
                      'bg-primary': orderProgress >= 50 && orderProgress < 75,
                      'bg-warning': orderProgress >= 25 && orderProgress < 50,
                      'bg-danger': orderProgress < 25
                    }"
                    :aria-valuenow="orderProgress" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    {{ orderProgress }}%
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="d-flex align-items-center">
                <span class="me-2">Öncelik:</span>
                <span class="badge" :class="{
                  'bg-danger': order.priority === 'high',
                  'bg-warning': order.priority === 'medium',
                  'bg-info': order.priority === 'low'
                }">
                  {{ order.priority === 'high' ? 'Yüksek' : 
                     order.priority === 'medium' ? 'Orta' : 
                     order.priority === 'low' ? 'Düşük' : 'Normal' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ... Diğer bileşen içeriği ... -->
      
      <!-- Düzenleme Formu -->
      <div v-if="isEditing" class="card mb-4">
        <!-- ... Form içeriği ... -->
      </div>
      
      <div class="row">
        <!-- Müşteri ve Sipariş Detayları -->
        <div class="col-lg-6">
          <div class="card mb-4">
            <!-- ... Müşteri bilgileri ... -->
          </div>
        </div>
        
        <!-- Hücre Listesi -->
        <div class="col-lg-6">
          <div class="card mb-4">
            <!-- ... Hücre bilgileri ... -->
          </div>
        </div>
      </div>
      
      <!-- Üretim Aşamaları -->
      <div class="card mb-4">
        <!-- ... Üretim aşamaları ... -->
      </div>
      
      <!-- İlgili Dokümanlar -->
      <div class="card mb-4">
        <!-- ... Dokümanlar ... -->
      </div>
      
      <!-- Notlar -->
      <div class="card mb-4">
        <!-- ... Notlar ... -->
      </div>
    </div>
    
    <!-- Silme Onay Modalı -->
    <div v-if="showDeleteModal" class="modal fade show" style="display: block;">
      <!-- ... Modal içeriği ... -->
    </div>
    
    <!-- Kopyalama Onay Modalı -->
    <div v-if="showCloneModal" class="modal fade show" style="display: block;">
      <!-- ... Modal içeriği ... -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useOrderDetail } from '../useOrderDetail'; // Import yolunu düzelttim

const router = useRouter();

// useOrderDetail composable'dan gerekli state ve metotları al
const {
  order,
  isLoading,
  isEditing,
  productionStages,
  documents,
  editForm,
  orderProgress,
  orderCellCount,
  loadOrderDetail,
  startEditing,
  cancelEditing,
  saveChanges,
  deleteOrder,
  cloneOrder,
  getStatusText,
  getStatusBadgeClass
} = useOrderDetail();

// Modal state
const showDeleteModal = ref(false);
const showCloneModal = ref(false);
const isActionLoading = ref(false);

// Sipariş silme onayı
function confirmDelete() {
  showDeleteModal.value = true;
}

// Sipariş kopyalama onayı
function confirmClone() {
  showCloneModal.value = true;
}

// Sipariş silme işlemi
async function handleDeleteOrder() {
  try {
    isActionLoading.value = true;
    const result = await deleteOrder();
    
    if (result) {
      // Başarılı silme sonrası liste sayfasına yönlendir
      router.push({ name: 'Orders' });
    }
    
    showDeleteModal.value = false;
  } catch (error) {
    console.error('Sipariş silinirken hata:', error);
  } finally {
    isActionLoading.value = false;
  }
}

// Sipariş kopyalama işlemi
async function handleCloneOrder() {
  try {
    isActionLoading.value = true;
    const result = await cloneOrder();
    
    if (result) {
      // Başarılı kopyalama sonrası yeni siparişe yönlendir
      showCloneModal.value = false;
    }
  } catch (error) {
    console.error('Sipariş kopyalanırken hata:', error);
  } finally {
    isActionLoading.value = false;
  }
}

// Dosya boyutunu biçimlendir
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Doküman tipi metni
function getDocumentTypeText(type) {
  const types = {
    'contract': 'Sözleşme',
    'technical': 'Teknik Doküman',
    'drawing': 'Teknik Çizim',
    'invoice': 'Fatura',
    'report': 'Rapor'
  };
  
  return types[type] || type || 'Diğer';
}

// Sayfa yüklendiğinde sipariş detaylarını yükle
onMounted(() => {
  loadOrderDetail();
});
</script>

<style scoped>
.badge {
  font-size: 0.9rem;
}
</style>