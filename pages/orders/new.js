import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Grid, 
  TextField, 
  Paper, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { OrderContext } from '../../context/OrderContext';
import { InventoryContext } from '../../context/InventoryContext';
import { ProductionContext } from '../../context/ProductionContext';
import MaterialSelector from '../../components/MaterialSelector';
import TechnicalSpecsForm from '../../components/TechnicalSpecsForm';

const steps = ['Sipariş Bilgileri', 'Teknik Özellikler', 'Malzeme Listesi', 'Üretim Planı', 'Özet'];

export default function NewOrder() {
  const router = useRouter();
  const { addOrder } = useContext(OrderContext);
  const { checkItemAvailability } = useContext(InventoryContext);
  const { estimateProductionTime } = useContext(ProductionContext);
  
  const [activeStep, setActiveStep] = useState(0);
  const [orderData, setOrderData] = useState({
    customer: '',
    orderNumber: '',
    description: '',
    deadline: '',
    priority: 'normal',
    technicalSpecs: {},
    materials: [],
    notes: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
  const [productionEstimate, setProductionEstimate] = useState(null);
  
  // Check inventory for selected materials
  useEffect(() => {
    if (activeStep === 3 && orderData.materials.length > 0) {
      checkInventory();
      estimateProduction();
    }
  }, [activeStep, orderData.materials]);
  
  const checkInventory = async () => {
    setLoading(true);
    
    try {
      // Check availability for each material
      const itemsStatus = orderData.materials.map(material => {
        const availability = checkItemAvailability(material.id, material.quantity);
        return {
          ...material,
          available: availability.available,
          availableQuantity: availability.availableQuantity,
          shortageAmount: !availability.available ? material.quantity - availability.availableQuantity : 0
        };
      });
      
      const anyShortage = itemsStatus.some(item => !item.available);
      
      setStockStatus({
        hasAllItems: !anyShortage,
        items: itemsStatus,
        shortageItems: itemsStatus.filter(item => !item.available)
      });
    } catch (error) {
      console.error('Error checking inventory:', error);
      setError('Stok kontrolü yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const estimateProduction = async () => {
    setLoading(true);
    
    try {
      const result = await estimateProductionTime({
        technicalSpecs: orderData.technicalSpecs,
        materials: orderData.materials
      });
      
      if (result.success) {
        setProductionEstimate(result.data);
      } else {
        setError('Üretim süresi hesaplanırken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error estimating production:', error);
      setError('Üretim süresi hesaplanırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleOrderDataChange = (field, value) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleTechnicalSpecsChange = (specs) => {
    setOrderData(prev => ({
      ...prev,
      technicalSpecs: specs
    }));
  };
  
  const handleMaterialsChange = (materials) => {
    setOrderData(prev => ({
      ...prev,
      materials: materials
    }));
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add production estimate to the order
      const orderToSubmit = {
        ...orderData,
        productionEstimate,
        stockStatus
      };
      
      const result = await addOrder(orderToSubmit);
      
      if (result.success) {
        router.push(`/orders/${result.data.id}`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setError('Sipariş oluşturulurken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };
  
  const getStepContent = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Müşteri Adı"
                value={orderData.customer}
                onChange={(e) => handleOrderDataChange('customer', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Sipariş Numarası"
                value={orderData.orderNumber}
                onChange={(e) => handleOrderDataChange('orderNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={orderData.description}
                onChange={(e) => handleOrderDataChange('description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Termin Tarihi"
                type="date"
                value={orderData.deadline}
                onChange={(e) => handleOrderDataChange('deadline', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Öncelik</InputLabel>
                <Select
                  value={orderData.priority}
                  onChange={(e) => handleOrderDataChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Düşük</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">Yüksek</MenuItem>
                  <MenuItem value="urgent">Acil</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <TechnicalSpecsForm 
            specs={orderData.technicalSpecs}
            onChange={handleTechnicalSpecsChange}
          />
        );
      case 2:
        return (
          <MaterialSelector 
            selectedMaterials={orderData.materials}
            onChange={handleMaterialsChange}
          />
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Üretim Planı
            </Typography>
            
            {loading ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Stok Durumu
                </Typography>
                
                {stockStatus && (
                  <Alert 
                    severity={stockStatus.hasAllItems ? 'success' : 'warning'}
                    sx={{ mb: 3 }}
                  >
                    {stockStatus.hasAllItems 
                      ? 'Tüm malzemeler stokta mevcut.' 
                      : `${stockStatus.shortageItems.length} malzemede stok eksikliği bulunmaktadır.`
                    }
                  </Alert>
                )}
                
                {stockStatus?.shortageItems?.length > 0 && (
                  <Box mb={3}>
                    <Typography variant="subtitle2">
                      Eksik Malzemeler:
                    </Typography>
                    <ul>
                      {stockStatus.shortageItems.map((item, index) => (
                        <li key={index}>
                          {item.name} - Gerekli: {item.quantity}, Stokta: {item.availableQuantity}
                          {item.shortageAmount > 0 && ` (Eksik: ${item.shortageAmount})`}
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Tahmini Üretim Süresi
                </Typography>
                
                {productionEstimate ? (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2">Toplam Üretim Süresi</Typography>
                          <Typography variant="h4">{productionEstimate.totalDays} gün</Typography>
                          <Typography variant="body2">({productionEstimate.totalHours} saat)</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2">Tahmini Tamamlanma Tarihi</Typography>
                          <Typography variant="h6">
                            {new Date(productionEstimate.estimatedCompletionDate).toLocaleDateString()}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Box mt={3}>
                      <Typography variant="subtitle2">
                        Üretim Aşamaları
                      </Typography>
                      <ul>
                        {productionEstimate.stages.map((stage, index) => (
                          <li key={index}>
                            <Typography>
                              {stage.name}: {stage.days} gün ({stage.hours} saat)
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    Üretim süresi hesaplanırken bir sorun oluştu.
                  </Typography>
                )}
              </>
            )}
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Sipariş Özeti
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Müşteri</Typography>
                  <Typography variant="body1">{orderData.customer}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Sipariş Numarası</Typography>
                  <Typography variant="body1">{orderData.orderNumber}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Termin Tarihi</Typography>
                  <Typography variant="body1">{new Date(orderData.deadline).toLocaleDateString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Öncelik</Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {orderData.priority}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Box mt={3}>
              <Typography variant="subtitle1">
                Toplam Malzeme Sayısı: {orderData.materials.length}
              </Typography>
              
              {productionEstimate && (
                <Typography variant="subtitle1">
                  Tahmini Üretim Süresi: {productionEstimate.totalDays} gün
                </Typography>
              )}
            </Box>
            
            {stockStatus && !stockStatus.hasAllItems && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                Bazı malzemelerde stok eksikliği bulunmaktadır. Satın alma birimine otomatik bildirim gönderilecektir.
              </Alert>
            )}
          </Box>
        );
      default:
        return 'Bilinmeyen adım';
    }
  };

  return (
    <Container>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Yeni Sipariş Oluştur
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {getStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }} disabled={loading}>
              Geri
            </Button>
          )}
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Siparişi Oluştur'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={loading}
            >
              İleri
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
