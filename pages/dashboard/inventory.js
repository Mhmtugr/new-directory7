      });
      setPredictionData(response.data);
    } catch (error) {
      console.error('Error fetching material prediction:', error);
    } finally {
      setPredictionLoading(false);
    }
  };
  
  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
    
    // Tahmin sekmesi seçildiyse ve bir malzeme seçiliyse tahmin yükle
    if (newValue === 2 && selectedMaterial) {
      fetchMaterialPrediction(selectedMaterial.id);
    }
  };
  
  const filteredMaterials = inventoryData?.materials?.filter(material => {
    const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
    const matchesSearch = searchTerm === '' || 
                         material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Stok Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stok seviyesi, sipariş tavsiyeleri ve malzeme analizi
          </Typography>
        </Box>
        <Box>
          <Button 
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={fetchInventoryData}
          >
            Yenile
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI Göstergeleri */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Toplam Malzeme
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography component="p" variant="h3">
                    {inventoryData?.totalItems || 0}
                  </Typography>
                  <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Stokta {inventoryData?.totalQuantity || 0} adet
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2">
                    {inventoryData?.categoryCount || 0} farklı kategori
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'error.light', color: 'white' }}>
                <Typography variant="h6" gutterBottom>
                  Kritik Stok
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography component="p" variant="h3">
                    {inventoryData?.lowStockItems || 0}
                  </Typography>
                  <WarningIcon sx={{ fontSize: 40 }} />
                </Box>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="body2">
                  Acil sipariş gereken
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    size="small" 
                    label={`${inventoryData?.outOfStockItems || 0} ürün tükendi`} 
                    color="error"
                    sx={{ bgcolor: 'white', fontWeight: 'bold' }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Bekleyen Siparişler
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography component="p" variant="h3">
                    {inventoryData?.pendingOrders || 0}
                  </Typography>
                  <ShoppingCartIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Satın alma siparişleri
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  {inventoryData?.deliveryToday > 0 && (
                    <Chip 
                      size="small" 
                      label={`Bugün ${inventoryData.deliveryToday} teslimat bekleniyor`} 
                      color="success" 
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Stok Değeri
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography component="p" variant="h3">
                    ₺{(inventoryData?.totalValue || 0).toLocaleString()}
                  </Typography>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
                <Typography color="text.secondary" variant="body2">
                  Toplam envanter değeri
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color={inventoryData?.valueTrend > 0 ? 'success.main' : 'error.main'}>
                    {inventoryData?.valueTrend > 0 ? '+' : ''}{inventoryData?.valueTrend || 0}% son aya göre
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Sekme paneli */}
          <Box sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={handleChangeTab}>
              <Tab label="Stok Durumu" icon={<InventoryIcon />} iconPosition="start" />
              <Tab label="Kategori Analizi" icon={<PieChartIcon />} iconPosition="start" />
              <Tab label="Tahmin ve Analiz" icon={<TimelineIcon />} iconPosition="start" />
            </Tabs>
          </Box>
          
          {/* Sekme içerikleri */}
          <Box sx={{ mb: 4 }}>
            {/* Stok Durumu */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <Typography variant="h6">
                          Malzeme Listesi
                        </Typography>
                        <Chip 
                          size="small"
                          label={`${filteredMaterials.length} malzeme`} 
                          color="primary"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      <Box display="flex">
                        <TextField
                          size="small"
                          placeholder="Malzeme ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          sx={{ mr: 2, width: 200 }}
                          InputProps={{
                            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                          }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Kategori</InputLabel>
                          <Select
                            value={categoryFilter}
                            label="Kategori"
                            onChange={(e) => setCategoryFilter(e.target.value)}
                          >
                            <MenuItem value="all">Tümü</MenuItem>
                            {categories.map(cat => (
                              <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Kod</TableCell>
                            <TableCell>Malzeme</TableCell>
                            <TableCell>Kategori</TableCell>
                            <TableCell align="right">Stok Miktarı</TableCell>
                            <TableCell align="right">Min. Seviye</TableCell>
                            <TableCell>Durum</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredMaterials.map((material) => {
                            const isLowStock = material.quantity <= material.minQuantity;
                            const isOutOfStock = material.quantity === 0;
                            
                            return (
                              <TableRow 
                                key={material.id}
                                hover
                                onClick={() => handleMaterialSelect(material)}
                                sx={{ 
                                  cursor: 'pointer',
                                  bgcolor: isOutOfStock ? 'error.lighter' : isLowStock ? 'warning.lighter' : 'inherit'
                                }}
                              >
                                <TableCell>{material.code}</TableCell>
                                <TableCell>{material.name}</TableCell>
                                <TableCell>{material.category}</TableCell>
                                <TableCell align="right">{material.quantity}</TableCell>
                                <TableCell align="right">{material.minQuantity}</TableCell>
                                <TableCell>
                                  {isOutOfStock ? (
                                    <Chip size="small" label="Tükendi" color="error" />
                                  ) : isLowStock ? (
                                    <Chip size="small" label="Kritik Stok" color="warning" />
                                  ) : (
                                    <Chip size="small" label="Yeterli" color="success" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
                
                {selectedMaterial && (
                  <Grid item xs={12}>
                    <MaterialPreview 
                      material={selectedMaterial}
                      movements={inventoryData?.movements?.filter(m => m.materialId === selectedMaterial.id) || []}
                    />
                  </Grid>
                )}
              </Grid>
            )}
            
            {/* Kategori Analizi */}
            {activeTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Kategori Bazında Stok Miktarları
                    </Typography>
                    <Box height={300}>
                      <Chart 
                        type="bar"
                        data={{
                          labels: inventoryData?.categoryStats?.map(c => c.category) || [],
                          datasets: [
                            {
                              label: 'Miktar',
                              data: inventoryData?.categoryStats?.map(c => c.totalQuantity) || [],
                              backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Kategori Bazında Stok Değeri
                    </Typography>
                    <Box height={300}>
                      <Chart 
                        type="pie"
                        data={{
                          labels: inventoryData?.categoryStats?.map(c => c.category) || [],
                          datasets: [
                            {
                              data: inventoryData?.categoryStats?.map(c => c.totalValue) || [],
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(54, 162, 235, 0.7)',
                                'rgba(255, 206, 86, 0.7)',
                                'rgba(75, 192, 192, 0.7)',
                                'rgba(153, 102, 255, 0.7)',
                                'rgba(255, 159, 64, 0.7)',
                              ],
                              borderWidth: 1
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right'
                            }
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Kritik Seviye Malzemeler (Kategori Bazında)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Kategori</TableCell>
                            <TableCell align="right">Kritik Seviye</TableCell>
                            <TableCell align="right">Tükenmiş</TableCell>
                            <TableCell align="right">Normal Seviye</TableCell>
                            <TableCell align="right">Toplam</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(inventoryData?.categoryLowStock || []).map((cat) => (
                            <TableRow key={cat.category}>
                              <TableCell>{cat.category}</TableCell>
                              <TableCell align="right">
                                <Chip 
                                  size="small" 
                                  label={cat.lowStock} 
                                  color="warning"
                                  sx={{ minWidth: 60 }} 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip 
                                  size="small" 
                                  label={cat.outOfStock} 
                                  color="error"
                                  sx={{ minWidth: 60 }} 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip 
                                  size="small" 
                                  label={cat.normalStock} 
                                  color="success"
                                  sx={{ minWidth: 60 }} 
                                />
                              </TableCell>
                              <TableCell align="right">{cat.total}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}
            
            {/* Tahmin ve Analiz */}
            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="h6">
                        Malzeme Kullanım Tahmini ve Sipariş Tavsiyeleri
                      </Typography>
                      {selectedMaterial && (
                        <Button
                          startIcon={predictionLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                          onClick={() => fetchMaterialPrediction(selectedMaterial.id)}
                          disabled={predictionLoading}
                        >
                          Tahmin Yenile
                        </Button>
                      )}
                    </Box>
                    
                    {!selectedMaterial ? (
                      <Alert severity="info">
                        Malzeme kullanım tahminini görüntülemek için lütfen bir malzeme seçin.
                      </Alert>
                    ) : predictionLoading ? (
                      <Box display="flex" justifyContent="center" my={5}>
                        <CircularProgress />
                      </Box>
                    ) : !predictionData ? (
                      <Alert severity="info">
                        {selectedMaterial.name} için kullanım tahmini henüz oluşturulmadı. Tahmin oluşturmak için "Tahmin Yenile" butonuna tıklayın.
                      </Alert>
                    ) : (
                      <>
                        <MaterialPredictionChart 
                          material={selectedMaterial}
                          predictionData={predictionData}
                        />
                        
                        <Divider sx={{ my: 3 }} />
                        
                        <Typography variant="h6" gutterBottom>
                          Sipariş Tavsiyeleri
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
                              <Typography variant="subtitle2" gutterBottom>Günlük Ortalama Kullanım</Typography>
                              <Typography variant="h5">{predictionData.recommendation?.avgDailyDemand.toFixed(1) || 0}</Typography>
                              <Typography variant="caption">adet/gün</Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: predictionData.recommendation?.isStockCritical ? 'error.light' : 'success.light', color: 'white' }}>
                              <Typography variant="subtitle2" gutterBottom>Stok Yeterlilik</Typography>
                              <Typography variant="h5">{predictionData.recommendation?.daysCurrentStockWillLast || 0}</Typography>
                              <Typography variant="caption">gün yetecek stok</Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'white' }}>
                              <Typography variant="subtitle2" gutterBottom>Önerilen Sipariş Miktarı</Typography>
                              <Typography variant="h5">{predictionData.recommendation?.recommendedOrderQuantity || 0}</Typography>
                              <Typography variant="caption">adet</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                        
                        <Box mt={2}>
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => router.push(`/inventory/purchase-request?materialId=${selectedMaterial.id}&quantity=${predictionData.recommendation?.recommendedOrderQuantity || 10}`)}
                          >
                            Satın Alma Talebi Oluştur
                          </Button>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      En Çok Kullanılan Malzemeler (Son 30 Gün)
                    </Typography>
                    <Box height={300}>
                      <Chart 
                        type="bar"
                        data={{
                          labels: inventoryData?.topUsedMaterials?.map(m => m.name) || [],
                          datasets: [
                            {
                              label: 'Kullanım Miktarı',
                              data: inventoryData?.topUsedMaterials?.map(m => m.usedQuantity) || [],
                              backgroundColor: 'rgba(153, 102, 255, 0.6)',
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        </>
      )}
    </Container>
  );
}
