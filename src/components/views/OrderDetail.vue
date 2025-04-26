<template>
  <div class="order-detail-container">
    <div class="page-header">
      <div>
        <h1>Sipariş Detayı</h1>
        <div class="d-flex align-items-center">
          <span class="order-number">{{ order?.orderNumber || '-' }}</span>
          <span class="status-badge ms-2" :class="getStatusClass(order?.status)">
            {{ order?.status || 'Yükleniyor...' }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline-secondary me-2" @click="goBack">
          <i class="bi bi-arrow-left"></i> Geri
        </button>
        <div class="btn-group">
          <button class="btn btn-primary" @click="printOrder">
            <i class="bi bi-printer"></i> Yazdır
          </button>
          <button type="button" class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="visually-hidden">Menü</span>
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" @click.prevent="duplicateOrder"><i class="bi bi-copy"></i> Kopyala</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="editOrder"><i class="bi bi-pencil"></i> Düzenle</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="exportAsPdf"><i class="bi bi-file-earmark-pdf"></i> PDF Olarak İndir</a></li>
            <li><hr class="dropdown-divider"></li>
            <li v-if="order?.status !== 'iptal'"><a class="dropdown-item text-danger" href="#" @click.prevent="confirmCancel"><i class="bi bi-x-circle"></i> İptal Et</a></li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="loading-overlay" v-if="loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
    </div>
    
    <div class="order-content" v-else>
      <div class="row">
        <div class="col-lg-8">
          <div class="card mb-4">
            <div class="card-header bg-transparent">
              <h5 class="card-title mb-0">Sipariş Bilgileri</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="info-group">
                    <span class="info-label">Müşteri</span>
                    <span class="info-value">{{ order?.customer?.name || '-' }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Sipariş Tarihi</span>
                    <span class="info-value">{{ formatDate(order?.orderDate) }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Oluşturan</span>
                    <span class="info-value">{{ order?.createdBy || '-' }}</span>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="info-group">
                    <span class="info-label">İletişim</span>
                    <span class="info-value">{{ order?.customer?.contactPerson || '-' }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Teslim Tarihi</span>
                    <span class="info-value">{{ formatDate(order?.deliveryDate) }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Son Güncelleme</span>
                    <span class="info-value">{{ formatDateWithTime(order?.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card mb-4">
            <div class="card-header bg-transparent">
              <h5 class="card-title mb-0">Sipariş Kalemleri</h5>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ürün Kodu</th>
                      <th>Ürün Adı</th>
                      <th class="text-center">Miktar</th>
                      <th class="text-end">Birim Fiyat</th>
                      <th class="text-end">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in order?.items" :key="index">
                      <td>{{ index + 1 }}</td>
                      <td>{{ item.productCode }}</td>
                      <td>{{ item.productName }}</td>
                      <td class="text-center">{{ item.quantity }} {{ item.unit || 'adet' }}</td>
                      <td class="text-end">{{ formatCurrency(item.unitPrice) }}</td>
                      <td class="text-end">{{ formatCurrency(item.quantity * item.unitPrice) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4"></td>
                      <td class="text-end fw-bold">Ara Toplam:</td>
                      <td class="text-end">{{ formatCurrency(subtotal) }}</td>
                    </tr>
                    <tr>
                      <td colspan="4"></td>
                      <td class="text-end fw-bold">KDV (18%):</td>
                      <td class="text-end">{{ formatCurrency(taxAmount) }}</td>
                    </tr>
                    <tr class="table-active">
                      <td colspan="4"></td>
                      <td class="text-end fw-bold">Genel Toplam:</td>
                      <td class="text-end fw-bold">{{ formatCurrency(totalAmount) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          
          <div class="card mb-4">
            <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">Notlar ve Belgeler</h5>
            </div>
            <div class="card-body">
              <div class="order-notes mb-4">
                <h6>Sipariş Notları</h6>
                <p class="notes-content">{{ order?.notes || 'Bu sipariş için not bulunmamaktadır.' }}</p>
              </div>
              
              <div class="attached-files">
                <h6>Ekli Dosyalar</h6>
                <div v-if="order?.attachments?.length" class="attached-files-list">
                  <div v-for="(file, index) in order.attachments" :key="index" class="attached-file">
                    <i class="bi" :class="getFileIcon(file.type)"></i>
                    <span class="file-name">{{ file.name }}</span>
                    <div class="file-actions">
                      <button class="btn btn-sm btn-link" @click="viewFile(file)">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-link" @click="downloadFile(file)">
                        <i class="bi bi-download"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="no-files">
                  <i class="bi bi-file-earmark-x text-muted"></i>
                  <p>Bu sipariş için eklenmiş dosya bulunmamaktadır.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-4">
          <div class="card mb-4">
            <div class="card-header bg-transparent">
              <h5 class="card-title mb-0">Müşteri Bilgileri</h5>
            </div>
            <div class="card-body">
              <div class="customer-info">
                <div class="info-group">
                  <span class="info-label">Firma Adı</span>
                  <span class="info-value">{{ order?.customer?.name || '-' }}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Vergi No</span>
                  <span class="info-value">{{ order?.customer?.taxNumber || '-' }}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Telefon</span>
                  <span class="info-value">{{ order?.customer?.phone || '-' }}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">E-posta</span>
                  <span class="info-value">{{ order?.customer?.email || '-' }}</span>
                </div>
                <div class="info-group">
                  <span class="info-label">Adres</span>
                  <span class="info-value address">{{ order?.customer?.address || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card mb-4">
            <div class="card-header bg-transparent">
              <h5 class="card-title mb-0">Sipariş Durumu</h5>
            </div>
            <div class="card-body">
              <div class="order-status-timeline">
                <div 
                  v-for="(status, index) in orderStatusHistory" 
                  :key="index" 
                  class="status-item"
                  :class="{ 'completed': isStatusCompleted(status.status) }"
                >
                  <div class="status-indicator">
                    <i class="bi" :class="getStatusIcon(status.status)"></i>
                  </div>
                  <div class="status-content">
                    <div class="status-title">{{ getStatusTitle(status.status) }}</div>
                    <div class="status-date">{{ formatDateWithTime(status.date) }}</div>
                    <div class="status-user" v-if="status.user">{{ status.user }}</div>
                  </div>
                </div>
              </div>
              
              <div class="mt-4">
                <label for="statusUpdate" class="form-label">Durumu Güncelle</label>
                <select id="statusUpdate" class="form-select" v-model="selectedStatus">
                  <option value="">Durum seçin</option>
                  <option value="onaylandı">Onaylandı</option>
                  <option value="hazırlanıyor">Hazırlanıyor</option>
                  <option value="üretimde">Üretimde</option>
                  <option value="sevkiyata_hazır">Sevkiyata Hazır</option>
                  <option value="sevkedildi">Sevk Edildi</option>
                  <option value="tamamlandı">Tamamlandı</option>
                  <option value="iptal">İptal</option>
                </select>
                <button class="btn btn-primary w-100 mt-3" :disabled="!selectedStatus" @click="updateStatus">
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ confirmationTitle }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            {{ confirmationMessage }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
            <button type="button" class="btn btn-danger" @click="confirmAction">Onayla</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal } from 'bootstrap';

// Data
const route = useRoute();
const router = useRouter();
const order = ref(null);
const loading = ref(true);
const selectedStatus = ref('');
const confirmationModal = ref(null);
const confirmationTitle = ref('');
const confirmationMessage = ref('');
const confirmCallback = ref(null);

// Order status history - example data
const orderStatusHistory = ref([
  { status: 'beklemede', date: '2025-04-10T10:30:00', user: 'Ahmet Yılmaz' },
  { status: 'onaylandı', date: '2025-04-11T14:15:00', user: 'Mehmet Demir' },
  { status: 'üretimde', date: '2025-04-12T09:45:00', user: 'Ayşe Kaya' },
  // Son durumu order'dan alacağız
]);

// Computed
const subtotal = computed(() => {
  if (!order.value || !order.value.items) return 0;
  return order.value.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
});

const taxAmount = computed(() => subtotal.value * 0.18);

const totalAmount = computed(() => subtotal.value + taxAmount.value);

// Methods
const fetchOrder = async () => {
  loading.value = true;
  try {
    // API çağrısı yapılacak
    // const response = await fetch(`/api/orders/${route.params.id}`);
    // order.value = await response.json();

    // Örnek veri:
    setTimeout(() => {
      order.value = {
        id: route.params.id,
        orderNumber: 'SIP-2025-0042',
        status: 'üretimde',
        orderDate: '2025-04-10',
        deliveryDate: '2025-04-25',
        createdAt: '2025-04-10T10:30:00',
        updatedAt: '2025-04-12T09:45:00',
        createdBy: 'Ahmet Yılmaz',
        notes: 'Teslimat öncesi müşteriye haber verilecek. Özel paketleme yapılacak.',
        customer: {
          id: 'C123',
          name: 'ABC Elektronik Ltd. Şti.',
          contactPerson: 'Mehmet Şahin',
          phone: '0212 555 6789',
          email: 'info@abcelektronik.com',
          taxNumber: '1234567890',
          address: 'Organize Sanayi Bölgesi, 5. Cadde No:23, İstanbul'
        },
        items: [
          { productCode: 'P001', productName: 'Kontrol Paneli A-200', quantity: 5, unitPrice: 1500, unit: 'adet' },
          { productCode: 'P002', productName: 'Sensör Modülü', quantity: 10, unitPrice: 450, unit: 'adet' },
          { productCode: 'P003', productName: 'Bağlantı Kablosu', quantity: 15, unitPrice: 75, unit: 'metre' }
        ],
        attachments: [
          { name: 'Teknik_Çizim.pdf', type: 'pdf', url: '#' },
          { name: 'Müşteri_İmzalı_Onay.pdf', type: 'pdf', url: '#' }
        ]
      };
      loading.value = false;
    }, 800);
  } catch (error) {
    console.error('Sipariş detayı yüklenirken hata oluştu:', error);
    // Hata işleme
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR').format(date);
};

const formatDateWithTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value);
};

const getStatusClass = (status) => {
  if (!status) return '';
  const statusMap = {
    'beklemede': 'status-pending',
    'onaylandı': 'status-approved',
    'hazırlanıyor': 'status-preparing',
    'üretimde': 'status-processing',
    'sevkiyata_hazır': 'status-ready',
    'sevkedildi': 'status-shipped',
    'tamamlandı': 'status-completed',
    'iptal': 'status-cancelled'
  };
  return statusMap[status.toLowerCase()] || '';
};

const getStatusIcon = (status) => {
  const iconMap = {
    'beklemede': 'bi-hourglass',
    'onaylandı': 'bi-check-circle',
    'hazırlanıyor': 'bi-box-seam',
    'üretimde': 'bi-gear',
    'sevkiyata_hazır': 'bi-box',
    'sevkedildi': 'bi-truck',
    'tamamlandı': 'bi-check-circle-fill',
    'iptal': 'bi-x-circle'
  };
  return iconMap[status] || 'bi-circle';
};

const getStatusTitle = (status) => {
  const titleMap = {
    'beklemede': 'Beklemede',
    'onaylandı': 'Onaylandı',
    'hazırlanıyor': 'Hazırlanıyor',
    'üretimde': 'Üretimde',
    'sevkiyata_hazır': 'Sevkiyata Hazır',
    'sevkedildi': 'Sevk Edildi',
    'tamamlandı': 'Tamamlandı',
    'iptal': 'İptal Edildi'
  };
  return titleMap[status] || status;
};

const isStatusCompleted = (status) => {
  return true; // Örnek olarak tüm durumları tamamlanmış gösteriyoruz
};

const getFileIcon = (fileType) => {
  const iconMap = {
    'pdf': 'bi-file-earmark-pdf',
    'doc': 'bi-file-earmark-word',
    'docx': 'bi-file-earmark-word',
    'xls': 'bi-file-earmark-excel',
    'xlsx': 'bi-file-earmark-excel',
    'jpg': 'bi-file-earmark-image',
    'png': 'bi-file-earmark-image',
    'zip': 'bi-file-earmark-zip',
  };
  return iconMap[fileType] || 'bi-file-earmark';
};

const goBack = () => {
  router.back();
};

const printOrder = () => {
  window.print();
};

const duplicateOrder = () => {
  // Siparişi kopyala
  router.push('/orders/create?duplicate=' + route.params.id);
};

const editOrder = () => {
  // Siparişi düzenleme sayfasına yönlendir
  router.push(`/orders/edit/${route.params.id}`);
};

const exportAsPdf = () => {
  // PDF olarak dışa aktar
  alert('PDF dışa aktarma fonksiyonu henüz uygulanmadı');
};

const viewFile = (file) => {
  window.open(file.url, '_blank');
};

const downloadFile = (file) => {
  // Dosyayı indir
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.name;
  link.click();
};

const updateStatus = () => {
  if (!selectedStatus.value) return;
  
  // API çağrısı yapılacak
  alert(`Sipariş durumu "${getStatusTitle(selectedStatus.value)}" olarak güncellenecek`);
  
  // Simülasyon
  order.value.status = selectedStatus.value;
  orderStatusHistory.value.push({
    status: selectedStatus.value,
    date: new Date().toISOString(),
    user: 'Mevcut Kullanıcı'
  });
  
  selectedStatus.value = '';
};

const confirmCancel = () => {
  showConfirmation(
    'Siparişi İptal Et', 
    'Bu siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
    cancelOrder
  );
};

const cancelOrder = async () => {
  try {
    // API çağrısı yapılacak
    // await fetch(`/api/orders/${route.params.id}/cancel`, { method: 'POST' });
    
    // Simülasyon
    order.value.status = 'iptal';
    orderStatusHistory.value.push({
      status: 'iptal',
      date: new Date().toISOString(),
      user: 'Mevcut Kullanıcı'
    });
    
    // Modal'ı kapat
    confirmationModal.value.hide();
  } catch (error) {
    console.error('Sipariş iptal edilirken hata oluştu:', error);
  }
};

const showConfirmation = (title, message, callback) => {
  confirmationTitle.value = title;
  confirmationMessage.value = message;
  confirmCallback.value = callback;
  confirmationModal.value.show();
};

const confirmAction = () => {
  if (typeof confirmCallback.value === 'function') {
    confirmCallback.value();
  }
};

// Lifecycle Hooks
onMounted(async () => {
  await fetchOrder();
  confirmationModal.value = new Modal(document.getElementById('confirmationModal'));
});
</script>

<style scoped>
.order-detail-container {
  position: relative;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.order-number {
  font-size: 1.1rem;
  font-weight: 500;
  color: #6c757d;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.info-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.info-value {
  font-weight: 500;
}

.info-value.address {
  white-space: pre-line;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background-color: rgba(255, 193, 7, 0.15);
  color: #ffc107;
}

.status-approved {
  background-color: rgba(25, 135, 84, 0.15);
  color: #198754;
}

.status-preparing {
  background-color: rgba(13, 110, 253, 0.15);
  color: #0d6efd;
}

.status-processing {
  background-color: rgba(13, 202, 240, 0.15);
  color: #0dcaf0;
}

.status-ready {
  background-color: rgba(108, 117, 125, 0.15);
  color: #6c757d;
}

.status-shipped {
  background-color: rgba(13, 110, 253, 0.15);
  color: #0d6efd;
}

.status-completed {
  background-color: rgba(25, 135, 84, 0.15);
  color: #198754;
}

.status-cancelled {
  background-color: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.notes-content {
  white-space: pre-line;
  color: #212529;
}

.attached-files-list {
  margin-top: 1rem;
}

.attached-file {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}

.attached-file i {
  font-size: 1.25rem;
  margin-right: 0.5rem;
}

.file-name {
  flex: 1;
}

.file-actions {
  display: flex;
}

.no-files {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  color: #6c757d;
}

.no-files i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.order-status-timeline {
  margin-bottom: 1.5rem;
}

.status-item {
  display: flex;
  margin-bottom: 1.5rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-indicator {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #f8f9fa;
  border: 2px solid #e9ecef;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 0.75rem;
  color: #adb5bd;
}

.status-item.completed .status-indicator {
  background-color: #198754;
  border-color: #198754;
  color: white;
}

.status-content {
  flex: 1;
}

.status-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.status-date, .status-user {
  font-size: 0.875rem;
  color: #6c757d;
}

/* Print styles */
@media print {
  .header-actions, .order-status-timeline, .btn, select, .form-label {
    display: none !important;
  }
  
  .card {
    border: none !important;
    box-shadow: none !important;
  }
  
  .card-header {
    background-color: transparent !important;
    border-bottom: 1px solid #000 !important;
  }
  
  .page-header h1 {
    font-size: 1.5rem !important;
  }
}
</style>