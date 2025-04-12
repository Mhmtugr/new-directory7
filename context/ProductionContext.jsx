import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const ProductionContext = createContext();

export const ProductionProvider = ({ children }) => {
  const [schedule, setSchedule] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProductionSchedule();
    fetchProductionHistory();
  }, []);

  const fetchProductionSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/production/schedule');
      setSchedule(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching production schedule:', err);
      setError('Üretim planı yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionHistory = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/production/history', { params: filters });
      setProductionHistory(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching production history:', err);
      setError('Üretim geçmişi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateProductionTask = async (taskId, status, notes = null, completionData = null) => {
    try {
      const response = await axios.put(`/api/production/tasks/${taskId}`, {
        status,
        notes,
        completionData
      });
      
      // Update local state
      setSchedule(prev => prev.map(task => {
        if (task.id === taskId) {
          return {...task, ...response.data};
        }
        return task;
      }));
      
      return { success: true, data: response.data };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Üretim görevi güncellenirken bir hata oluştu' 
      };
    }
  };

  const generateProductionPlan = async (orderId) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/production/generate-plan', { orderId });
      
      // Refresh schedule after generating new plan
      await fetchProductionSchedule();
      
      return { success: true, data: response.data };
    } catch (err) {
      setError('Üretim planı oluşturulurken bir hata oluştu');
      return { 
        success: false, 
        error: err.response?.data?.message || 'Üretim planı oluşturulurken bir hata oluştu' 
      };
    } finally {
      setLoading(false);
    }
  };

  const estimateProductionTime = async (orderDetails) => {
    try {
      const response = await axios.post('/api/production/estimate-time', orderDetails);
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('Error estimating production time:', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Üretim süresi tahmin edilirken bir hata oluştu'
      };
    }
  };

  return (
    <ProductionContext.Provider value={{ 
      schedule,
      productionHistory, 
      loading, 
      error, 
      fetchProductionSchedule,
      fetchProductionHistory,
      updateProductionTask,
      generateProductionPlan,
      estimateProductionTime
    }}>
      {children}
    </ProductionContext.Provider>
  );
};
