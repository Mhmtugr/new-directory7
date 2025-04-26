import { ref } from 'vue'

/**
 * Dashboard veri servisi
 * Dashboard için gerekli verileri sağlar
 * @returns {Object} Dashboard veri ve metodları
 */
export function useDashboardData() {
  const isLoading = ref(false)
  const error = ref(null)

  // Sipariş özeti verisi
  const getOrderSummary = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 800)) // Gecikme simülasyonu

      return {
        totalOrders: 42,
        pendingOrders: 12,
        completedOrders: 25,
        delayedOrders: 5,
        stats: {
          thisMonth: 18,
          lastMonth: 15,
          growth: 20 // Yüzde olarak
        }
      }
    } catch (err) {
      console.error('Error fetching order summary:', err)
      error.value = 'Sipariş özeti yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Envanter özeti verisi
  const getInventorySummary = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 600)) // Gecikme simülasyonu

      return {
        totalItems: 156,
        lowStockItems: 14,
        criticalItems: 5,
        onOrderItems: 23,
        stats: {
          usage: 85, // Bu ay kullanım yüzdesi
          turnover: 17 // Stok devir hızı (gün)
        }
      }
    } catch (err) {
      console.error('Error fetching inventory summary:', err)
      error.value = 'Envanter özeti yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Üretim özeti verisi
  const getProductionSummary = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 700)) // Gecikme simülasyonu

      return {
        activeTasks: 8,
        completedTasks: 34,
        efficiency: 92, // Yüzde olarak
        utilization: 78, // Yüzde olarak
        stats: {
          thisMonth: 42,
          lastMonth: 38,
          growth: 10.5 // Yüzde olarak
        }
      }
    } catch (err) {
      console.error('Error fetching production summary:', err)
      error.value = 'Üretim özeti yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Son aktiviteler
  const getRecentActivities = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 500)) // Gecikme simülasyonu

      return [
        {
          id: 1,
          type: 'order',
          title: 'Yeni sipariş eklendi',
          description: 'Müşteri ABC için 15 adet ürün siparişi',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 dakika önce
          user: 'Ahmet Yılmaz'
        },
        {
          id: 2,
          type: 'production',
          title: 'Üretim tamamlandı',
          description: 'Sipariş #1089 için üretim başarıyla tamamlandı',
          timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 saat önce
          user: 'Mehmet Demir'
        },
        {
          id: 3,
          type: 'inventory',
          title: 'Stok uyarısı',
          description: 'X101 kodlu malzeme kritik seviyenin altında',
          timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 saat önce
          user: 'Sistem'
        },
        {
          id: 4,
          type: 'purchase',
          title: 'Satın alma talebi onaylandı',
          description: 'Tedarikçi XYZ\'den 1000 birim malzeme siparişi',
          timestamp: new Date(Date.now() - 1000 * 60 * 250), // 4+ saat önce
          user: 'Ayşe Kara'
        }
      ]
    } catch (err) {
      console.error('Error fetching recent activities:', err)
      error.value = 'Son aktiviteler yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Bildirimler
  const getNotifications = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 400)) // Gecikme simülasyonu

      return [
        {
          id: 1,
          title: 'Sipariş #1092 hazır',
          message: 'Müşteri XYZ için sipariş hazır durumda.',
          type: 'info',
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 dakika önce
          read: false
        },
        {
          id: 2,
          title: 'Kritik stok seviyesi',
          message: 'M205 kodlu malzeme kritik stok seviyesinin altında.',
          type: 'warning',
          timestamp: new Date(Date.now() - 1000 * 60 * 65), // 65 dakika önce
          read: false
        },
        {
          id: 3,
          title: 'Bakım hatırlatması',
          message: 'CNC makinesi için planlı bakım zamanı.',
          type: 'success',
          timestamp: new Date(Date.now() - 1000 * 60 * 140), // 2+ saat önce
          read: true
        }
      ]
    } catch (err) {
      console.error('Error fetching notifications:', err)
      error.value = 'Bildirimler yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Haftalık sipariş verileri (grafik için)
  const getWeeklyOrdersData = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 600)) // Gecikme simülasyonu

      const labels = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
      
      return {
        labels,
        datasets: [
          {
            label: 'Bu Hafta',
            data: [5, 8, 10, 7, 12, 4, 3],
            borderColor: '#3a75c4',
            backgroundColor: 'rgba(58, 117, 196, 0.2)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Geçen Hafta',
            data: [4, 6, 8, 9, 6, 5, 3],
            borderColor: '#6c757d',
            backgroundColor: 'rgba(108, 117, 125, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            fill: true
          }
        ]
      }
    } catch (err) {
      console.error('Error fetching weekly orders data:', err)
      error.value = 'Haftalık sipariş verileri yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Aylık üretim verileri (grafik için)
  const getMonthlyProductionData = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 700)) // Gecikme simülasyonu

      const currentDate = new Date()
      const labels = []
      
      // Son 6 ay etiketlerini oluştur
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate)
        date.setMonth(date.getMonth() - i)
        const monthName = date.toLocaleString('tr-TR', { month: 'short' })
        labels.push(monthName)
      }
      
      return {
        labels,
        datasets: [
          {
            label: 'Planlanan Üretim',
            data: [65, 70, 80, 85, 90, 95],
            backgroundColor: 'rgba(58, 117, 196, 0.7)',
            categoryPercentage: 0.6,
            barPercentage: 0.8
          },
          {
            label: 'Gerçekleşen Üretim',
            data: [60, 65, 75, 80, 85, 92],
            backgroundColor: 'rgba(40, 167, 69, 0.7)',
            categoryPercentage: 0.6,
            barPercentage: 0.8
          }
        ]
      }
    } catch (err) {
      console.error('Error fetching monthly production data:', err)
      error.value = 'Aylık üretim verileri yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // Malzeme kategorileri dağılımı (pasta grafik için)
  const getMaterialCategoriesData = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Gerçek bir API çağrısı burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 500)) // Gecikme simülasyonu
      
      return {
        labels: ['Elektronik', 'Mekanik', 'Kablolar', 'Bağlantı Elemanları', 'Diğer'],
        datasets: [
          {
            data: [30, 25, 15, 20, 10],
            backgroundColor: [
              'rgba(58, 117, 196, 0.8)',
              'rgba(40, 167, 69, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(220, 53, 69, 0.8)',
              'rgba(108, 117, 125, 0.8)'
            ],
            hoverOffset: 4
          }
        ]
      }
    } catch (err) {
      console.error('Error fetching material categories data:', err)
      error.value = 'Malzeme kategori verileri yüklenirken bir hata oluştu'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    getOrderSummary,
    getInventorySummary,
    getProductionSummary,
    getRecentActivities,
    getNotifications,
    getWeeklyOrdersData,
    getMonthlyProductionData,
    getMaterialCategoriesData
  }
}