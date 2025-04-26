import { 
  addDocument, 
  updateDocument, 
  getDocument, 
  queryDocuments,
  deleteDocument
} from './firebaseService';

/**
 * Malzemeleri belirli filtrelere göre getir
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Malzemeler dizisi
 */
const getMaterials = async (filters = {}) => {
  try {
    // Filtreleri oluştur
    let queryFilters = {};
    
    // Tedarikçi filtresi
    if (filters.supplier) {
      queryFilters.supplier = filters.supplier;
    }
    
    // Durum filtresi
    if (filters.status) {
      queryFilters.status = filters.status;
    }
    
    // Sipariş ID filtresi
    if (filters.orderId) {
      queryFilters.orderId = filters.orderId;
    }
    
    // Stok durumu filtresi
    if (filters.hasOwnProperty('inStock') && typeof filters.inStock === 'boolean') {
      queryFilters.inStock = filters.inStock;
    }
    
    // Sıralama için kullanılacak alan ve yön
    let sortOptions = { 
      field: filters.orderBy || 'name', 
      direction: filters.orderDir || 'asc' 
    };
    
    // Limit
    const limitCount = filters.limit || null;
    
    return await queryDocuments('materials', queryFilters, sortOptions, limitCount);
  } catch (error) {
    console.error("Malzemeleri getirme hatası:", error);
    throw error;
  }
};

/**
 * Belirli bir malzemeyi getir
 * @param {string} materialId - Malzeme ID'si
 * @returns {Promise<Object>} Malzeme bilgileri
 */
const getMaterial = async (materialId) => {
  try {
    return await getDocument('materials', materialId);
  } catch (error) {
    console.error("Malzeme getirme hatası:", error);
    throw error;
  }
};

/**
 * Yeni malzeme ekle
 * @param {Object} materialData - Eklenecek malzeme verileri
 * @returns {Promise<Object>} Eklenen malzeme bilgisi
 */
const addMaterial = async (materialData) => {
  try {
    return await addDocument('materials', materialData);
  } catch (error) {
    console.error("Malzeme ekleme hatası:", error);
    throw error;
  }
};

/**
 * Malzeme güncelle
 * @param {string} materialId - Malzeme ID'si
 * @param {Object} materialData - Güncellenecek malzeme verileri
 * @returns {Promise<Object>} Güncellenen malzeme bilgisi
 */
const updateMaterial = async (materialId, materialData) => {
  try {
    return await updateDocument('materials', materialId, materialData);
  } catch (error) {
    console.error("Malzeme güncelleme hatası:", error);
    throw error;
  }
};

/**
 * Malzeme sil
 * @param {string} materialId - Malzeme ID'si
 * @returns {Promise<Object>} Silme sonucu
 */
const deleteMaterial = async (materialId) => {
  try {
    return await deleteDocument('materials', materialId);
  } catch (error) {
    console.error("Malzeme silme hatası:", error);
    throw error;
  }
};

/**
 * Sipariş için toplu malzeme ekle
 * @param {string} orderId - Sipariş ID'si
 * @param {Array} materials - Eklenecek malzemeler dizisi
 * @returns {Promise<Array>} Eklenen malzemelerin ID'leri
 */
const addOrderMaterials = async (orderId, materials) => {
  try {
    const results = [];
    
    for (const material of materials) {
      const materialData = {
        ...material,
        orderId
      };
      
      const result = await addDocument('materials', materialData);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error("Sipariş malzemeleri ekleme hatası:", error);
    throw error;
  }
};

/**
 * Stokta bulunan malzemeleri getir
 * @param {number} limit - Maksimum sonuç sayısı (opsiyonel)
 * @returns {Promise<Array>} Stokta bulunan malzemeler dizisi
 */
const getInStockMaterials = async (limit = null) => {
  try {
    return await queryDocuments(
      'materials', 
      { inStock: true }, 
      { field: 'name', direction: 'asc' },
      limit
    );
  } catch (error) {
    console.error("Stokta bulunan malzemeleri getirme hatası:", error);
    throw error;
  }
};

/**
 * Stok hareketi ekle
 * @param {Object} movementData - Stok hareketi verileri
 * @returns {Promise<Object>} Eklenen stok hareketi bilgisi
 */
const addStockMovement = async (movementData) => {
  try {
    // Stok hareketi ekle
    const result = await addDocument('stockMovements', movementData);
    
    // İlgili malzemenin stok durumunu güncelle
    if (movementData.materialId) {
      const material = await getMaterial(movementData.materialId);
      
      // Stok miktarını hesapla
      let newQuantity = material.quantity || 0;
      
      if (movementData.type === 'in') {
        newQuantity += movementData.quantity;
      } else if (movementData.type === 'out') {
        newQuantity -= movementData.quantity;
      }
      
      // Stok durumunu güncelle
      await updateMaterial(movementData.materialId, {
        quantity: newQuantity,
        inStock: newQuantity > 0
      });
    }
    
    return result;
  } catch (error) {
    console.error("Stok hareketi ekleme hatası:", error);
    throw error;
  }
};

export {
  getMaterials,
  getMaterial,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addOrderMaterials,
  getInStockMaterials,
  addStockMovement
};