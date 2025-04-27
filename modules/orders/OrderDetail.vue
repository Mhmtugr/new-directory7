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
      
      <!-- Düzenleme Formu -->
      <div v-if="isEditing" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Sipariş Düzenleme</h5>
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-4">
              <label for="editDeliveryDate" class="form-label">Teslim Tarihi</label>
              <input 
                type="date" 
                id="editDeliveryDate" 
                v-model="editForm.deliveryDate" 
                class="form-control" 
              />
            </div>
            <div class="col-md-4">
              <label for="editPriority" class="form-label">Öncelik</label>
              <select id="editPriority" v-model="editForm.priority" class="form-select">
                <option value="high">Yüksek</option>
                <option value="medium">Orta</option>
                <option value="low">Düşük</option>
              </select>
            </div>
            <div class="col-md-4">
              <label for="editStatus" class="form-label">Durum</label>
              <select id="editStatus" v-model="editForm.status" class="form-select">
                <option value="planned">Planlandı</option>
                <option value="in_progress">Üretimde</option>
                <option value="delayed">Gecikmiş</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <label for="editCustomerContact" class="form-label">Müşteri İletişim</label>
              <input 
                type="text" 
                id="editCustomerContact" 
                v-model="editForm.customerContact" 
                class="form-control" 
                placeholder="İletişim kişisi"
              />
            </div>
            <div class="col-md-6">
              <label for="editNotes" class="form-label">Notlar</label>
              <textarea 
                id="editNotes" 
                v-model="editForm.notes" 
                class="form-control" 
                rows="2"
                placeholder="Sipariş ile ilgili notlar"
              ></textarea>
            </div>
          </div>
          <div class="d-flex gap-2 justify-content-end">
            <button @click="cancelEditing" class="btn btn-outline-secondary">
              İptal
            </button>
            <button @click="saveChanges" class="btn btn-primary" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status"></span>
              Kaydet
            </button>
          </div>
        </div>
      </div>
      
      <div class="row">
        <!-- Müşteri ve Sipariş Detayları -->
        <div class="col-lg-6">
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">Müşteri Bilgileri</h5>
            </div>
            <div class="card-body">
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">Müşteri:</div>
                <div class="col-sm-8">{{ order.customerInfo?.name || '-' }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">Döküman No:</div>
                <div class="col-sm-8">{{ order.customerInfo?.documentNo || '-' }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">Proje Adı:</div>
                <div class="col-sm-8">{{ order.customerInfo?.projectName || '-' }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">Sözleşme No:</div>
                <div class="col-sm-8">{{ order.customerInfo?.contractNo || '-' }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">İletişim Kişisi:</div>
                <div class="col-sm-8">{{ order.customerInfo?.contactPerson || '-' }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-4 fw-bold">E-posta:</div>
                <div class="col-sm-8">{{ order.customerInfo?.contactEmail || '-' }}</div>
              </div>
              <div class="row">
                <div class="col-sm-4 fw-bold">Telefon:</div>
                <div class="col-sm-8">{{ order.customerInfo?.contactPhone || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Hücre Listesi -->
        <div class="col-lg-6">
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Hücre Bilgileri</h5>
              <span class="badge bg-primary">{{ orderCellCount }} Hücre</span>
            </div>
            <div class="card-body">
              <div v-if="!order.cells || order.cells.length === 0" class="alert alert-info">
                Bu sipariş için hücre bilgisi mevcut değil.
              </div>
              <div v-else class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Hücre Tipi</th>
                      <th>Teknik Değerler</th>
                      <th>Miktar</th>
                      <th>Seri No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(cell, index) in order.cells" :key="index">
                      <td>{{ cell.productTypeCode }}</td>
                      <td>{{ cell.technicalValues }}</td>
                      <td>{{ cell.quantity }} Adet</td>
                      <td>{{ cell.serialNumber || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Üretim Aşamaları -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Üretim Aşamaları</h5>
        </div>
        <div class="card-body">
          <div v-if="!productionStages || productionStages.length === 0" class="alert alert-info">
            Henüz üretim aşaması kaydedilmemiş.
          </div>
          <div v-else class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Aşama</th>
                  <th>Durum</th>
                  <th>İlerleme</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Sorumlu</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stage in productionStages" :key="stage.id">
                  <td>{{ stage.stageName }}</td>
                  <td>
                    <span class="badge" :class="{
                      'bg-success': stage.status === 'completed',
                      'bg-primary': stage.status === 'in_progress',
                      'bg-warning': stage.status === 'delayed',
                      'bg-secondary': stage.status === 'not_started'
                    }">
                      {{ stage.status === 'completed' ? 'Tamamlandı' :
                         stage.status === 'in_progress' ? 'Devam Ediyor' :
                         stage.status === 'delayed' ? 'Gecikmiş' : 'Başlamadı' }}
                    </span>
                  </td>
                  <td>
                    <div class="progress">
                      <div 
                        class="progress-bar" 
                        role="progressbar" 
                        :style="`width: ${stage.progress}%`"
                        :class="{
                          'bg-success': stage.progress === 100,
                          'bg-info': stage.progress >= 75 && stage.progress < 100,
                          'bg-primary': stage.progress >= 50 && stage.progress < 75,
                          'bg-warning': stage.progress >= 25 && stage.progress < 50,
                          'bg-danger': stage.progress < 25
                        }"
                        :aria-valuenow="stage.progress" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        {{ stage.progress }}%
                      </div>
                    </div>
                  </td>
                  <td>{{ stage.startDate ? new Date(stage.startDate).toLocaleDateString('tr-TR') : '-' }}</td>
                  <td>{{ stage.endDate ? new Date(stage.endDate).toLocaleDateString('tr-TR') : '-' }}</td>
                  <td>{{ stage.assignedTo || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- İlgili Dokümanlar -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">İlgili Dokümanlar</h5>
          <button class="btn btn-sm btn-outline-primary" disabled>
            <i class="bi bi-upload me-1"></i> Doküman Yükle
          </button>
        </div>
        <div class="card-body">
          <div v-if="!documents || documents.length === 0" class="alert alert-info">
            Henüz doküman mevcut değil.
          </div>
          <div v-else class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Dosya Adı</th>
                  <th>Tip</th>
                  <th>Boyut</th>
                  <th>Tarih</th>
                  <th>Ekleyen</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.id">
                  <td>{{ doc.fileName }}</td>
                  <td>{{ getDocumentTypeText(doc.documentType) }}</td>
                  <td>{{ formatFileSize(doc.fileSize) }}</td>
                  <td>{{ new Date(doc.createdAt).toLocaleDateString('tr-TR') }}</td>
                  <td>{{ doc.createdBy }}</td>
                  <td>
                    <a :href="doc.downloadUrl" class="btn btn-sm btn-outline-primary me-1" title="İndir">
                      <i class="bi bi-download"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-danger" title="Sil" disabled>
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Notlar -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Notlar</h5>
        </div>
        <div class="card-body">
          <p v-if="order.notes" class="mb-0">{{ order.notes }}</p>
          <p v-else class="text-muted mb-0">Sipariş ile ilgili not bulunmuyor.</p>
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
              <strong>{{ order?.orderNo }}</strong> numaralı siparişi silmek istediğinizden emin misiniz?
            </p>
            <p class="text-danger">Bu işlem geri alınamaz!</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">İptal</button>
            <button type="button" class="btn btn-danger" @click="handleDeleteOrder" :disabled="isActionLoading">
              <span v-if="isActionLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Siparişi Sil
            </button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
    
    <!-- Kopyalama Onay Modalı -->
    <div v-if="showCloneModal" class="modal fade show" style="display: block;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Sipariş Kopyalama</h5>
            <button type="button" class="btn-close" @click="showCloneModal = false"></button>
          </div>
          <div class="modal-body">
            <p>
              <strong>{{ order?.orderNo }}</strong> numaralı siparişi kopyalamak istediğinizden emin misiniz?
            </p>
            <p>Yeni bir sipariş numarası ile aynı içerikte bir kopya oluşturulacaktır.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCloneModal = false">İptal</button>
            <button type="button" class="btn btn-primary" @click="handleCloneOrder" :disabled="isActionLoading">
              <span v-if="isActionLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Siparişi Kopyala
            </button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useOrderDetail } from './useOrderDetail';

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