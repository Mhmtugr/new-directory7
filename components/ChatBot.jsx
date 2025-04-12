import { useState, useContext, useRef, useEffect } from 'react';
import { 
  Box, 
  Fab, 
  Paper, 
  Typography, 
  TextField, 
  IconButton, 
  Avatar, 
  Slide, 
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { 
  Chat as ChatIcon, 
  Send as SendIcon, 
  Close as CloseIcon,
  RestartAlt as ClearIcon
} from '@mui/icons-material';
import { AIContext } from '../context/AIContext';

const ChatBot = ({ open, onToggle }) => {
  const [message, setMessage] = useState('');
  const { loading, chatHistory, askAI, clearChatHistory } = useContext(AIContext);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && open) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, open]);
  
  const handleSend = async (e) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      try {
        await askAI(message.trim());
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const renderChatMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    
    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        {!isUser && (
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main',
              mr: 1,
              width: 32,
              height: 32
            }}
          >
            AI
          </Avatar>
        )}
        
        <Box
          sx={{
            maxWidth: '80%',
            p: 2,
            borderRadius: 2,
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
          }}
        >
          <Typography variant="body1">{msg.content}</Typography>
          
          {msg.data && (
            <Box mt={1}>
              {Object.entries(msg.data).map(([key, value]) => (
                <Chip 
                  key={key}
                  label={`${key}: ${value}`} 
                  size="small" 
                  sx={{ mr: 1, mt: 1 }} 
                />
              ))}
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </Typography>
        </Box>
        
        {isUser && (
          <Avatar 
            sx={{ 
              ml: 1,
              width: 32,
              height: 32
            }}
          >
            U
          </Avatar>
        )}
      </Box>
    );
  };
  
  return (
    <>
      {/* Chatbot toggle button */}
      <Fab
        color="primary"
        aria-label="chat"
        onClick={onToggle}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </Fab>
      
      {/* Chat panel */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            width: { xs: '90%', sm: 400 },
            height: 500,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="h6">METS Yapay Zeka Asistanı</Typography>
            <IconButton size="small" color="inherit" onClick={clearChatHistory}>
              <ClearIcon />
            </IconButton>
          </Box>
          
          {/* Messages area */}
          <Box
            sx={{
              p: 2,
              flexGrow: 1,
              overflow: 'auto',
              bgcolor: '#f5f5f5'
            }}
          >
            {chatHistory.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  opacity: 0.7
                }}
              >
                <ChatIcon fontSize="large" color="primary" />
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Merhaba! Size nasıl yardımcı olabilirim?
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Sipariş durumu, üretim planı, stok bilgisi gibi konularda sorular sorabilirsiniz.
                </Typography>
              </Box>
            ) : (
              chatHistory.map(renderChatMessage)
            )}
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Input area */}
          <Box
            component="form"
            onSubmit={handleSend}
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex'
            }}
          >
            <TextField
              fullWidth
              placeholder="Mesajınızı yazın..."
              variant="outlined"
              size="small"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              sx={{ mr: 1 }}
            />
            <IconButton 
              color="primary" 
              type="submit" 
              disabled={loading || !message.trim()}
            >
              {loading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </Box>
        </Paper>
      </Slide>
    </>
  );
};

export default ChatBot;
