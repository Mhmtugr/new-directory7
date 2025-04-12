import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Tooltip, 
  Grid,
  Chip
} from '@mui/material';

/**
 * Basit Gantt Chart bileşeni
 * @param {Array} tasks - Üretim görevleri listesi
 * @param {Array} departments - Departman listesi
 */
const DashboardGanttChart = ({ tasks = [], departments = [] }) => {
  const [chartData, setChartData] = useState({});
  
  // Timeline aralığı (15 günlük dönem)
  const today = new Date();
  const firstDate = new Date();
  firstDate.setDate(today.getDate() - 2); // 2 gün öncesi
  
  const lastDate = new Date();
  lastDate.setDate(today.getDate() + 13); // 13 gün sonrası (toplam 15 gün)
  
  // Tarih aralığını gün sayısına çevir
  const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Tarih dizisi oluştur
  const dateRange = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(firstDate);
    date.setDate(date.getDate() + i);
    return date;
  });
  
  // Görevleri departman bazında grupla
  useEffect(() => {
    if (!tasks.length || !departments.length) return;
    
    const groupedTasks = departments.reduce((acc, dept) => {
      acc[dept] = tasks.filter(task => task.department === dept);
      return acc;
    }, {});
    
    setChartData(groupedTasks);
  }, [tasks, departments]);
  
  // Tarih formatlayıcı
  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };
  
  // Görevin başlangıç ve bitiş pozisyonlarını hesapla
  const calculateTaskPosition = (startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const startDiff = Math.max(0, Math.ceil((start - firstDate) / (1000 * 60 * 60 * 24)));
    const endDiff = Math.min(totalDays - 1, Math.ceil((end - firstDate) / (1000 * 60 * 60 * 24)));
    
    return {
      left: `${(startDiff / totalDays) * 100}%`,
      width: `${((endDiff - startDiff + 1) / totalDays) * 100}%`,
    };
  };
  
  // Görev durumuna göre arkaplan rengi
  const getTaskColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success.main';
      case 'IN_PROGRESS': return 'primary.main';
      case 'SCHEDULED': return 'info.light';
      case 'DELAYED': return 'error.main';
      default: return 'grey.400';
    }
  };
  
  // Bugünün pozisyonunu hesapla
  const todayPosition = `${((today - firstDate) / (lastDate - firstDate)) * 100}%`;
  
  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
      {/* Üst tarih göstergeleri */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', pb: 1, position: 'relative' }}>
        <Box sx={{ width: '15%' }}></Box>
        <Box sx={{ width: '85%', display: 'flex' }}>
          {dateRange.map((date, index) => (
            <Box 
              key={index} 
              sx={{ 
                flex: 1, 
                textAlign: 'center', 
                bgcolor: date.getDay() === 0 || date.getDay() === 6 ? 'grey.100' : 'transparent',
                borderRight: index < dateRange.length - 1 ? '1px dashed' : 'none',
                borderColor: 'divider',
                py: 1,
                fontWeight: date.toDateString() === today.toDateString() ? 'bold' : 'normal',
                color: date.toDateString() === today.toDateString() ? 'primary.main' : 'text.primary',
              }}
            >
              {formatDate(date)}
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Departman ve görev sıraları */}
      {departments.map((dept, deptIndex) => (
        <Box key={dept} sx={{ 
          display: 'flex', 
          borderBottom: deptIndex < departments.length - 1 ? '1px solid' : 'none', 
          borderColor: 'divider',
          py: 1
        }}>
          {/* Departman ismi */}
          <Box sx={{ width: '15%', pr: 2, fontWeight: 'bold' }}>
            {dept}
          </Box>
          
          {/* Görevler */}
          <Box sx={{ width: '85%', position: 'relative', height: '40px' }}>
            {/* Hafta sonu gri alanları */}
            {dateRange.map((date, index) => (
              <Box 
                key={index} 
                sx={{ 
                  position: 'absolute',
                  left: `${(index / totalDays) * 100}%`,
                  width: `${(1 / totalDays) * 100}%`,
                  height: '100%',
                  bgcolor: date.getDay() === 0 || date.getDay() === 6 ? 'grey.100' : 'transparent',
                  borderRight: '1px dashed',
                  borderColor: 'divider',
                }}
              />
            ))}
            
            {/* Bugün çizgisi */}
            <Box sx={{ 
              position: 'absolute',
              left: todayPosition,
              width: '2px',
              height: '100%',
              bgcolor: 'primary.main',
              zIndex: 2
            }} />
            
            {/* Görevler */}
            {chartData[dept]?.map((task) => {
              const { left, width } = calculateTaskPosition(task.startDate, task.dueDate);
              
              return (
                <Tooltip 
                  key={task.id}
                  title={
                    <Box>
                      <Typography variant="subtitle2">{task.name}</Typography>
                      <Typography variant="body2">Sipariş: {task.order?.orderNumber}</Typography>
                      <Typography variant="body2">
                        {new Date(task.startDate).toLocaleDateString()} - {new Date(task.dueDate).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        size="small"
                        label={task.status}
                        sx={{ mt: 1, bgcolor: 'white' }}
                        color={
                          task.status === 'COMPLETED' ? 'success' :
                          task.status === 'DELAYED' ? 'error' :
                          task.status === 'IN_PROGRESS' ? 'primary' : 
                          'default'
                        }
                      />
                    </Box>
                  }
                  arrow
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left,
                      width,
                      height: '70%',
                      top: '15%',
                      bgcolor: getTaskColor(task.status),
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.9,
                        height: '80%',
                        top: '10%',
                      }
                    }}
                  >
                    {width.replace('%', '') > 8 ? task.name : ''}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
      
      {/* Alt bilgi */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', mr: 1 }} />
          <Typography variant="caption">Devam Eden</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 1 }} />
          <Typography variant="caption">Tamamlanmış</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'info.light', mr: 1 }} />
          <Typography variant="caption">Planlanmış</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 1 }} />
          <Typography variant="caption">Gecikmiş</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default DashboardGanttChart;
