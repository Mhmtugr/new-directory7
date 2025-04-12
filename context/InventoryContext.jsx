import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [allocatedItems, setAllocatedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      // Fetch inventory data from Canias ERP or local database
      const response = await axios.get('/api/inventory');
      setInventory(response.data);
      
      // Also fetch allocated items info
      const allocatedResponse = await axios.get('/api/inventory/allocated');
      setAllocatedItems(allocatedResponse.data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Stok bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const checkItemAvailability = (itemId, quantity) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return { available: false, reason: 'Ürün bulunamadı' };
    
    const allocatedQuantity = allocatedItems[itemId] || 0;
    const availableQuantity = item.quantity - allocatedQuantity;
    
    return {
      available: availableQuantity >= quantity,
      availableQuantity,
      allocatedQuantity,
      totalQuantity: item.quantity,
      reason: availableQuantity < quantity ? `Yeterli stok yok. Mevcut: ${availableQuantity}, İstenen: ${quantity}` : null
    };
  };

  const allocateItems = async (orderId, items) => {
    try {
      const response = await axios.post('/api/inventory/allocate', { orderId, items });
      
      // Update local state
      setAllocatedItems(prev => {
        const updated = {...prev};
        items.forEach(item => {
          updated[item.id] = (updated[item.id] || 0) + item.quantity;
        });
        return updated;
      });
      
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Malzeme ayrılırken bir hata oluştu' };
    }
  };

  const releaseItems = async (orderId, items = null) => {
    try {
      // If items not specified, release all items allocated to order
      const response = await axios.post('/api/inventory/release', { orderId, items });
      
      // Update local state based on released items
      await fetchInventory(); // Refresh all inventory data
      
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Malzeme serbest bırakılırken bir hata oluştu' };
    }
  };

  return (
    <InventoryContext.Provider value={{ 
      inventory, 
      allocatedItems,
      loading, 
      error, 
      fetchInventory,
      checkItemAvailability,
      allocateItems,
      releaseItems
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
