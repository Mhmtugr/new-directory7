/**
 * useOrderDetail.js
 * Sipariş detaylarını görüntüleme ve düzenleme işlemleri için kompozisyon fonksiyonu
 */

import { ref, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';

export function useOrderDetail() {
  // Dependencies
  const { showToast } = useToast();
  const route = useRoute();
  const router = useRouter();
  
  // State
  const order = ref(null);
  const isLoading = ref(false);
  const isEditing = ref(false);
  const productionStages = ref([]);
  const documents = ref([]);
  
  // Edit state
  const editForm = reactive({
    deliveryDate: '',
    priority: '',
    status: '',
    customerContact: '',
    notes: ''
  });

  // Computed
  const orderId = computed(() => route.params.id || '');
  
  const orderProgress = computed(() => {
    if (!order.value) return 0;
    return order.value.progress || 0;
  });

  const orderCellCount = computed(() => {
    if (!order.value || !order.value.cells) return 0;
    
    // Toplam miktar - birden fazla hücre olabilir
    return order.value.cells.reduce((sum, cell) => sum + (cell.quantity || 0), 0);
  });

  /**
   * Sipariş detaylarını yükler
   * @param {string} id - Sipariş ID (opsiyonel, route'dan alınabilir)
   * @returns {Promise<Object>} - Sipariş detayları
   */
  async function loadOrderDetail(id = null) {
    const targetId = id || orderId.value;
    
    if (!targetId) {
      showToast('Sipariş ID bulunamadı', 'error');
      return null;
    }
    
    try {
      isLoading.value = true;
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const doc = await window.firebase.firestore().collection('orders').doc(targetId).get();
        
        if (doc.exists) {
          const orderData = {
            id: doc.id,
            ...doc.data(),
            // Timestamp'ları Date'e dönüştür
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          };
          
          order.value = orderData;
          resetEditForm(); // Edit formunu yeni verilerle doldur
          
          // İlgili üretim aşamalarını yükle
          await loadProductionStages(targetId);
          
          // İlgili dokümanları yükle
          await loadOrderDocuments(targetId);
          
          return orderData;
        } else {
          showToast('Sipariş bulunamadı', 'error');
          return null;
        }
      } else {
        // Demo mod
        order.value = getDemoOrder(targetId);
        resetEditForm(); // Edit formunu yeni verilerle doldur
        
        // Demo üretim aşamalarını ve dokümanları yükle
        productionStages.value = getDemoProductionStages(targetId);
        documents.value = getDemoOrderDocuments(targetId);
        
        return order.value;
      }
    } catch (error) {
      console.error('Sipariş detayları yüklenirken hata oluştu:', error);
      showToast('Sipariş detayları yüklenemedi: ' + error.message, 'error');
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Sipariş üretim aşamalarını yükler
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Array>} - Üretim aşamaları
   */
  async function loadProductionStages(orderId) {
    try {
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const snapshot = await window.firebase.firestore()
          .collection('productionStages')
          .where('orderId', '==', orderId)
          .orderBy('startDate', 'asc')
          .get();
        
        const stages = [];
        snapshot.forEach(doc => {
          stages.push({
            id: doc.id,
            ...doc.data(),
            // Timestamp'ları Date'e dönüştür
            startDate: doc.data().startDate?.toDate() || null,
            endDate: doc.data().endDate?.toDate() || null
          });
        });
        
        productionStages.value = stages;
        return stages;
      } else {
        // Demo mod
        productionStages.value = getDemoProductionStages(orderId);
        return productionStages.value;
      }
    } catch (error) {
      console.error('Üretim aşamaları yüklenirken hata oluştu:', error);
      showToast('Üretim aşamaları yüklenemedi', 'error');
      
      // Demo verisi
      productionStages.value = getDemoProductionStages(orderId);
      return productionStages.value;
    }
  }
  
  /**
   * Siparişe ait dokümanları yükler
   * @param {string} orderId - Sipariş ID
   * @returns {Promise<Array>} - Dokümanlar
   */
  async function loadOrderDocuments(orderId) {
    try {
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const snapshot = await window.firebase.firestore()
          .collection('orderDocuments')
          .where('orderId', '==', orderId)
          .orderBy('createdAt', 'desc')
          .get();
        
        const docs = [];
        snapshot.forEach(doc => {
          docs.push({
            id: doc.id,
            ...doc.data(),
            // Timestamp'ları Date'e dönüştür
            createdAt: doc.data().createdAt?.toDate() || new Date()
          });
        });
        
        documents.value = docs;
        return docs;
      } else {
        // Demo mod
        documents.value = getDemoOrderDocuments(orderId);
        return documents.value;
      }
    } catch (error) {
      console.error('Dokümanlar yüklenirken hata oluştu:', error);
      showToast('Dokümanlar yüklenemedi', 'error');
      
      // Demo verisi
      documents.value = getDemoOrderDocuments(orderId);
      return documents.value;
    }
  }
  
  /**
   * Düzenleme modunu başlatır
   */
  function startEditing() {
    resetEditForm();
    isEditing.value = true;
  }
  
  /**
   * Düzenleme modunu iptal eder
   */
  function cancelEditing() {
    isEditing.value = false;
  }
  
  /**
   * Edit formunu sıfırlar ve mevcut değerlerle doldurur
   */
  function resetEditForm() {
    if (!order.value) return;
    
    editForm.deliveryDate = order.value.cells?.[0]?.deliveryDate || '';
    editForm.priority = order.value.priority || 'medium';
    editForm.status = order.value.status || 'planned';
    editForm.customerContact = order.value.customerInfo?.contactPerson || '';
    editForm.notes = order.value.notes || '';
  }
  
  /**
   * Sipariş değişikliklerini kaydeder
   * @returns {Promise<boolean>} - İşlem başarılı mı
   */
  async function saveChanges() {
    if (!order.value) return false;
    
    try {
      isLoading.value = true;
      
      // Değişiklikler
      const updates = {
        status: editForm.status,
        priority: editForm.priority,
        notes: editForm.notes,
        updatedAt: new Date()
      };
      
      // Müşteri iletişim bilgisi
      if (editForm.customerContact) {
        updates.customerInfo = {
          ...order.value.customerInfo,
          contactPerson: editForm.customerContact
        };
      }
      
      // Teslim tarihi (ilk hücre için)
      if (editForm.deliveryDate && order.value.cells && order.value.cells.length > 0) {
        updates.cells = [...order.value.cells];
        updates.cells[0].deliveryDate = editForm.deliveryDate;
      }
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        await window.firebase.firestore().collection('orders').doc(order.value.id).update({
          ...updates,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Demo mod - sadece local state'i güncelle
        order.value = {
          ...order.value,
          ...updates
        };
      }
      
      // Düzenleme modunu kapat
      isEditing.value = false;
      
      showToast('Değişiklikler kaydedildi', 'success');
      return true;
    } catch (error) {
      console.error('Değişiklikler kaydedilirken hata oluştu:', error);
      showToast('Değişiklikler kaydedilemedi: ' + error.message, 'error');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Siparişi siler
   * @returns {Promise<boolean>} - İşlem başarılı mı
   */
  async function deleteOrder() {
    if (!order.value) return false;
    
    try {
      isLoading.value = true;
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        await window.firebase.firestore().collection('orders').doc(order.value.id).delete();
      }
      
      showToast('Sipariş silindi', 'success');
      
      // Sipariş listesine geri dön
      router.push({ name: 'Orders' });
      return true;
    } catch (error) {
      console.error('Sipariş silinirken hata oluştu:', error);
      showToast('Sipariş silinemedi: ' + error.message, 'error');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Siparişi kopyalayarak yeni sipariş oluşturur
   * @returns {Promise<string|null>} - Yeni sipariş ID veya başarısızlık durumunda null
   */
  async function cloneOrder() {
    if (!order.value) return null;
    
    try {
      isLoading.value = true;
      
      // Kopyalanacak verileri hazırla
      const orderData = {
        ...order.value,
        orderNo: `#${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`, // Yeni sipariş numarası
        orderDate: new Date().toISOString().split('T')[0],
        status: 'planned',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // ID'yi kaldır (yeni ID atanacak)
      delete orderData.id;
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const docRef = await window.firebase.firestore().collection('orders').add({
          ...orderData,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Sipariş kopyalandı', 'success');
        
        // Yeni oluşturulan siparişe git
        router.push({ name: 'OrderDetail', params: { id: docRef.id } });
        return docRef.id;
      } else {
        // Demo mod
        showToast('Demo mod: Sipariş kopyalandı (simülasyon)', 'success');
        
        const newId = 'order-' + Date.now();
        
        // Demo olarak yeni siparişe git
        router.push({ name: 'Orders' });
        return newId;
      }
    } catch (error) {
      console.error('Sipariş kopyalanırken hata oluştu:', error);
      showToast('Sipariş kopyalanamadı: ' + error.message, 'error');
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Durum metnini döndürür
   * @param {string} status - Durum kodu
   * @returns {string} - Durum metni
   */
  function getStatusText(status) {
    const statusMap = {
      'planned': 'Planlandı',
      'in_progress': 'Devam Ediyor',
      'delayed': 'Gecikiyor',
      'completed': 'Tamamlandı',
      'canceled': 'İptal Edildi'
    };
    
    return statusMap[status] || status;
  }
  
  /**
   * Durum badge sınıfını döndürür
   * @param {string} status - Durum kodu
   * @returns {string} - CSS sınıfı
   */
  function getStatusBadgeClass(status) {
    const classMap = {
      'planned': 'status-badge status-planned',
      'in_progress': 'status-badge status-progress',
      'delayed': 'status-badge status-delayed',
      'completed': 'status-badge status-completed',
      'canceled': 'status-badge status-canceled'
    };
    
    return classMap[status] || '';
  }
  
  /**
   * Demo sipariş detayı döndürür
   * @param {string} id - Sipariş ID
   * @returns {Object|null} - Sipariş detayı
   */
  function getDemoOrder(id) {
    // Demo siparişler - gerçek uygulamada API'den gelecek
    const demoOrders = [
      {
        id: 'order-001',
        orderNo: '#0424-1251',
        orderDate: '2024-04-01',
        customerInfo: {
          name: 'AYEDAŞ',
          documentNo: 'PO-2024-A156',
          projectName: 'İstanbul OG Yenileme Projesi',
          contractNo: 'CNT-24156',
          contactPerson: 'Ahmet Yılmaz',
          contactEmail: 'ahmet.yilmaz@ayedas.com',
          contactPhone: '+90 532 123 45 67'
        },
        cells: [
          {
            id: 1,
            productTypeCode: 'RM 36 CB',
            technicalValues: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            quantity: 1,
            deliveryDate: '2024-11-15',
            serialNumber: 'SN-24251-001'
          }
        ],
        projects: [
          {
            id: 1,
            name: 'PROJE-1',
            cellArrangement: 'Sıralı Montaj',
            closingDetails: 'Standard'
          }
        ],
        status: 'delayed',
        progress: 65,
        priority: 'high',
        notes: 'Kesici malzemesi tedarikinde gecikme yaşanıyor',
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-04-15')
      },
      {
        id: 'order-002',
        orderNo: '#0424-1245',
        orderDate: '2024-04-05',
        customerInfo: {
          name: 'BEDAŞ',
          documentNo: 'PO-2024-B789',
          projectName: 'Bakırköy Dağıtım Merkezi',
          contractNo: 'CNT-24789',
          contactPerson: 'Mehmet Demir',
          contactEmail: 'mehmet.demir@bedas.com',
          contactPhone: '+90 533 234 56 78'
        },
        cells: [
          {
            id: 1,
            productTypeCode: 'RM 36 LB',
            technicalValues: '36kV 630A 16kA Yük Ayırıcılı Giriş Hücresi',
            quantity: 2,
            deliveryDate: '2024-11-20',
            serialNumber: 'SN-24245-001'
          },
          {
            id: 2,
            productTypeCode: 'RM 36 CB',
            technicalValues: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            quantity: 3,
            deliveryDate: '2024-11-20',
            serialNumber: 'SN-24245-002'
          }
        ],
        status: 'in_progress',
        progress: 35,
        priority: 'medium',
        notes: '',
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date('2024-04-10')
      }
    ];
    
    // ID'ye göre sipariş bulma
    return demoOrders.find(order => order.id === id) || null;
  }
  
  /**
   * Demo üretim aşamalarını döndürür
   * @param {string} orderId - Sipariş ID
   * @returns {Array} - Üretim aşamaları
   */
  function getDemoProductionStages(orderId) {
    if (orderId === 'order-001') {
      return [
        {
          id: 'stage-001',
          orderId: 'order-001',
          stageName: 'Mekanik Tasarım',
          status: 'completed',
          progress: 100,
          startDate: new Date('2024-04-03'),
          endDate: new Date('2024-04-08'),
          assignedTo: 'Ali Yıldız'
        },
        {
          id: 'stage-002',
          orderId: 'order-001',
          stageName: 'Mekanik Üretim',
          status: 'completed',
          progress: 100,
          startDate: new Date('2024-04-09'),
          endDate: new Date('2024-04-18'),
          assignedTo: 'Üretim Ekibi A'
        },
        {
          id: 'stage-003',
          orderId: 'order-001',
          stageName: 'Elektrik Tasarım',
          status: 'completed',
          progress: 100,
          startDate: new Date('2024-04-10'),
          endDate: new Date('2024-04-15'),
          assignedTo: 'Ayşe Kaya'
        },
        {
          id: 'stage-004',
          orderId: 'order-001',
          stageName: 'Kablaj',
          status: 'in_progress',
          progress: 75,
          startDate: new Date('2024-04-19'),
          endDate: null,
          assignedTo: 'Kablaj Ekibi C'
        },
        {
          id: 'stage-005',
          orderId: 'order-001',
          stageName: 'Test',
          status: 'not_started',
          progress: 0,
          startDate: null,
          endDate: null,
          assignedTo: 'Test Ekibi'
        }
      ];
    } else if (orderId === 'order-002') {
      return [
        {
          id: 'stage-006',
          orderId: 'order-002',
          stageName: 'Mekanik Tasarım',
          status: 'completed',
          progress: 100,
          startDate: new Date('2024-04-06'),
          endDate: new Date('2024-04-12'),
          assignedTo: 'Ali Yıldız'
        },
        {
          id: 'stage-007',
          orderId: 'order-002',
          stageName: 'Elektrik Tasarım',
          status: 'completed',
          progress: 100,
          startDate: new Date('2024-04-13'),
          endDate: new Date('2024-04-18'),
          assignedTo: 'Ayşe Kaya'
        },
        {
          id: 'stage-008',
          orderId: 'order-002',
          stageName: 'Mekanik Üretim',
          status: 'in_progress',
          progress: 30,
          startDate: new Date('2024-04-19'),
          endDate: null,
          assignedTo: 'Üretim Ekibi B'
        }
      ];
    }
    
    return [];
  }
  
  /**
   * Demo sipariş dokümanlarını döndürür
   * @param {string} orderId - Sipariş ID
   * @returns {Array} - Dokümanlar
   */
  function getDemoOrderDocuments(orderId) {
    if (orderId === 'order-001') {
      return [
        {
          id: 'doc-001',
          orderId: 'order-001',
          fileName: 'Sipariş-0424-1251-Sözleşme.pdf',
          fileType: 'application/pdf',
          fileSize: 1245678,
          documentType: 'contract',
          createdAt: new Date('2024-04-01'),
          createdBy: 'Satış Departmanı',
          downloadUrl: '#'
        },
        {
          id: 'doc-002',
          orderId: 'order-001',
          fileName: 'Teknik-Şartname.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: 458963,
          documentType: 'technical',
          createdAt: new Date('2024-04-02'),
          createdBy: 'Teknik Departman',
          downloadUrl: '#'
        },
        {
          id: 'doc-003',
          orderId: 'order-001',
          fileName: 'Hücre-Teknik-Çizim.dwg',
          fileType: 'application/acad',
          fileSize: 2589631,
          documentType: 'drawing',
          createdAt: new Date('2024-04-08'),
          createdBy: 'Tasarım Departmanı',
          downloadUrl: '#'
        }
      ];
    } else if (orderId === 'order-002') {
      return [
        {
          id: 'doc-004',
          orderId: 'order-002',
          fileName: 'Sipariş-0424-1245-Sözleşme.pdf',
          fileType: 'application/pdf',
          fileSize: 1123456,
          documentType: 'contract',
          createdAt: new Date('2024-04-05'),
          createdBy: 'Satış Departmanı',
          downloadUrl: '#'
        },
        {
          id: 'doc-005',
          orderId: 'order-002',
          fileName: 'Müşteri-Teknik-Gereksinimleri.pdf',
          fileType: 'application/pdf',
          fileSize: 852741,
          documentType: 'technical',
          createdAt: new Date('2024-04-07'),
          createdBy: 'Müşteri',
          downloadUrl: '#'
        }
      ];
    }
    
    return [];
  }

  // İlk yükleme
  if (orderId.value) {
    loadOrderDetail();
  }
  
  // Return public API
  return {
    // State
    order,
    isLoading,
    isEditing,
    productionStages,
    documents,
    editForm,
    
    // Computed
    orderId,
    orderProgress,
    orderCellCount,
    
    // Methods
    loadOrderDetail,
    loadProductionStages,
    loadOrderDocuments,
    startEditing,
    cancelEditing,
    saveChanges,
    deleteOrder,
    cloneOrder,
    getStatusText,
    getStatusBadgeClass
  };
}