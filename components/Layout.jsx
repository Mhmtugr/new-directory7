import { useState, useContext } from 'react';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Menu, 
  MenuItem, 
  Container, 
  Avatar, 
  Tooltip,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import { UserContext } from '../context/UserContext';
import { AIContext } from '../context/AIContext';
import Sidebar from './Sidebar';
import NotificationSystem from './NotificationSystem';
import ChatBot from './ChatBot';
import LoadingOverlay from './LoadingOverlay';

export default function Layout({ children }) {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, loading: userLoading } = useContext(UserContext);
  const { isChatOpen, toggleChat } = useContext(AIContext);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (userLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography
              variant="h6"
              noWrap
              component={Link}
              href="/"
              sx={{
                mr: 2,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.2rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              METS-R2
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Bildirim sistemi */}
              <NotificationSystem />
              
              {/* Kullanıcı menüsü */}
              <Tooltip title="Kullanıcı seçenekleri">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 2 }}>
                  <Avatar alt={user?.name || "User"} src="/static/images/avatar.jpg" />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {user?.name}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => {
                  router.push('/profile');
                  handleCloseUserMenu();
                }}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profil</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                  router.push('/settings');
                  handleCloseUserMenu();
                }}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Ayarlar</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Çıkış Yap</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${240}px)` },
          marginTop: '64px', // AppBar yüksekliği
          minHeight: 'calc(100vh - 64px)', // En az ekran yüksekliği
          bgcolor: (theme) => theme.palette.grey[50] // Arka plan rengi
        }}
      >
        {children}
        {user && (
          <>
            <ChatBot open={isChatOpen} onToggle={toggleChat} />
            <LoadingOverlay />
          </>
        )}
      </Box>
    </Box>
  );
}
