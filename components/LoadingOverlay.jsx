import { useContext } from 'react';
import { AIContext } from '../context/AIContext';
import { OrderContext } from '../context/OrderContext';
import { InventoryContext } from '../context/InventoryContext';
import { ProductionContext } from '../context/ProductionContext';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

export default function LoadingOverlay() {
  const { loading: aiLoading } = useContext(AIContext);
  const { loading: orderLoading } = useContext(OrderContext);
  const { loading: inventoryLoading } = useContext(InventoryContext);
  const { loading: productionLoading } = useContext(ProductionContext);
  
  const isLoading = aiLoading || orderLoading || inventoryLoading || productionLoading;
  
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column'
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
      <Box mt={2}>
        <Typography variant="body1">
          {aiLoading ? 'Yapay zeka işlemi gerçekleştiriliyor...' :
           orderLoading ? 'Sipariş bilgileri yükleniyor...' :
           inventoryLoading ? 'Stok bilgileri yükleniyor...' :
           productionLoading ? 'Üretim bilgileri yükleniyor...' :
           'Yükleniyor...'}
        </Typography>
      </Box>
    </Backdrop>
  );
}
