import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from './UserContext';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders');
      setOrders(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Siparişler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addOrder = async (orderData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/orders', orderData);
      setOrders([...orders, response.data]);
      return { success: true, data: response.data };
    } catch (err) {
      setError('Sipariş eklenirken bir hata oluştu');
      return { success: false, error: err.response?.data?.message || 'Sipariş eklenirken bir hata oluştu' };
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (orderId, orderData) => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/orders/${orderId}`, orderData);
      setOrders(orders.map(order => order.id === orderId ? response.data : order));
      return { success: true, data: response.data };
    } catch (err) {
      setError('Sipariş güncellenirken bir hata oluştu');
      return { success: false, error: err.response?.data?.message || 'Sipariş güncellenirken bir hata oluştu' };
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (orderId, note) => {
    try {
      const response = await axios.post(`/api/orders/${orderId}/notes`, note);
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          const updatedOrder = {...order};
          updatedOrder.notes = [...(updatedOrder.notes || []), response.data];
          return updatedOrder;
        }
        return order;
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Not eklenirken bir hata oluştu' };
    }
  };

  const checkStock = async (orderId) => {
    try {
      const response = await axios.post(`/api/orders/${orderId}/check-stock`);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Stok kontrolü yapılırken bir hata oluştu' };
    }
  };

  const generateProductionSchedule = async (orderId) => {
    try {
      const response = await axios.post(`/api/orders/${orderId}/production-schedule`);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Üretim planı oluşturulurken bir hata oluştu' };
    }
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      loading, 
      error, 
      fetchOrders, 
      addOrder, 
      updateOrder, 
      addNote, 
      checkStock, 
      generateProductionSchedule 
    }}>
      {children}
    </OrderContext.Provider>
  );
};
