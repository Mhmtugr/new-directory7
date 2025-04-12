import { useState, useEffect, useContext } from 'react';
import { 
  Badge, 
  IconButton, 
  Menu, 
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Typography,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  FormControl,
  InputLabel,
  Select,
  TextField,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { UserContext } from '../context/UserContext';

/**
 * Bildirim sistemi bileşeni
 * Tüm ekranlarda header'da görünen bildirim ikonu ve bildirim listesi
 */
const NotificationSystem = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseType, setResponseType] = useState('RESOLVED');
  const [responseMessage, setResponseMessage] = useState('');
  const [pollingTimer, setPollingTimer] = useState(null);
  
  const router = useRouter();
  const { user } = useContext(UserContext);
  
  // Bildirimleri yükle
  const loadNotifications = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications');
      const data = res.data || [];
      
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // İlk yüklemede ve belirli aralıklarla bildirimleri yenile
  useEffect(() => {
    loadNotifications();
    
    // 30 saniyede bir bildirimleri kontrol et
    const timer = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    setPollingTimer(timer);
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);
  
  // Kullanıcı değiştiğinde bildirimleri yenile
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);
  
  // Bildirim menüsü açma/kapama
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
    // Menü açıldığında bildirimleri okundu olarak işaretle
    if (unreadCount > 0) {
      markNotificationsAsRead();
    }
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  // Bildirimleri okundu olarak işaretle
  const markNotificationsAsRead = async () => {
    try {
      await axios.post('/api/notifications/mark-read');
      // UI'da bildirimleri okundu olarak güncelle
      const updatedNotifications = notifications.map(n => ({
        ...n,
        isRead: true
      }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };
  
  // Bildirime yanıt verme
  const handleRespondClick = (notification) => {
    setSelectedNotification(notification);
    setResponseType('RESOLVED'); // Varsayılan yanıt türü
    setResponseMessage('');
    setRespondDialogOpen(true);
  };
  
  // Yanıt gönderme
  const handleSubmitResponse = async () => {
    if (!selectedNotification) return;
    
    try {
      await axios.post(`/api/notifications/${selectedNotification.id}/respond`, {
        responseType,
        responseMessage,
        departmentId: user?.department
      });
      
      setRespondDialogOpen(false);
      loadNotifications(); // Bildirimleri yenile
    } catch (err) {
      console.error('Error responding to notification:', err);
    }
  };
  
  // Bildirime tıklandığında ilgili sayfaya yönlendir
  const handleNotificationClick = (notification) => {
    // Eğer yanıt gerektiren bir bildirimse ve yanıtlanmamışsa yanıt diyalogunu aç
    if (notification.requiresResponse && !notification.responded) {
      handleRespondClick(notification);
      return;
    }
    
    // İlgili varlığa yönlendir (sipariş, görev, malzeme vb.)
    if (notification.entityType && notification.entityId) {
      let url;
      switch (notification.entityType) {
        case 'order':
          url = `/orders/${notification.entityId}`;
          break;
        case 'task':
          url = `/production/tasks/${notification.entityId}`;
          break;
        case 'material':
          url = `/inventory/materials/${notification.entityId}`;
          break;
        default:
          url = null;
      }
      
      if (url) {
        router.push(url);
        handleCloseMenu();
      }
    }
  };
  
  // Bildirim tipi ikonları
  const getNotificationIcon = (notification) => {
    const { type, severity } = notification;
    
    if (severity === 'HIGH') {
      return <ErrorIcon color="error" />;
    } else if (severity === 'MEDIUM') {
      return <WarningIcon color="warning" />;
    }
    
    // Tipe göre ikonlar
    switch (type) {
      case 'DEADLINE_WARNING':
        return <AccessTimeIcon color="warning" />;
      case 'STOCK_WARNING':
        return <WarningIcon color="warning" />;
      case 'PRODUCTION_DELAY':
        return <AccessTimeIcon color="error" />;
      case 'TASK_COMPLETED':
        return <CheckCircleIcon color="success" />;
      case 'NOTE':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };
  
  // Bildirim tipi rengini belirle
  const getNotificationColor = (notification) => {
    const { severity } = notification;
    
    if (severity === 'HIGH') return 'error.main';
    if (severity === 'MEDIUM') return 'warning.main';
    return 'info.main';
  };
  
  return (
    <>
      {/* Bildirim ikonu */}
      <IconButton 
        color="inherit" 
        onClick={handleOpenMenu}
        aria-label="notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      {/* Bildirim menüsü */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: { width: 400, maxHeight: 500, overflow: 'auto' }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
          <Typography variant="subtitle1">
            Bildirimler
          </Typography>
          <Button 
            size="small" 
            onClick={loadNotifications}
            disabled={loading}
          >
            Yenile
          </Button>
        </Box>
        
        <Divider />
        
        {loading && notifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Bildiriminiz bulunmamaktadır
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{ 
                  bgcolor: notification.isRead ? 'inherit' : 'action.hover',
                  borderLeft: `4px solid ${getNotificationColor(notification)}`
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getNotificationColor(notification) }}>
                    {getNotificationIcon(notification)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}>
                        {notification.title}
                      </Typography>
                      
                      {notification.requiresResponse && !notification.responded && (
                        <Chip 
                          label="Yanıt Gerekli" 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notification.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                
                {notification.requiresResponse && !notification.responded && (
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={(e) => {
                      e.stopPropagation();
                      handleRespondClick(notification);
                    }}>
                      <ReplyIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
      
      {/* Yanıt Diyaloğu */}
      <Dialog 
        open={respondDialogOpen} 
        onClose={() => setRespondDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Bildirime Yanıt Ver
        </DialogTitle>
        
        <DialogContent>
          {selectedNotification && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {selectedNotification.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {selectedNotification.content}
                </Typography>
                
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    size="small"
                    label={selectedNotification.severity === 'HIGH' ? 'Yüksek Öncelik' : 
                          selectedNotification.severity === 'MEDIUM' ? 'Orta Öncelik' : 'Düşük Öncelik'}
                    color={selectedNotification.severity === 'HIGH' ? 'error' : 
                          selectedNotification.severity === 'MEDIUM' ? 'warning' : 'info'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Yanıt Türü</InputLabel>
                <Select
                  value={responseType}
                  onChange={(e) => setResponseType(e.target.value)}
                  label="Yanıt Türü"
                >
                  <MenuItem value="RESOLVED">Çözüldü</MenuItem>
                  <MenuItem value="IN_PROGRESS">Üzerinde Çalışılıyor</MenuItem>
                  <MenuItem value="SCHEDULED">2 Gün İçinde Çözülecek</MenuItem>
                  <MenuItem value="REASSIGNED">Başka Birime Yönlendir</MenuItem>
                  <MenuItem value="ESCALATED">Üst Yönetime İlet</MenuItem>
                  <MenuItem value="REJECTED">İlgili Değil / Reddedildi</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Açıklama"
                fullWidth
                multiline
                rows={4}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Yanıtınız için ek açıklama ekleyin..."
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)} color="inherit">
            İptal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitResponse}
            disabled={!responseMessage.trim() || !responseType}
          >
            Yanıtı Gönder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationSystem;
