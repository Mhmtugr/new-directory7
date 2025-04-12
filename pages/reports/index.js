import { useState, useContext, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Assessment as AssessmentIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { AIContext } from '../../context/AIContext';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Reports() {
  const router = useRouter();
  const { generateReport } = useContext(AIContext);
  
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('production');
  const [period, setPeriod] = useState('month');
  const [recentReports, setRecentReports] = useState([]);
  
  useEffect(() => {
    fetchRecentReports();
  }, []);
  
  const fetchRecentReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/reports');
      setRecentReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const result = await generateReport(reportType, { period });
      
      if (result && result.report && result.report.id) {
        router.push(`/reports/${result.report.id}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const reportTypes = [
    { value: 'production', label: 'Üretim Raporu', icon: <TimelineIcon color="primary" /> },
    { value: 'inventory', label: 'Stok Raporu', icon: <PieChartIcon color="success" /> },
    { value: 'orders', label: 'Sipariş Raporu', icon: <AssessmentIcon color="info" /> },
    { value: 'performance', label: 'Performans Raporu', icon: <TrendingUpIcon color="warning" /> }
  ];
  
  const periodTypes = [
    { value: 'week', label: 'Son 7 Gün' },
    { value: 'month', label: 'Son 30 Gün' },
    { value: 'quarter', label: 'Son 3 Ay' },
    { value: 'year', label: 'Son 12 Ay' }
  ];
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Raporlar
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Üretim, stok ve siparişlerle ilgili detaylı raporlar oluşturun ve görüntüleyin. Yapay zeka destekli analizlerle işinizi daha iyi anlayın.
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        {/* Rapor Oluşturma */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Yeni Rapor Oluştur
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Rapor Türü
              </Typography>
              
              <Grid container spacing={2}>
                {reportTypes.map(type => (
                  <Grid item xs={6} key={type.value}>
                    <Paper
                      elevation={reportType === type.value ? 3 : 1}
                      onClick={() => setReportType(type.value)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: reportType === type.value ? '2px solid' : '1px solid',
                        borderColor: reportType === type.value ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Box sx={{ mr: 2 }}>
                        {type.icon}
                      </Box>
                      <Typography variant="body1">
                        {type.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Zaman Aralığı</InputLabel>
                <Select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  label="Zaman Aralığı"
                >
                  {periodTypes.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Rapor Oluştur'}
            </Button>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Yapay zeka desteği ile kapsamlı bir rapor oluşturulacaktır. Bu işlem birkaç saniye sürebilir.
            </Alert>
          </Paper>
        </Grid>
        
        {/* Son Raporlar */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Son Oluşturulan Raporlar
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" my={5}>
              <CircularProgress />
            </Box>
          ) : recentReports.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Henüz oluşturulmuş rapor bulunmamaktadır.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {recentReports.map(report => (
                <Grid item xs={12} key={report.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        {reportTypes.find(t => t.value === report.type)?.icon}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {report.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Oluşturma: {new Date(report.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dönem: {periodTypes.find(p => p.value === report.period)?.label || report.period}
                      </Typography>
                    </CardContent>
                    <Divider />
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => router.push(`/reports/${report.id}`)}
                      >
                        Raporu Görüntüle
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
