import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button, 
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  WarningAmber as WarningIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  NotificationImportant as NotificationIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';

/**
 * Üretim sorunları tahmin paneli
 * Üretimde yaşanabilecek olası sorunları önceden tespit eder
 */
const IssuePredictionPanel = () => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();

  // İlk yüklemede ve periyodik olarak tahmin al
  useEffect(() => {
    fetchPredictions();
    
    // Her 1 saatte bir otomatik yenile
    const interval = setInterval(() => {
      fetchPredictions(false); // Sessiz yenileme
    }, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  // Tahminleri getir
  const fetchPredictions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/production/analytics/issue-prediction');
      setPrediction(response.data.prediction);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Prediction fetch error:', err);
      setError('Tahmin yüklenirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Sorun metni içinden hızlı özet bilgisi çıkar
  const extractQuickSummary = (issuesText) => {
    const lines = issuesText.split('\n');
    
    // Sorun sayısını ve riski belirle
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    
    lines.forEach(line => {
      const lowercaseLine = line.toLowerCase();
      
      if (lowercaseLine.includes('yüksek risk') || lowercaseLine.includes('high risk')) {
        highRiskCount++;
      } else if (lowercaseLine.includes('orta risk') || lowercaseLine.includes('medium risk')) {
        mediumRiskCount++;
      } else if (lowercaseLine.includes('düşük risk') || lowercaseLine.includes('low risk')) {
        lowRiskCount++;
      }
    });
    
    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalIssues: highRiskCount + mediumRiskCount + lowRiskCount
    };
  };

  // Ana sorun başlıklarını ayıkla
  const extractIssues = (issuesText) => {
    const issues = [];
    const lines = issuesText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Sorun başlığına benzeyen satirlari bul
      if (trimmed.match(/^((\d+\.)|\-|\*)\s+.+/)) {
        const title = trimmed.replace(/^((\d+\.)|\-|\*)\s+/, '');
        
        // Risk seviyesini belirle
        let severity = 'MEDIUM';
        if (
          line.toLowerCase().includes('yüksek risk') || 
          line.toLowerCase().includes('kritik') ||
          line.toLowerCase().includes('high risk')
        ) {
          severity = 'HIGH';
        } else if (
          line.toLowerCase().includes('düşük risk') || 
          line.toLowerCase().includes('minor') ||
          line.toLowerCase().includes('low risk')
        ) {
          severity = 'LOW';
        }
        
        issues.push({
          title,
          severity
        });
      }
    }
    
    return issues;
  };

  // Görüntüleme renkleri
  const severityColors = {
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'info'
  };

  const severityIcons = {
    HIGH: <ErrorIcon color="error" />,
    MEDIUM: <WarningIcon color="warning" />,
    LOW: <InfoIcon color="info" />
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Üretim Sorun Tahmini
        </Typography>
        
        <Box>
          <Button
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            size="small"
            onClick={() => fetchPredictions()}
            disabled={loading}
          >
            Yenile
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && !prediction && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && !prediction && !error && (
        <Alert severity="info">
          Henüz üretim sorunu tahmini yapılmamış. Tahmin yapmak için "Yenile" butonuna tıklayın.
        </Alert>
      )}
      
      {prediction && (
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Hızlı özet */}
          {(() => {
            const summary = extractQuickSummary(prediction.issues);
            return (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1">
                      Tespit Edilen Sorunlar: {summary.totalIssues || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Son güncelleme: {lastUpdated?.toLocaleString() || 'Bilinmiyor'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {summary.highRiskCount > 0 && (
                      <Chip 
                        label={`${summary.highRiskCount} Yüksek Risk`} 
                        color="error" 
                        size="small"
                        icon={<ErrorIcon />}
                      />
                    )}
                    
                    {summary.mediumRiskCount > 0 && (
                      <Chip 
                        label={`${summary.mediumRiskCount} Orta Risk`} 
                        color="warning" 
                        size="small"
                        icon={<WarningIcon />}
                      />
                    )}
                    
                    {summary.lowRiskCount > 0 && (
                      <Chip 
                        label={`${summary.lowRiskCount} Düşük Risk`} 
                        color="info" 
                        size="small"
                        icon={<InfoIcon />}
                      />
                    )}
                    
                    {summary.totalIssues === 0 && (
                      <Chip 
                        label="Sorun Yok" 
                        color="success" 
                        size="small"
                        icon={<CheckIcon />}
                      />
                    )}
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
              </>
            );
          })()}
          
          {/* Sorun Listesi */}
          <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
            <List dense>
              {extractIssues(prediction.issues).map((issue, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      {severityIcons[issue.severity]}
                      <Typography variant="body2">{issue.title}</Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Chip 
                      size="small" 
                      label={issue.severity === 'HIGH' ? 'Yüksek Risk' : 
                             issue.severity === 'MEDIUM' ? 'Orta Risk' : 'Düşük Risk'} 
                      color={severityColors[issue.severity]}
                      variant="outlined"
                    />
                    {issue.severity === 'HIGH' && (
                      <Button 
                        size="small" 
                        variant="text" 
                        color="error" 
                        startIcon={<NotificationIcon />}
                        sx={{ ml: 'auto' }}
                        onClick={() => router.push('/production/issues')}
                      >
                        Hemen İncele
                      </Button>
                    )}
                  </CardActions>
                </Card>
              ))}
            </List>
          </Box>
          
          <Button 
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            onClick={() => router.push('/production/issues')}
            sx={{ alignSelf: 'flex-end', mt: 'auto' }}
          >
            Detaylı İncele
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default IssuePredictionPanel;
