/**
 * useOrderCreation.js
 * Yeni sipariş oluşturma için kompozisyon fonksiyonu
 */

import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';

export function useOrderCreation() {
  // Dependencies
  const { showToast } = useToast();
  const router = useRouter();
  
  // State
  const isLoading = ref(false);
  const currentStep = ref(1);
  const totalSteps = 4; // Toplam adım sayısı
  
  // Form data
  const orderData = reactive({
    // Genel bilgiler
    orderNo: '',
    orderDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
    customerInfo: {
      name: '',
      documentNo: '',
      projectName: '',
      contractNo: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: ''
    },
    // Teknik bilgiler
    technicalInfo: {
      voltage: '36kV',
      current: '630A',
      shortCircuit: '16kA',
      controlVoltage: '24 VDC',
      specialRequirements: '',
      labelInfo: '',
      specialDesign: false,
      lockingRequired: false,
      comments: ''
    },
    // Hücre bilgileri
    cells: [],
    // Proje bilgileri
    projects: [],
    // Durum bilgileri
    status: 'planned',
    progress: 0,
    createdAt: null,
    updatedAt: null
  });

  // Computed properties
  const isFirstStep = computed(() => currentStep.value === 1);
  const isLastStep = computed(() => currentStep.value === totalSteps);
  const currentProgress = computed(() => (currentStep.value / totalSteps) * 100);
  
  const hasCustomerInfo = computed(() => {
    return orderData.customerInfo.name && 
           orderData.customerInfo.documentNo;
  });

  const hasCells = computed(() => orderData.cells.length > 0);
  
  const formIsValid = computed(() => {
    // Her adımın validasyonunu kontrol et
    if (currentStep.value === 1) {
      // Müşteri bilgileri adımı
      return hasCustomerInfo.value;
    } else if (currentStep.value === 2) {
      // Hücre bilgileri adımı
      return hasCells.value;
    } else if (currentStep.value === 3) {
      // Proje bilgileri adımı - opsiyonel olabilir
      return true;
    } else if (currentStep.value === 4) {
      // Onay adımı
      return hasCustomerInfo.value && hasCells.value;
    }
    
    return false;
  });
  
  // Methods
  
  /**
   * Yeni hücre ekler
   */
  function addCell() {
    const cellCount = orderData.cells.length;
    
    orderData.cells.push({
      id: Date.now() + cellCount, // Benzersiz ID
      facilityName: '',
      acceptanceDate: '',
      deliveryDate: '',
      quantity: 1,
      productTypeCode: 'RM 36 CB', // Varsayılan değer
      technicalValues: '36kV 630A 16kA',
      relayInfo: '',
      currentTransformerInfo: '',
      voltageTransformerInfo: '',
      serialNumber: `SN-${new Date().getFullYear().toString().substring(2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(cellCount + 1).toString().padStart(3, '0')}`
    });
  }
  
  /**
   * Hücre siler
   * @param {number} index - Silinecek hücrenin dizindeki pozisyonu
   */
  function removeCell(index) {
    orderData.cells.splice(index, 1);
  }
  
  /**
   * Yeni proje ekler
   */
  function addProject() {
    const projectCount = orderData.projects.length;
    
    orderData.projects.push({
      id: Date.now() + projectCount, // Benzersiz ID
      name: `PROJE-${projectCount + 1}`,
      cellArrangement: '',
      closingDetails: ''
    });
  }
  
  /**
   * Proje siler
   * @param {number} index - Silinecek projenin dizindeki pozisyonu
   */
  function removeProject(index) {
    orderData.projects.splice(index, 1);
  }
  
  /**
   * Sonraki adıma ilerler
   */
  function nextStep() {
    if (currentStep.value < totalSteps) {
      currentStep.value++;
    }
  }
  
  /**
   * Önceki adıma döner
   */
  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }
  
  /**
   * Formdaki verileri toplar
   */
  function collectFormData() {
    // Verileri hazırla - tüm form alanları zaten reactive `orderData` içinde tutuluyor
    return {
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Yeni sipariş kaydeder
   * @returns {Promise<string|null>} - Başarılı kaydedilirse sipariş ID, başarısız ise null
   */
  async function saveOrder() {
    try {
      isLoading.value = true;
      
      const formData = collectFormData();
      
      // Sipariş numarası oluştur (gerçek projede sunucu tarafında yapılabilir)
      if (!formData.orderNo) {
        const now = new Date();
        const year = now.getFullYear().toString().substring(2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        formData.orderNo = `#${year}${month}-${randomNum}`;
      }
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const docRef = await window.firebase.firestore().collection('orders').add({
          ...formData,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Sipariş başarıyla oluşturuldu', 'success');
        router.push({ name: 'OrderDetail', params: { id: docRef.id } });
        
        return docRef.id;
      } else {
        // Demo mod
        console.log('Demo mod: Sipariş verileri', formData);
        
        showToast('Demo mod: Sipariş oluşturuldu (simülasyon)', 'success');
        router.push({ name: 'Orders' });
        
        return 'demo-order-' + Date.now();
      }
    } catch (error) {
      console.error('Sipariş kaydedilirken hata oluştu:', error);
      showToast('Sipariş kaydedilemedi: ' + error.message, 'error');
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Siparişi iptal eder ve listeme sayfasına döner
   */
  function cancelOrder() {
    router.push({ name: 'Orders' });
  }
  
  /**
   * Sipariş verilerini sıfırlar
   */
  function resetOrderData() {
    Object.assign(orderData, {
      orderNo: '',
      orderDate: new Date().toISOString().split('T')[0],
      customerInfo: {
        name: '',
        documentNo: '',
        projectName: '',
        contractNo: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: ''
      },
      technicalInfo: {
        voltage: '36kV',
        current: '630A',
        shortCircuit: '16kA',
        controlVoltage: '24 VDC',
        specialRequirements: '',
        labelInfo: '',
        specialDesign: false,
        lockingRequired: false,
        comments: ''
      },
      cells: [],
      projects: [],
      status: 'planned',
      progress: 0
    });
    
    currentStep.value = 1;
  }
  
  // Sayfa yüklendiğinde en az bir hücre olsun
  addCell();
  
  // Return public API
  return {
    // State
    isLoading,
    currentStep,
    totalSteps,
    orderData,
    
    // Computed
    isFirstStep,
    isLastStep,
    currentProgress,
    formIsValid,
    
    // Methods
    addCell,
    removeCell,
    addProject,
    removeProject,
    nextStep,
    prevStep,
    saveOrder,
    cancelOrder,
    resetOrderData
  };
}