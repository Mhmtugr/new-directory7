import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Button, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Avatar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function ProductionIssues() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    riskLevel: 'MEDIUM',
    affectedDepartments: '',
    suggestedSolution: ''
  });
  const router = useRouter();

  // Sorunları yükle
  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/production/issues');
      setIssues(response.data);
    } catch (err) {
      console.error('Error loading production issues:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sorun kaydet
  const saveIssue = async () => {
    try {
      await axios.post('/api/production/issues', {
        ...newIssue,
        source: 'MANUAL'
      });
      
      setDialogOpen(false);
      resetNewIssue();
      loadIssues();
    } catch (err) {
      console.error('Error saving issue:', err);
    }
  };

  // Yeni sorun formu sıfırla
  const resetNewIssue = () => {
    setNewIssue({
      title: '',
      description: '',
      riskLevel: 'MEDIUM',
      affectedDepartments: '',
      suggestedSolution: ''
    });
  };

  // Sorun çözüldü olarak işaretle
  const resolveIssue = async (issueId, resolutionNotes) => {
    try {
      await axios.put(`/api/production/issues/${issueId}/resolve`, {
        resolutionNotes
      });
      
      loadIssues();
    } catch (err) {
      console.error('Error resolving issue:', err);
    }
  };

  // Risk seviyesi renk ve simgesi
  const riskLevelProps = {
    HIGH: { color: 'error', icon: <ErrorIcon /> },
    MEDIUM: { color: 'warning', icon: <WarningIcon /> },
    LOW: { color: 'info', icon: <InfoIcon /> }
  };

  // Sekmeler arasında geçiş
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Filtreleme
  const filteredIssues = issues.filter(issue => {
    if (activeTab === 0) return true; // Tüm sorunlar
    if (activeTab === 1) return !issue.isResolved; // Açık sorunlar
    if (activeTab === 2) return issue.isResolved; // Çözülmüş sorunlar
  });

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Üretim Sorunları
          </Typography>
          
          <Box>
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={loadIssues}
              sx={{ mr: 1 }}
            >
              Yenile
            </Button>
            
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => setDialogOpen(true)}
            >
              Yeni Sorun
            </Button>
          </Box>
        </Box>
        
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Tüm Sorunlar" />
            <Tab label={<Box display="flex" alignItems="center">
              Açık Sorunlar
              <Chip 
                label={issues.filter(i => !i.isResolved).length} 
                size="small" 
                color="error" 
                sx={{ ml: 1 }}
              />
            </Box>} />
            <Tab label="Çözülmüş Sorunlar" />
          </Tabs>
        </Paper>
        
        {loading ? (
          <Box display="flex" justifyContent="center" my={5}>
            <CircularProgress />
          </Box>
        ) : filteredIssues.length === 0 ? (
          <Alert severity="info">
            Bu kategoride herhangi bir sorun kaydı bulunamadı.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {filteredIssues.map(issue => (
              <Grid item xs={12} md={6} lg={4} key={issue.id}>
                <Card variant="outlined">
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: riskLevelProps[issue.riskLevel]?.color + '.main' }}>
                        {riskLevelProps[issue.riskLevel]?.icon}
                      </Avatar>
                    }
                    title={issue.title}
                    subheader={new Date(issue.createdAt).toLocaleString()}
                    action={
                      issue.isResolved && (
                        <Chip
                          icon={<CheckIcon />}
                          label="Çözüldü"
                          color="success"
                          size="small"
                          sx={{ mt: 1, mr: 1 }}
                        />
                      )
                    }
                  />
                  
                  <CardContent sx={{ pt: 0 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {issue.description}
                    </Typography>
                    
                    {issue.affectedDepartments && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Etkilenen Departmanlar:
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {issue.affectedDepartments.split(',').map(dept => (
                            <Chip 
                              key={dept} 
                              label={dept.trim()} 
                              size="small" 
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {issue.suggestedSolution && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Önerilen Çözüm:
                        </Typography>
                        <Typography variant="body2">
                          {issue.suggestedSolution}
                        </Typography>
                      </Box>
                    )}
                    
                    {issue.isResolved && issue.resolutionNotes && (
                      <Box mt={2}>
                        <Typography variant="caption" color="success.main">
                          Çözüm Notları:
                        </Typography>
                        <Typography variant="body2">
                          {issue.resolutionNotes}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Çözüm Tarihi: {new Date(issue.resolvedAt).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => router.push(`/production/issues/${issue.id}`)}
                    >
                      Detay
                    </Button>
                    
                    {!issue.isResolved && (
                      <Button 
                        size="small" 
                        color="success"
                        onClick={() => {
                          const notes = prompt('Çözüm notları:');
                          if (notes) {
                            resolveIssue(issue.id, notes);
                          }
                        }}
                      >
                        Çözüldü İşaretle
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      {/* Yeni Sorun Ekleme Dialog */}
      <Dialog 
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Yeni Üretim Sorunu</DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Başlık"
                  fullWidth
                  required
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Açıklama"
                  fullWidth
                  multiline
                  rows={4}
                  required
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Risk Seviyesi</InputLabel>
                  <Select
                    value={newIssue.riskLevel}
                    label="Risk Seviyesi"
                    onChange={(e) => setNewIssue({ ...newIssue, riskLevel: e.target.value })}
                  >
                    <MenuItem value="LOW">Düşük</MenuItem>
                    <MenuItem value="MEDIUM">Orta</MenuItem>
                    <MenuItem value="HIGH">Yüksek</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Etkilenen Departmanlar"
                  fullWidth
                  placeholder="ENGINEERING, ASSEMBLY, ..."
                  value={newIssue.affectedDepartments}
                  onChange={(e) => setNewIssue({ ...newIssue, affectedDepartments: e.target.value })}
                  helperText="Virgülle ayırarak yazın"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Önerilen Çözüm"
                  fullWidth
                  multiline
                  rows={3}
                  value={newIssue.suggestedSolution}
                  onChange={(e) => setNewIssue({ ...newIssue, suggestedSolution: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button 
            variant="contained" 
            onClick={saveIssue}
            disabled={!newIssue.title || !newIssue.description}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
