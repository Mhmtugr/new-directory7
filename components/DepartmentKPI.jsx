import { 
  Box, 
  Paper, 
  Typography, 
  Grid,
  LinearProgress,
  Chip
} from '@mui/material';
import { 
  Check as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Departman KPI gösterge bileşeni
 */
const DepartmentKPI = ({ department, stats }) => {
  const departmentNames = {
    'ENGINEERING': 'Mühendislik',
    'ASSEMBLY': 'Montaj',
    'TESTING': 'Test',
    'PACKAGING': 'Paketleme'
  };
  
  const completed = stats.completed || 0;
  const delayed = stats.delayed || 0;
  const inProgress = stats.inProgress || 0;
  const scheduled = stats.scheduled || 0;
  const total = completed + delayed + inProgress + scheduled;
  
  // Pasta grafik verileri
  const chartData = {
    labels: ['Tamamlanmış', 'Gecikmiş', 'Devam Eden', 'Planlanmış'],
    datasets: [
      {
        data: [completed, delayed, inProgress, scheduled],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 10
        }
      }
    },
    cutout: '70%'
  };
  
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {departmentNames[department] || department}
      </Typography>
      
      <Grid container spacing={2}>
        {/* Sol taraf istatistikler */}
        <Grid item xs={12} sm={8}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper sx={{ p: 1.5, bgcolor: 'success.light', color: 'white' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{completed}</Typography>
                  <CheckIcon />
                </Box>
                <Typography variant="body2">Tamamlanan İşler</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 1.5, bgcolor: 'error.light', color: 'white' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{delayed}</Typography>
                  <ErrorIcon />
                </Box>
                <Typography variant="body2">Geciken İşler</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 1.5, bgcolor: 'primary.light', color: 'white' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{inProgress}</Typography>
                  <SpeedIcon />
                </Box>
                <Typography variant="body2">Devam Eden</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 1.5, bgcolor: 'warning.light', color: 'white' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{scheduled}</Typography>
                  <ScheduleIcon />
                </Box>
                <Typography variant="body2">Planlanmış</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Departman Verimliliği
            </Typography>
            <Box display="flex" alignItems="center">
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.efficiency || 0} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: stats.efficiency > 85 ? 'success.main' : 
                                       stats.efficiency > 70 ? 'warning.main' :
                                       'error.main',
                      borderRadius: 5,
                    }
                  }}
                />
              </Box>
              <Box minWidth={35}>
                <Typography variant="body2" color="text.secondary">{`${Math.round(stats.efficiency || 0)}%`}</Typography>
              </Box>
            </Box>
          </Box>
          
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              İş Durumu
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip size="small" label={`Görev Sayısı: ${total}`} />
              <Chip size="small" label={`Aktif Çalışan: ${stats.activeWorkers || 0}`} color="primary" />
              <Chip 
                size="small" 
                label={`Ort. Gecikme: ${stats.avgDelay || 0} gün`} 
                color={stats.avgDelay > 3 ? "error" : "warning"} 
              />
            </Box>
          </Box>
        </Grid>
        
        {/* Sağ taraf pasta grafik */}
        <Grid item xs={12} sm={4}>
          <Box sx={{ height: 200, position: 'relative' }}>
            <Doughnut data={chartData} options={chartOptions} />
            {total === 0 ? (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Veri yok
                </Typography>
              </Box>
            ) : (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h5">
                  {total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Toplam Görev
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DepartmentKPI;
