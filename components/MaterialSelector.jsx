import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

const MaterialSelector = ({ selectedMaterials = [], onChange }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, []);
  
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/inventory/materials');
      setMaterials(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Malzeme listesi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/inventory/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };
  
  const handleOpenDialog = (material = null) => {
    if (material) {
      // Editing existing material
      const existingEntry = selectedMaterials.find(m => m.id === material.id);
      setCurrentMaterial(material);
      setQuantity(existingEntry ? existingEntry.quantity : 1);
    } else {
      // Reset for adding new
      setCurrentMaterial(null);
      setQuantity(1);
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentMaterial(null);
    setQuantity(1);
  };
  
  const handleAddMaterial = (material) => {
    if (quantity <= 0) return;
    
    // Create material entry with quantity
    const materialEntry = {
      ...material,
      quantity
    };
    
    // Check if material already exists in selection
    const materialExists = selectedMaterials.findIndex(m => m.id === material.id);
    
    if (materialExists >= 0) {
      // Update existing material
      const updatedMaterials = [...selectedMaterials];
      updatedMaterials[materialExists] = materialEntry;
      onChange(updatedMaterials);
    } else {
      // Add new material
      onChange([...selectedMaterials, materialEntry]);
    }
    
    handleCloseDialog();
  };
  
  const handleRemoveMaterial = (materialId) => {
    const updatedMaterials = selectedMaterials.filter(m => m.id !== materialId);
    onChange(updatedMaterials);
  };
  
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        material.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Malzeme Seçimi
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Seçilen Malzemeler ({selectedMaterials.length})
        </Typography>
        
        {selectedMaterials.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Henüz malzeme seçilmedi. Lütfen aşağıdan malzeme ekleyin.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kod</TableCell>
                  <TableCell>Malzeme</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell align="right">Miktar</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.code}</TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>{material.category}</TableCell>
                    <TableCell align="right">{material.quantity}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenDialog(material)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveMaterial(material.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Malzeme Ara
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Malzeme ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={selectedCategory}
                label="Kategori"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">Tümü</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kod</TableCell>
              <TableCell>Malzeme</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell align="right">Birim</TableCell>
              <TableCell align="right">Ekle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Yükleniyor...</TableCell>
              </TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Malzeme bulunamadı</TableCell>
              </TableRow>
            ) : (
              filteredMaterials.map((material) => {
                const isSelected = selectedMaterials.some(m => m.id === material.id);
                
                return (
                  <TableRow key={material.id} hover>
                    <TableCell>{material.code}</TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={material.category} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{material.unit}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={isSelected ? "outlined" : "contained"}
                        onClick={() => handleOpenDialog(material)}
                        startIcon={isSelected ? <EditIcon /> : <AddIcon />}
                      >
                        {isSelected ? 'Düzenle' : 'Ekle'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {currentMaterial ? `${currentMaterial.name} - Miktar` : 'Malzeme Ekle'}
        </DialogTitle>
        <DialogContent>
          {currentMaterial && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">
                Kod: {currentMaterial.code}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Birim: {currentMaterial.unit}
              </Typography>
              
              <TextField
                fullWidth
                label="Miktar"
                type="number"
                InputProps={{ inputProps: { min: 1 } }}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button 
            onClick={() => handleAddMaterial(currentMaterial)} 
            variant="contained" 
            disabled={!currentMaterial || quantity <= 0}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialSelector;
