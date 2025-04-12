import { useState, useEffect, useRef } from 'react';
import { 
  Fab, 
  Paper, 
  TextField, 
  IconButton, 
  Typography, 
  Box,
  Zoom,
  Slide,
  Avatar,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  MenuOpen as MenuOpenIcon,
  MoreVert as MoreVertIcon,
  AutoAwesome as AutoAwesomeIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { useAI } from '../context/AIContext';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';

const GlobalChatbot = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { askAI } = useAI();
  const router = useRouter();
  
  // Önceki konuşmaları saklamak için local storage kullan
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState(null);
  
  // Mevcut sayfadaki sipariş numarasını tespit et
  useEffect(() => {
    // URL'den sipariş ID'sini kontrol et
    const { pathname, query: urlQuery } = router;
    
    if (pathname.startsWith('/orders/') && pathname.length > 8) {
      const orderId = pathname.split('/')[2];
      
      // Sipariş numarasını getir
      fetchOrderNumber(orderId);
    } else if (urlQuery.orderNumber) {
      // URL sorgusundan sipariş numarası kontrolü
      setCurrentOrderNumber(urlQuery.orderNumber);
    } else {
      setCurrentOrderNumber(null);
    }
    
    // Önceki konuşmaları yükle
    loadConversations();
  }, [router.pathname, router.query]);
  
  // Konuşma geçmişini yükle
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('mets_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error('Chat history loading error:', err);
    }
  };
  
  // Konuşma geçmişini kaydet
  const saveConversations = (newHistory) => {
    try {
      // Yeni konuşma oluştur
      if (newHistory.length >= 2) { // En az bir soru-cevap
        const newConvo = {
          id: `conv_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: newHistory[0].content.substring(0, 30) + '...',
          messages: [...newHistory]
        };
        
        // En fazla 10 konuşma sakla
        const updatedConvos = [newConvo, ...conversations.slice(0, 9)];
        setConversations(updatedConvos);
        localStorage.setItem('mets_chat_history', JSON.stringify(updatedConvos));
      }
    } catch (err) {
      console.error('Chat history save error:', err);
    }
  };
  
  // Sipariş numarasını getir
  const fetchOrderNumber = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/basic`);
      if (response.ok) {
        const data = await response.json();
        setCurrentOrderNumber(data.orderNumber);
      }
    } catch (err) {
      console.error('Error fetching order number:', err);
    }
  };
  
  // Sohbeti kapat
  const handleClose = () => {
    if (chatHistory.length > 0) {
      saveConversations(chatHistory);
    }
    setOpen(false);
    setShowHistory(false);
    setChatHistory([]);
  };
  
  // Sorgu gönder
  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!query.trim()) return;
    
    // Kullanıcı mesajını ekle
    const userMessage = { role: 'user', content: query };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    
    try {
      // AI yanıtı al
      const result = await askAI(query, chatHistory);
      
      if (result && result.response) {
        // AI yanıtını ekle
        const aiMessage = { role: 'assistant', content: result.response, data: result.data };
        setChatHistory(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Hata mesajı ekle
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  // Konuşma geçmişini yükle
  const loadConversation = (convo) => {
    setChatHistory(convo.messages);
    setShowHistory(false);
    setAnchorEl(null);
  };
  
  // Hızlı sorgular için menüyü aç
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Menüyü kapat
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Hızlı sorgu seç
  const handleQuickQuery = (quickQuery) => {
    setQuery(quickQuery);
    handleMenuClose();
    
    // Otomatik gönder
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };
  
  // Otomatik kaydırma
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  // Mevcut sipariş için hızlı sorgular
  const orderQueries = currentOrderNumber ? [
    `${currentOrderNumber} siparişinin durumu nedir?`,
    `${currentOrderNumber} siparişinin üretim planını göster`,
    `${currentOrderNumber} için eksik malzeme var mı?`,
    `${currentOrderNumber} siparişi ne zaman teslim edilecek?`
  ] : [];
  
  // Genel hızlı sorgular
  const quickQueries = [
    'Bugün tamamlanması gereken işler neler?',
    'Bu hafta geciken siparişler hangileri?',
    'Üretimde darboğaz yaşanan departmanlar',
    'Stok seviyesi kritik olan malzemeler',
    'Bu ay teslim edilmesi gereken siparişlerin durumu',
    ...orderQueries
  ];

  return (
    <>
      {/* Chatbot açma butonu */}
      <Zoom in={!open} style={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Fab 
          color="primary" 
          onClick={() => setOpen(true)} 
          aria-label="chat"
        >
          <Badge 
            color="error" 
            variant="dot" 
            invisible={!currentOrderNumber}
          >
            <ChatIcon />
          </Badge>
        </Fab>
      </Zoom>
      
      {/* Chatbot paneli */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper 
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 360,
            height: 500,
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Chatbot başlık */}
          <Box 
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              px: 2,
              py: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box display="flex" alignItems="center">
              <AutoAwesomeIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                METS Yapay Zeka Asistanı
              </Typography>
            </Box>
            
            <Box>
              <Tooltip title="Sohbet Geçmişi">
                <IconButton 
                  size="small" 
                  color="inherit"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <IconButton 
                size="small" 
                color="inherit" 
                onClick={handleClose}
                aria-label="close"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          {/* Konuşma geçmişi görünümü */}
          {showHistory ? (
            <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Önceki Konuşmalar
              </Typography>
              
              {conversations.length === 0 ? (
                <Box textAlign="center" mt={3}>
                  <Typography color="text.secondary" variant="body2">
                    Kayıtlı konuşma bulunamadı
                  </Typography>
                </Box>
              ) : (
                <List>
                  {conversations.map((convo) => (
                    <ListItem 
                      key={convo.id} 
                      button
                      onClick={() => loadConversation(convo)}
                      divider
                      sx={{ px: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <ChatIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={convo.messages[0].content.substring(0, 30) + '...'}
                        secondary={new Date(convo.timestamp).toLocaleString()}
                        primaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          ) : (
            // Sohbet görünümü
            <Box 
              sx={{ 
                flexGrow: 1, 
                overflow: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Karşılama mesajı */}
              {chatHistory.length === 0 && (
                <Box mb={2}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'primary.light', 
                      color: 'white',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2" paragraph>
                      Merhaba! Ben METS asistanınızım. Size nasıl yardımcı olabilirim?
                    </Typography>
                    
                    <Box>
                      <Chip 
                        icon={<DescriptionIcon />}
                        label="Siparişler hakkında bilgi"
                        onClick={() => setQuery('Bekleyen siparişler hakkında bilgi verir misin?')}
                        sx={{ mr: 1, mb: 1, bgcolor: 'rgba(255,255,255,0.15)' }}
                        clickable
                      />
                      
                      <Chip 
                        icon={<SearchIcon />}
                        label="Stok kontrolü"
                        onClick={() => setQuery('Hangi malzemelerde stok eksikliği var?')}
                        sx={{ mr: 1, mb: 1, bgcolor: 'rgba(255,255,255,0.15)' }}
                        clickable
                      />
                      
                      {currentOrderNumber && (
                        <Chip 
                          icon={<SearchIcon />}
                          label={`${currentOrderNumber} sorgusu`}
                          onClick={() => setQuery(`${currentOrderNumber} siparişi hakkında bilgi ver`)}
                          sx={{ mr: 1, mb: 1, bgcolor: 'rgba(255,255,255,0.15)' }}
                          clickable
                        />
                      )}
                    </Box>
                  </Paper>
                </Box>
              )}
              
              {/* Sohbet mesajları */}
              {chatHistory.map((msg, i) => (
                <Box
                  key={i}
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Paper
                    elevation={msg.role === 'user' ? 1 : 0}
                    sx={{
                      p: 1.5,
                      maxWidth: '80%',
                      borderRadius: 2,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      border: msg.error ? '1px solid red' : 'none'
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <Box>
                        <Box sx={{ '& p': { m: 0, mb: 1 } }}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </Box>
                        
                        {/* Veri kaynağı göstergeleri */}
                        {msg.data && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                            {msg.data.hasOrderData && (
                              <Chip size="small" label="Sipariş verisi" color="info" variant="outlined" />
                            )}
                            {msg.data.hasStockData && (
                              <Chip size="small" label="Stok verisi" color="success" variant="outlined" />
                            )}
                            {msg.data.hasProductionData && (
                              <Chip size="small" label="Üretim verisi" color="warning" variant="outlined" />
                            )}
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2">{msg.content}</Typography>
                    )}
                  </Paper>
                </Box>
              ))}
              
              {/* Yükleniyor göstergesi */}
              {loading && (
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'flex-start'
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Yanıt hazırlanıyor...
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {/* Otomatik kaydırma için referans */}
              <div ref={chatEndRef} />
            </Box>
          )}
          
          {/* Giriş alanı */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  color="primary"
                >
                  <MenuOpenIcon />
                </IconButton>
                
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Bir soru sorun veya komut yazın..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading || showHistory}
                  autoComplete="off"
                  sx={{ mx: 1 }}
                />
                
                <IconButton 
                  size="small" 
                  color="primary" 
                  type="submit"
                  disabled={!query.trim() || loading || showHistory}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </form>
          </Box>
        </Paper>
      </Slide>
      
      {/* Hızlı sorgular menüsü */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 300, maxHeight: 400 }
        }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">
            Hızlı Sorgular
          </Typography>
        </MenuItem>
        
        <Divider />
        
        {quickQueries.map((query, i) => (
          <MenuItem 
            key={i}
            onClick={() => handleQuickQuery(query)}
            sx={{ 
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }}
          >
            {query}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default GlobalChatbot;
