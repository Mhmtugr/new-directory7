import { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Divider, 
  Chip, 
  LinearProgress, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { 
  Inventory as InventoryIcon, 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon
} from '@mui/icons-material';

/**
 * Seçilen malzeme için detay önizleme bileşeni
 */
const MaterialPreview = ({ material, movements = [] }) => {
  const [movementType, setMovementType] = useState('all');
  
  if (!material) return null;
  
  // Stok seviyesi belirleme
  const stockRatio = material.minQuantity > 0 
    ? Math.min(100, (material.quantity / material.minQuantity) * 100) 
    : 100;
  
  const stockColor = material.quantity === 0 ? 'error' :
                    material.quantity <= material.minQuantity ? 'warning' : 'success';
  
  // Son hareketler filtreleme
  const filteredMovements = movementType === 'all' 
    ? movements 
    : movements.filter(m => m.type === movementType);
  
  // Hareket türlerine göre renk ve ikon belirleme
  const getMovementIcon = (type) => {
    switch(type) {
      case 'IN': return <CallReceivedIcon fontSize="small" color="success" />;
      case 'OUT': return <CallMadeIcon fontSize="small" color="error" />;
      case 'ADJUST': return <TrendingUpIcon fontSize="small" color="info" />;
      default: return <InventoryIcon fontSize="small" />;
    }
  };
  
  // Hareket tiplerini formatlama
  const formatMovementType = (type) => {
    switch(type) {
      case 'IN': return 'Giriş';
      case 'OUT': return 'Çıkış';
      case 'ADJUST': return 'Düzeltme';
      default: return type;
    }
  };
  
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Malzeme Detayı
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Malzeme Bilgileri
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Kod
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {material.code}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Ad
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {material.name}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Kategori
              </Typography>
              <Chip size="small" label={material.category} color="primary" />
            </Box>
            
            {material.description && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Açıklama
                </Typography>
                <Typography variant="body1">
                  {material.description}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Stok Durumu
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h3" sx={{ mr: 2 }}>
              {material.quantity}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {material.unit}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Minimum Stok Seviyesi: {material.minQuantity} {material.unit}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={stockRatio} 
              color={stockColor}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {stockRatio.toFixed(0)}% doluluk
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {material.quantity === 0 ? (
              <Chip 
                icon={<WarningIcon />}
                label="Stok Tükendi" 
                color="error"
              />
            ) : material.quantity <= material.minQuantity ? (
              <Chip 
                icon={<WarningIcon />}
                label="Kritik Stok Seviyesi" 
                color="warning"
              />
            ) : (
              <Chip 
                icon={<CheckIcon />}
                label="Stok Yeterli" 
                color="success"
              />
            )}
            
            <Chip 
              label={`Birim: ${material.unit}`} 
              variant="outlined"
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Hızlı İşlemler
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
            >
              Stok Ekle
            </Button>
            
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
            >
              Stok Çıkışı
            </Button>
            
            <Button 
              variant="outlined" 
              color="warning" 
              fullWidth
              disabled={material.quantity > material.minQuantity}
            >
              Satın Alma Talebi Oluştur
            </Button>
            
            <Button 
              variant="text" 
              color="primary" 
              fullWidth
            >
              Malzeme Kartını Düzenle
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle2">
            Stok Hareketleri
          </Typography>
          
          <ToggleButtonGroup
            value={movementType}
            exclusive
            onChange={(e, newType) => newType && setMovementType(newType)}
            size="small"
          >
            <ToggleButton value="all">Tümü</ToggleButton>
            <ToggleButton value="IN">Girişler</ToggleButton>
            <ToggleButton value="OUT">Çıkışlar</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>İşlem</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell>Miktar</TableCell>
                <TableCell>Referans</TableCell>
                <TableCell>Açıklama</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Kayıtlı stok hareketi bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getMovementIcon(movement.type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {formatMovementType(movement.type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(movement.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{movement.quantity} {material.unit}</TableCell>
                    <TableCell>{movement.reference || '-'}</TableCell>
                    <TableCell>{movement.description || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};

export default MaterialPreview;
