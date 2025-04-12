import { useState } from 'react';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * Malzeme için tahmin grafiği bileşeni
 * @param {Object} material - Malzeme bilgileri
 * @param {Object} predictionData - Tahmin verileri
 */
const MaterialPredictionChart = ({ material, predictionData }) => {
  const [chartType, setChartType] = useState('lstm');
  
  if (!material || !predictionData) {
    return null;
  }
  
  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };
  
  // Tahmin verilerini hazırla
  const labels = Array.from({ length: 30 }, (_, i) => `Gün ${i + 1}`);
  const currentStock = [material.quantity, ...Array(29).fill(null)]; // Sadece ilk gün için mevcut stok
  
  // Farklı tahmin modelleri için veri setleri
  const simpleForecast = Array(30).fill(predictionData.simpleForecast || 0);
  const seasonalForecast = predictionData.seasonalForecast || Array(30).fill(0);
  const lstmForecast = predictionData.lstmForecast || Array(30).fill(0);
  
  // Seçilen tahmin modelini kullan
  let forecastData;
  let forecastColor;
  let forecastLabel;
  
  switch (chartType) {
    case 'simple':
      forecastData = simpleForecast;
      forecastColor = 'rgba(54, 162, 235, 0.7)';
      forecastLabel = 'Basit Tahmin';
      break;
    case 'seasonal':
      forecastData = seasonalForecast;
      forecastColor = 'rgba(75, 192, 192, 0.7)';
      forecastLabel = 'Mevsimsel Tahmin';
      break;
    case 'lstm':
    default:
      forecastData = lstmForecast;
      forecastColor = 'rgba(153, 102, 255, 0.7)';
      forecastLabel = 'Derin Öğrenme Tahmini';
      break;
  }
  
  // Grafik verisi
  const chartData = {
    labels,
    datasets: [
      {
        label: forecastLabel,
        data: forecastData,
        borderColor: forecastColor,
        backgroundColor: forecastColor.replace('0.7', '0.2'),
        fill: true,
        tension: 0.4
      },
      {
        label: 'Mevcut Stok',
        data: currentStock,
        borderColor: 'rgba(255, 99, 132, 0.7)',
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: false,
        showLine: false
      },
      {
        label: 'Minimum Stok',
        data: Array(30).fill(material.minQuantity),
        borderColor: 'rgba(255, 159, 64, 0.7)',
        backgroundColor: 'rgba(255, 159, 64, 0.7)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };
  
  // Grafik seçenekleri
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          afterLabel: function(context) {
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            
            // Mevcut stok için tükenme tahmini ekle
            if (datasetIndex === 0) {
              const currentStockValue = material.quantity;
              const dailyUsage = forecastData[dataIndex];
              
              if (dailyUsage > 0) {
                const daysLeft = Math.floor(currentStockValue / dailyUsage);
                return `\nBu kullanım hızında stok ${daysLeft} gün içinde tükenecek.`;
              }
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Günlük Kullanım (adet)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Tahmin Periyodu (30 gün)'
        }
      }
    }
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">
          "{material.name}" Malzemesi için 30 Günlük Kullanım Tahmini
        </Typography>
        
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
        >
          <ToggleButton value="simple">Basit</ToggleButton>
          <ToggleButton value="seasonal">Mevsimsel</ToggleButton>
          <ToggleButton value="lstm">Derin Öğrenme</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box height={400}>
        <Chart type="line" data={chartData} options={chartOptions} />
      </Box>
      
      <Box mt={2} display="flex" flexWrap="wrap" gap={2}>
        <Paper sx={{ p: 1, minWidth: 200, bgcolor: 'info.light', color: 'white' }}>
          <Typography variant="caption">Ortalama Günlük Kullanım</Typography>
          <Typography variant="h6">{predictionData.recommendation?.avgDailyDemand?.toFixed(2) || 0} adet/gün</Typography>
        </Paper>
        
        <Paper sx={{ p: 1, minWidth: 200, bgcolor: 'warning.light', color: 'white' }}>
          <Typography variant="caption">Maksimum Günlük Kullanım</Typography>
          <Typography variant="h6">{predictionData.recommendation?.maxDailyDemand?.toFixed(2) || 0} adet/gün</Typography>
        </Paper>
        
        <Paper sx={{ p: 1, minWidth: 200, bgcolor: 'success.light', color: 'white' }}>
          <Typography variant="caption">Önerilen Güvenlik Stoku</Typography>
          <Typography variant="h6">{predictionData.recommendation?.recommendedSafetyStock || 0} adet</Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default MaterialPredictionChart;
