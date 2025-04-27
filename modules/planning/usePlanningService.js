/**
 * usePlanningService.js
 * Üretim planlama ve kapasite yönetimi için servis fonksiyonları
 */

import { ref } from 'vue';
import apiService from '@/services/api-service';
import { useToast } from '@/composables/useToast';

export function usePlanningService() {
  const { toast } = useToast();

  // Demo üretim birimleri ve kapasiteleri
  const demoProductionUnits = [
    { id: 'elektrik_tasarim', name: 'Elektrik Tasarım', capacity: 160 },
    { id: 'mekanik_tasarim', name: 'Mekanik Tasarım', capacity: 120 },
    { id: 'satin_alma', name: 'Satın Alma', capacity: 80 },
    { id: 'mekanik_uretim', name: 'Mekanik Üretim', capacity: 200 },
    { id: 'ic_montaj', name: 'İç Montaj', capacity: 240 },
    { id: 'kablaj', name: 'Kablaj', capacity: 320 },
    { id: 'genel_montaj', name: 'Genel Montaj', capacity: 280 },
    { id: 'test', name: 'Test', capacity: 160 }
  ];

  // Demo siparişler
  const demoOrders = [
    { id: 'SPR-2025-001', orderId: 'SPR-2025-001', customerName: 'İBB Elektrik', cellType: 'RM 36 CB', quantity: 2, status: 'production', priority: 'high' },
    { id: 'SPR-2025-002', orderId: 'SPR-2025-002', customerName: 'Antalya Belediyesi', cellType: 'RM 36 LB', quantity: 5, status: 'production', priority: 'medium' },
    { id: 'SPR-2025-003', orderId: 'SPR-2025-003', customerName: 'TEDAŞ Ankara', cellType: 'RM 36 FL', quantity: 3, status: 'pending', priority: 'medium' },
    { id: 'SPR-2025-004', orderId: 'SPR-2025-004', customerName: 'Bursa Enerji', cellType: 'RM 36 MB', quantity: 1, status: 'production', priority: 'high' },
    { id: 'SPR-2025-005', orderId: 'SPR-2025-005', customerName: 'İzmir Elektrik', cellType: 'RM 36 CB', quantity: 4, status: 'approved', priority: 'low' }
  ];

  /**
   * Planlama verileri yükle (siparişler, kapasite bilgileri vb.)
   */
  const getPlanningData = async () => {
    try {
      // Gerçek uygulamada API çağrıları yapılacak
      // const [orders, productionUnits] = await Promise.all([
      //   apiService.get('/orders?status=active'),
      //   apiService.get('/production-units')
      // ]);

      // Demo veriler için gecikme ekleyelim
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo siparişleri kullan
      const orders = [...demoOrders];
      
      // Schedule oluştur
      const schedule = await generateSchedule(orders);
      
      // Kapasite yükünü hesapla
      const capacityLoad = calculateCapacityLoad(schedule);
      
      // Teslimat tahminlerini oluştur
      const deliveryEstimates = generateDeliveryEstimates(schedule);

      return {
        orders,
        productionUnits: demoProductionUnits,
        schedule,
        capacityLoad,
        deliveryEstimates
      };
    } catch (error) {
      console.error('Planlama verileri yüklenirken hata:', error);
      throw new Error('Planlama verileri yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  /**
   * Bir sipariş için tahmini üretim süresini hesaplar (Demo Kural Bazlı)
   * @param {object} order Sipariş objesi
   * @returns {number} Tahmini süre (saat cinsinden)
   */
  const estimateProductionTime = (order) => {
    let estimatedHours = 0;
    const quantity = order.quantity || 1;
    const cellType = order.cellType || 'unknown';

    // Basit kural tabanlı tahmin
    switch (cellType.toLowerCase()) {
      case 'rm 36 cb': estimatedHours = 10; break;
      case 'rm 36 lb': estimatedHours = 12; break;
      case 'rm 36 fl': estimatedHours = 15; break;
      case 'rm 36 mb': estimatedHours = 18; break;
      default: estimatedHours = 8; // Bilinmeyen tip için varsayılan
    }

    // Miktar ile çarp
    estimatedHours *= quantity;

    return Math.max(1, estimatedHours); // Minimum 1 saat
  };

  /**
   * Siparişlere göre bir üretim zaman çizelgesi oluşturur
   * @param {Array<object>} orders Sipariş listesi
   * @returns {Promise<Array<object>>} Zaman çizelgesi öğeleri
   */
  const generateSchedule = async (orders) => {
    let schedule = [];
    let currentTime = new Date(); // Başlangıç zamanı
    currentTime.setHours(8, 0, 0, 0); // Çalışma saati başlangıcı

    // Basit sıralı planlama (FIFO)
    for (const order of orders) {
      const durationHours = estimateProductionTime(order);
      const durationMillis = durationHours * 60 * 60 * 1000;

      let startTime = new Date(currentTime);
      let endTime = new Date(currentTime.getTime() + durationMillis);

      // Hafta sonu kontrolü
      if (endTime.getDay() === 6) { // Cumartesi
        endTime.setDate(endTime.getDate() + 2); // Pazartesiye atla
        endTime.setHours(8, 0, 0, 0);
      } else if (endTime.getDay() === 0) { // Pazar
        endTime.setDate(endTime.getDate() + 1); // Pazartesiye atla
        endTime.setHours(8, 0, 0, 0);
      }

      // Kaynakları siparişin özelliklerine göre ata (demo için basit atama)
      const resourceId = order.cellType?.includes('CB') 
        ? 'elektrik_tasarim' 
        : order.cellType?.includes('LB') 
          ? 'mekanik_tasarim' 
          : 'genel_montaj';

      schedule.push({
        id: `task-${order.orderId || order.id}`,
        orderId: order.orderId || order.id,
        taskName: `Sipariş: ${order.orderId || order.id} (${order.cellType || 'N/A'})`,
        start: startTime,
        end: endTime,
        resourceId: resourceId
      });

      currentTime = new Date(endTime); // Bir sonraki görev bu görevin bitiminde başlar
    }
    return schedule;
  };

  /**
   * Zaman çizelgesine göre birimlerin kapasite yükünü hesaplar
   * @param {Array<object>} schedule Zaman çizelgesi
   * @returns {object} Birim ID'si başına yüklenen saatleri içeren obje
   */
  const calculateCapacityLoad = (schedule) => {
    const load = {};
    demoProductionUnits.forEach(unit => load[unit.id] = 0); // Başlangıç yükleri

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    schedule.forEach(task => {
      // Bu hafta içinde olan görevlerin yükünü hesapla
      if (task.start < nextWeek && task.end > now) {
        const resource = task.resourceId || 'genel_montaj';
        const durationHours = (task.end - task.start) / (1000 * 60 * 60);
        if (load[resource] !== undefined) {
          load[resource] += durationHours;
        } else {
          load['genel_montaj'] += durationHours;
        }
      }
    });
    return load;
  };

  /**
   * Zaman çizelgesine göre tahmini teslimatları oluşturur
   * @param {Array<object>} schedule Zaman çizelgesi
   * @returns {Array<object>} Teslimat tahminleri
   */
  const generateDeliveryEstimates = (schedule) => {
    return schedule.map(task => ({
      orderId: task.orderId,
      estimatedDeliveryDate: task.end
    }));
  };

  /**
   * Planlama parametrelerini güncelle (kapasiteler, öncelikler vb)
   * @param {Object} params Güncellenecek parametreler
   */
  const updatePlanningParameters = async (params) => {
    try {
      // Gerçek uygulamada API çağrısı yapılacak
      // return await apiService.post('/planning/parameters', params);
      
      // Demo için gecikme ekleyelim
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success("Planlama parametreleri güncellendi");
      return { success: true, message: "Parametreler güncellendi" };
    } catch (error) {
      console.error('Parametreler güncellenirken hata:', error);
      toast.error("Parametreler güncellenemedi");
      throw new Error('Parametreler güncellenemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Dışa aktarılan fonksiyonlar
  return {
    getPlanningData,
    estimateProductionTime,
    updatePlanningParameters
  };
}