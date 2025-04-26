import { 
  addDocument, 
  updateDocument, 
  getDocument, 
  queryDocuments,
  collections,
  buildQuery,
  getDocsFromQuery,
  doc,
  updateDoc,
  db
} from './firebaseService';

/**
 * Sipariş numarası oluştur
 * @param {string} orderId - Sipariş ID'si
 * @returns {string} Oluşturulan sipariş numarası
 */
const generateOrderNumber = (orderId) => {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2); // Son 2 haneli yıl
  const month = ('0' + (now.getMonth() + 1)).slice(-2); // İki haneli ay
  
  return `${year}-${month}-${orderId.substring(0, 4).toUpperCase()}`;
};

/**
 * Tüm siparişleri getir
 * @param {string|string[]|null} status - Filtrelenecek durum (opsiyonel)
 * @param {number} limit - Maksimum sonuç sayısı (opsiyonel, varsayılan 50)
 * @returns {Promise<Array>} Siparişler dizisi
 */
const getOrders = async (status = null, limit = 50) => {
  try {
    let filters = {};
    let sortOptions = { field: 'createdAt', direction: 'desc' };
    
    // Duruma göre filtrele
    if (status) {
      filters.status = status;
    }
    
    return await queryDocuments('orders', filters, sortOptions, limit);
  } catch (error) {
    console.error("Siparişleri getirme hatası:", error);
    throw error;
  }
};

/**
 * Siparişleri filtrele ve getir
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Filtrelenmiş siparişler dizisi
 */
const filterOrders = async (filters = {}) => {
  try {
    let queryFilters = {};
    
    // Durum filtresi
    if (filters.status) {
      queryFilters.status = filters.status;
    }
    
    // Müşteri filtresi
    if (filters.customer) {
      queryFilters.customer = filters.customer;
    }
    
    // Hücre tipi
    if (filters.cellType) {
      queryFilters.cellType = filters.cellType;
    }
    
    // Tarih filtreleri daha karmaşık olduğu için ayrı değerlendirme gerekiyor
    // Tarih aralığı - sipariş tarihi
    if (filters.orderDateStart && filters.orderDateEnd) {
      // Burada tarih aralığı sorgusu için composite query yapmak gerekecek
      // Basitleştirmek için tüm siparişleri çekip JS tarafında filtreleyeceğiz
      // İleride Firebase v9 composite query kullanımına geçilebilir
    }
    
    // Sıralama için kullanılacak alan ve yön
    let sortOptions = { 
      field: filters.orderBy || 'createdAt', 
      direction: filters.orderDir || 'desc' 
    };
    
    // Limit
    const limitCount = filters.limit || null;
    
    return await queryDocuments('orders', queryFilters, sortOptions, limitCount);
  } catch (error) {
    console.error("Siparişleri filtreleme hatası:", error);
    throw error;
  }
};

/**
 * Sipariş ekle
 * @param {Object} orderData - Eklenecek sipariş verileri
 * @returns {Promise<Object>} Eklenen sipariş bilgisi
 */
const addOrder = async (orderData) => {
  try {
    // Sipariş ekle ve ID'sini al
    const { id } = await addDocument('orders', orderData);
    
    // Sipariş no oluştur
    const orderNo = generateOrderNumber(id);
    
    // Sipariş numarasını güncelle
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, { orderNo });
    
    return {
      id,
      orderNo
    };
  } catch (error) {
    console.error("Sipariş ekleme hatası:", error);
    throw error;
  }
};

/**
 * Sipariş güncelle
 * @param {string} orderId - Sipariş ID'si
 * @param {Object} orderData - Güncellenecek sipariş verileri
 * @returns {Promise<Object>} Güncellenen sipariş bilgisi
 */
const updateOrder = async (orderId, orderData) => {
  try {
    return await updateDocument('orders', orderId, orderData);
  } catch (error) {
    console.error("Sipariş güncelleme hatası:", error);
    throw error;
  }
};

/**
 * Sipariş detayını getir
 * @param {string} orderId - Sipariş ID'si
 * @returns {Promise<Object>} Sipariş detay bilgileri
 */
const getOrderDetail = async (orderId) => {
  try {
    // Önce sipariş bilgilerini al
    const orderData = await getDocument('orders', orderId);
    
    // Sipariş malzemelerini getir
    const materials = await queryDocuments('materials', { orderId });
    orderData.materials = materials;
    
    // Sipariş notlarını getir
    const notes = await queryDocuments('notes', 
      { entityType: 'order', entityId: orderId },
      { field: 'createdAt', direction: 'desc' }
    );
    orderData.notes = notes;
    
    return orderData;
  } catch (error) {
    console.error("Sipariş detayı getirme hatası:", error);
    throw error;
  }
};

/**
 * Sipariş durumunu güncelle
 * @param {string} orderId - Sipariş ID'si
 * @param {string} status - Yeni durum
 * @param {string|null} comment - Durum değişikliği hakkında isteğe bağlı yorum
 * @returns {Promise<boolean>} İşlem başarı durumu
 */
const updateOrderStatus = async (orderId, status, comment = null) => {
  try {
    // Durum güncellemesi
    const updateData = {
      status: status,
    };
    
    // Duruma özel tarih alanı ekle
    const statusDateField = `${status}Date`;
    updateData[statusDateField] = new Date();
    
    // Siparişi güncelle
    await updateDocument('orders', orderId, updateData);
    
    // Eğer bir yorum eklenecekse, not olarak kaydet
    if (comment) {
      await addDocument('notes', {
        entityType: 'order',
        entityId: orderId,
        content: comment,
        type: 'status_change',
        metadata: {
          oldStatus: '', // Önceki durum bilinmiyor, eklemek için önceki durum sorgulanabilir
          newStatus: status
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error("Sipariş durumu güncelleme hatası:", error);
    throw error;
  }
};

export {
  getOrders,
  filterOrders,
  addOrder,
  updateOrder,
  getOrderDetail,
  updateOrderStatus,
  generateOrderNumber
};