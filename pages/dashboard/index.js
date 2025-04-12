import IssuePredictionPanel from '../../components/dashboard/IssuePredictionPanel';

export default function Dashboard() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Yönetim Paneli
        </Typography>
        
        <Grid container spacing={3}>
          {/* Mevcut Dashboard bileşenler... */}
          
          {/* Sorun Tahmini Paneli */}
          <Grid item xs={12} md={6}>
            <IssuePredictionPanel />
          </Grid>
          
        </Grid>
      </Box>
    </Container>
  );
}