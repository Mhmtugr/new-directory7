/**
 * useOrders.js
 * Siparişlerin listelenmesi ve filtrelenmesi için kompozisyon fonksiyonu
 */

import { ref, reactive, computed, watch } from 'vue';
import { useToast } from '@/composables/useToast';

export function useOrders() {
  // Dependencies
  const { showToast } = useToast();
  
  // State
  const orders = ref([]);
  const isLoading = ref(false);
  const totalOrderCount = ref(0);
  
  // Filtreleme ve sıralama state'i
  const filters = reactive({
    searchQuery: '',
    cellType: '',
    status: '',
    dateRange: {
      start: '',
      end: ''
    },
    priorityLevel: '',
    customerName: ''
  });
  
  const sorting = reactive({
    field: 'orderDate',
    direction: 'desc' // 'asc' veya 'desc'
  });
  
  const pagination = reactive({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: computed(() => Math.ceil(filteredOrders.value.length / pagination.itemsPerPage))
  });
  
  // Computed properties
  const filteredOrders = computed(() => {
    let result = [...orders.value];
    
    // Arama sorgusu filtresi
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(order => 
        order.orderNo?.toLowerCase().includes(query) || 
        order.customerInfo?.name?.toLowerCase().includes(query)
      );
    }
    
    // Hücre tipi filtresi
    if (filters.cellType) {
      result = result.filter(order => {
        if (!order.cells || !order.cells.length) return false;
        return order.cells.some(cell => 
          cell.productTypeCode?.includes(filters.cellType)
        );
      });
    }
    
    // Durum filtresi
    if (filters.status) {
      result = result.filter(order => order.status === filters.status);
    }
    
    // Tarih aralığı filtresi
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(order => {
        const orderDate = new Date(order.orderDate);
        
        if (filters.dateRange.start && filters.dateRange.end) {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          return orderDate >= start && orderDate <= end;
        } else if (filters.dateRange.start) {
          const start = new Date(filters.dateRange.start);
          return orderDate >= start;
        } else if (filters.dateRange.end) {
          const end = new Date(filters.dateRange.end);
          return orderDate <= end;
        }
        
        return true;
      });
    }
    
    // Öncelik seviyesi filtresi
    if (filters.priorityLevel) {
      result = result.filter(order => order.priority === filters.priorityLevel);
    }
    
    // Müşteri adı filtresi
    if (filters.customerName) {
      result = result.filter(order => 
        order.customerInfo?.name?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }
    
    // Sıralama
    result.sort((a, b) => {
      let valA = getNestedValue(a, sorting.field);
      let valB = getNestedValue(b, sorting.field);
      
      // Tarih türünde değerler için
      if (sorting.field === 'orderDate' || 
          sorting.field === 'createdAt' || 
          sorting.field === 'updatedAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
      
      if (sorting.direction === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
    
    return result;
  });
  
  const paginatedOrders = computed(() => {
    const startIdx = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIdx = startIdx + pagination.itemsPerPage;
    return filteredOrders.value.slice(startIdx, endIdx);
  });
  
  const customerList = computed(() => {
    // Benzersiz müşteri isimleri için
    const uniqueCustomers = new Set();
    
    orders.value.forEach(order => {
      if (order.customerInfo?.name) {
        uniqueCustomers.add(order.customerInfo.name);
      }
    });
    
    return Array.from(uniqueCustomers).sort();
  });
  
  const cellTypeList = computed(() => {
    // Benzersiz hücre tipleri için
    const uniqueCellTypes = new Set();
    
    orders.value.forEach(order => {
      if (order.cells && order.cells.length) {
        order.cells.forEach(cell => {
          if (cell.productTypeCode) {
            uniqueCellTypes.add(cell.productTypeCode);
          }
        });
      }
    });
    
    return Array.from(uniqueCellTypes).sort();
  });
  
  // İç yardımcı fonksiyonlar
  function getNestedValue(obj, path) {
    // "customerInfo.name" gibi nested alanlar için
    return path.split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : null, obj);
  }
  
  // Methods
  
  /**
   * Tüm siparişleri yükler
   * @returns {Promise<Array>} - Siparişler listesi
   */
  async function loadOrders() {
    try {
      isLoading.value = true;
      
      // Firebase kullanılabilirse
      if (window.firebase && window.firebase.firestore) {
        const snapshot = await window.firebase.firestore()
          .collection('orders')
          .orderBy('createdAt', 'desc')
          .get();
        
        const result = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          result.push({
            id: doc.id,
            ...data,
            // Timestamp'ları Date'e dönüştür
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        });
        
        orders.value = result;
        totalOrderCount.value = result.length;
        
        return result;
      } else {
        // Demo mod
        const demoOrders = getDemoOrders();
        orders.value = demoOrders;
        totalOrderCount.value = demoOrders.length;
        
        return demoOrders;
      }
    } catch (error) {
      console.error('Siparişler yüklenirken hata oluştu:', error);
      showToast('Siparişler yüklenemedi: ' + error.message, 'error');
      
      // Demo mod - hata durumunda
      const demoOrders = getDemoOrders();
      orders.value = demoOrders;
      totalOrderCount.value = demoOrders.length;
      
      return demoOrders;
    } finally {
      isLoading.value = false;
    }
  }
  
  /**
   * Sonraki sayfaya geçer
   */
  function nextPage() {
    if (pagination.currentPage < pagination.totalPages) {
      pagination.currentPage++;
    }
  }
  
  /**
   * Önceki sayfaya geçer
   */
  function prevPage() {
    if (pagination.currentPage > 1) {
      pagination.currentPage--;
    }
  }
  
  /**
   * Belirtilen sayfaya gider
   * @param {number} page - Sayfa numarası
   */
  function goToPage(page) {
    if (page >= 1 && page <= pagination.totalPages) {
      pagination.currentPage = page;
    }
  }
  
  /**
   * Sıralama alanını değiştirir
   * @param {string} field - Sıralanacak alan adı
   */
  function sortBy(field) {
    // Aynı alan tekrar seçilirse yön değişir
    if (sorting.field === field) {
      sorting.direction = sorting.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sorting.field = field;
      sorting.direction = 'desc'; // Varsayılan sıralama yönü
    }
  }
  
  /**
   * Filtreleri temizler
   */
  function clearFilters() {
    Object.assign(filters, {
      searchQuery: '',
      cellType: '',
      status: '',
      dateRange: {
        start: '',
        end: ''
      },
      priorityLevel: '',
      customerName: ''
    });
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
   * Demo siparişleri döndürür
   * @returns {Array} - Demo siparişler
   */
  function getDemoOrders() {
    return [
      {
        id: 'order-001',
        orderNo: '#0424-1251',
        orderDate: '2024-04-01',
        customerInfo: {
          name: 'AYEDAŞ',
          documentNo: 'PO-2024-A156',
          contactPerson: 'Ahmet Yılmaz'
        },
        cells: [
          {
            productTypeCode: 'RM 36 CB',
            technicalValues: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            quantity: 1,
            deliveryDate: '2024-11-15'
          }
        ],
        status: 'delayed',
        progress: 65,
        priority: 'high',
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
          contactPerson: 'Mehmet Demir'
        },
        cells: [
          {
            productTypeCode: 'RM 36 LB',
            technicalValues: '36kV 630A 16kA Yük Ayırıcılı Giriş Hücresi',
            quantity: 2,
            deliveryDate: '2024-11-20'
          },
          {
            productTypeCode: 'RM 36 CB',
            technicalValues: '36kV 630A 16kA Kesicili ÇIKIŞ Hücresi',
            quantity: 3,
            deliveryDate: '2024-11-20'
          }
        ],
        status: 'in_progress',
        progress: 35,
        priority: 'medium',
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date('2024-04-10')
      },
      {
        id: 'order-003',
        orderNo: '#0424-1239',
        orderDate: '2024-04-08',
        customerInfo: {
          name: 'TOROSLAR EDAŞ',
          documentNo: 'PO-2024-T321',
          contactPerson: 'Zeynep Kaya'
        },
        cells: [
          {
            productTypeCode: 'RM 36 FL',
            technicalValues: '36kV 200A 16kA Sigortalı Yük Ayırıcılı TR.Koruma Hücresi',
            quantity: 2,
            deliveryDate: '2024-12-05'
          }
        ],
        status: 'planned',
        progress: 10,
        priority: 'low',
        createdAt: new Date('2024-04-08'),
        updatedAt: new Date('2024-04-08')
      },
      {
        id: 'order-004',
        orderNo: '#0424-1233',
        orderDate: '2024-03-25',
        customerInfo: {
          name: 'ENERJİSA',
          documentNo: 'PO-2024-E456',
          contactPerson: 'Can Demir'
        },
        cells: [
          {
            productTypeCode: 'RM 36 LB',
            technicalValues: '36kV 630A 16kA Yük Ayırıcılı Giriş Hücresi',
            quantity: 1,
            deliveryDate: '2024-12-05'
          }
        ],
        status: 'completed',
        progress: 100,
        priority: 'medium',
        createdAt: new Date('2024-03-25'),
        updatedAt: new Date('2024-04-17')
      },
      {
        id: 'order-005',
        orderNo: '#0424-1220',
        orderDate: '2024-03-15',
        customerInfo: {
          name: 'OSMANİYE ELEKTRİK',
          documentNo: 'PO-2024-O789',
          contactPerson: 'Ali Yıldız'
        },
        cells: [
          {
            productTypeCode: 'RM 36 FL',
            technicalValues: '36kV 200A 16kA Sigortalı Yük Ayırıcılı TR.Koruma Hücresi',
            quantity: 1,
            deliveryDate: '2024-10-30'
          }
        ],
        status: 'planned',
        progress: 5,
        priority: 'low',
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-03-15')
      }
    ];
  }
  
  // Liste filtreleri değiştiğinde sayfa numarasını sıfırla
  watch([
    () => filters.searchQuery, 
    () => filters.cellType, 
    () => filters.status, 
    () => filters.dateRange.start, 
    () => filters.dateRange.end,
    () => filters.priorityLevel,
    () => filters.customerName
  ], () => {
    pagination.currentPage = 1;
  });
  
  // Return public API
  return {
    // State
    orders,
    isLoading,
    totalOrderCount,
    filters,
    sorting,
    pagination,
    
    // Computed
    filteredOrders,
    paginatedOrders,
    customerList,
    cellTypeList,
    
    // Methods
    loadOrders,
    nextPage,
    prevPage,
    goToPage,
    sortBy,
    clearFilters,
    getStatusText,
    getStatusBadgeClass
  };
}