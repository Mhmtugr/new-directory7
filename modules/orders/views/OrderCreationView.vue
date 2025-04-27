<template>
  <div class="order-creation">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1>Yeni Sipariş</h1>
      <router-link :to="{ name: 'Orders' }" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i> Siparişler
      </router-link>
    </div>

    <!-- İlerleme Çubuğu -->
    <div class="mb-4">
      <div class="progress" style="height: 10px;">
        <div 
          class="progress-bar" 
          role="progressbar" 
          :style="`width: ${currentProgress}%`"
          :aria-valuenow="currentProgress" 
          aria-valuemin="0" 
          aria-valuemax="100">
        </div>
      </div>
      <div class="d-flex justify-content-between mt-2">
        <div class="step" :class="{ 'active': currentStep >= 1, 'completed': currentStep > 1 }">
          1. Müşteri Bilgileri
        </div>
        <div class="step" :class="{ 'active': currentStep >= 2, 'completed': currentStep > 2 }">
          2. Teknik Detaylar
        </div>
        <div class="step" :class="{ 'active': currentStep >= 3, 'completed': currentStep > 3 }">
          3. Hücre Bilgileri
        </div>
        <div class="step" :class="{ 'active': currentStep >= 4 }">
          4. Onay
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <!-- Adım formları -->
        <div v-if="currentStep === 1">
          <!-- Müşteri Bilgileri -->
        </div>
        <div v-if="currentStep === 2">
          <!-- Teknik Detaylar -->
        </div>
        <div v-if="currentStep === 3">
          <!-- Hücre Bilgileri -->
        </div>
        <div v-if="currentStep === 4">
          <!-- Onay -->
        </div>
      </div>
      
      <div class="card-footer d-flex justify-content-between">
        <button
          v-if="!isFirstStep"
          @click="prevStep"
          class="btn btn-outline-secondary"
          type="button"
          :disabled="isLoading"
        >
          <i class="bi bi-chevron-left me-1"></i> Önceki Adım
        </button>
        <div v-else></div>
        
        <div>
          <button
            v-if="!isLastStep"
            @click="nextStep"
            class="btn btn-primary"
            type="button"
            :disabled="!canProceed"
          >
            Sonraki Adım <i class="bi bi-chevron-right ms-1"></i>
          </button>
          
          <button
            v-if="isLastStep"
            @click="submitOrder"
            class="btn btn-success"
            type="button"
            :disabled="!canSubmit || isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            Siparişi Oluştur
          </button>
          
          <button
            v-if="isLastStep"
            @click="cancelOrder"
            class="btn btn-outline-danger ms-2"
            type="button"
            :disabled="isLoading"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useOrderCreation } from '../useOrderCreation'; // Import yolunu düzelttim

// useOrderCreation composable'dan gerekli state ve metotları al
const {
  isLoading,
  currentStep,
  totalSteps,
  orderData,
  
  isFirstStep,
  isLastStep,
  currentProgress,
  
  addCell,
  removeCell,
  addProject,
  removeProject,
  nextStep,
  prevStep,
  saveOrder,
  cancelOrder
} = useOrderCreation();

// Sipariş onay checkbox'ı
const orderConfirmed = ref(false);

// Sonraki adıma geçiş kontrolü
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return orderData.customerInfo.name && 
           orderData.customerInfo.documentNo && 
           orderData.customerInfo.contactPerson;
  }
  
  if (currentStep.value === 3) {
    return orderData.cells.length > 0 && 
           orderData.cells.every(cell => cell.productTypeCode && cell.quantity > 0);
  }
  
  return true;
});

// Sipariş gönderme kontrolü
const canSubmit = computed(() => {
  return orderConfirmed.value;
});

// Siparişi oluştur
async function submitOrder() {
  try {
    const orderId = await saveOrder();
    if (orderId) {
      // Başarı durumu
      console.log('Sipariş başarıyla oluşturuldu:', orderId);
    }
  } catch (error) {
    console.error('Sipariş oluşturulurken hata:', error);
  }
}

// Proje tipi metni
function getProjectTypeText(type) {
  const types = {
    'mechanical': 'Mekanik',
    'electrical': 'Elektrik',
    'automation': 'Otomasyon',
    'installation': 'Montaj',
    'other': 'Diğer'
  };
  
  return types[type] || type || '-';
}
</script>

<style scoped>
.step {
  flex: 1;
  text-align: center;
  font-size: 0.9rem;
  color: #6c757d;
  position: relative;
}

.step.active {
  color: #0d6efd;
  font-weight: 500;
}

.step.completed {
  color: #198754;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .step {
    font-size: 0.8rem;
  }
}
</style>