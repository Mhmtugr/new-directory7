import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Button,
  IconButton,
  Divider,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';

const TechnicalSpecsForm = ({ specs = {}, onChange }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customFields, setCustomFields] = useState([
    { name: 'voltaj', label: 'Voltaj', value: specs.voltaj || '', type: 'text' },
    { name: 'akim', label: 'Akım', value: specs.akim || '', type: 'text' },
    { name: 'boyut', label: 'Boyut', value: specs.boyut || '', type: 'text' }
  ]);
  const [newField, setNewField] = useState({ name: '', label: '', type: 'text' });
  
  useEffect(() => {
    // Mevcut specs'ten customFields'i oluştur
    if (Object.keys(specs).length > 0) {
      const existingFields = Object.entries(specs).map(([name, value]) => {
        // Mevcut alanı bul
        const existingField = customFields.find(f => f.name === name);
        return {
          name,
          label: existingField?.label || name.charAt(0).toUpperCase() + name.slice(1),
          value,
          type: existingField?.type || 'text'
        };
      });
      
      if (existingFields.length > 0) {
        setCustomFields(existingFields);
      }
    }
    
    // Şablon listesini yükle
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/technical-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };
  
  const handleFieldChange = (index, value) => {
    const updatedFields = [...customFields];
    updatedFields[index].value = value;
    setCustomFields(updatedFields);
    
    // Değişiklikleri üst bileşene bildir
    const updatedSpecs = {};
    updatedFields.forEach(field => {
      if (field.name && field.value) {
        updatedSpecs[field.name] = field.value;
      }
    });
    onChange(updatedSpecs);
  };
  
  const handleAddField = () => {
    if (!newField.name || !newField.label) return;
    
    // Alan adını formata uygun hale getir (boşluksuz, küçük harf)
    const formattedName = newField.name.trim().toLowerCase().replace(/\s+/g, '_');
    
    setCustomFields([
      ...customFields,
      { ...newField, name: formattedName, value: '' }
    ]);
    
    // Yeni alan formunu temizle
    setNewField({ name: '', label: '', type: 'text' });
  };
  
  const handleRemoveField = (index) => {
    const updatedFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedFields);
    
    // Değişiklikleri üst bileşene bildir
    const updatedSpecs = {};
    updatedFields.forEach(field => {
      if (field.name && field.value) {
        updatedSpecs[field.name] = field.value;
      }
    });
    onChange(updatedSpecs);
  };
  
  const handleTemplateChange = (event) => {
    const templateId = event.target.value;
    setSelectedTemplate(templateId);
    
    if (!templateId) return;
    
    // Seçilen şablonu bul
    const template = templates.find(t => t.id === templateId);
    if (template && template.fields) {
      // Şablon alanlarını yükle, mevcut değerleri koru
      const templateFields = template.fields.map(field => {
        const existingField = customFields.find(f => f.name === field.name);
        return {
          ...field,
          value: existingField?.value || field.defaultValue || ''
        };
      });
      
      setCustomFields(templateFields);
      
      // Değişiklikleri üst bileşene bildir
      const updatedSpecs = {};
      templateFields.forEach(field => {
        if (field.name && field.value) {
          updatedSpecs[field.name] = field.value;
        }
      });
      onChange(updatedSpecs);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Teknik Özellikler
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Şablon Seçimi
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Şablon</InputLabel>
          <Select
            value={selectedTemplate}
            onChange={handleTemplateChange}
            label="Şablon"
          >
            <MenuItem value="">
              <em>Şablon Seçin (İsteğe Bağlı)</em>
            </MenuItem>
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Alert severity="info">
          Şablon seçerek önceden tanımlanmış teknik özellikleri hızlıca doldurabilirsiniz. İsterseniz alanları özelleştirebilirsiniz.
        </Alert>
      </Paper>
      
      <Grid container spacing={2}>
        {customFields.map((field, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper sx={{ p: 2, position: 'relative' }}>
              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">{field.label}</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleRemoveField(index)}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <TextField
                fullWidth
                size="small"
                type={field.type}
                placeholder={`${field.label} giriniz`}
                value={field.value}
                onChange={(e) => handleFieldChange(index, e.target.value)}
              />
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Alan Kodu: {field.name}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Yeni Özellik Ekle
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Alan Adı"
              size="small"
              value={newField.name}
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              placeholder="ör: maksimum_sicaklik"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Görünen Etiket"
              size="small"
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              placeholder="ör: Maksimum Sıcaklık"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tip</InputLabel>
              <Select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                label="Tip"
              >
                <MenuItem value="text">Metin</MenuItem>
                <MenuItem value="number">Sayı</MenuItem>
                <MenuItem value="date">Tarih</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth
              variant="outlined" 
              onClick={handleAddField}
              startIcon={<AddIcon />}
              disabled={!newField.name || !newField.label}
            >
              Ekle
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TechnicalSpecsForm;
