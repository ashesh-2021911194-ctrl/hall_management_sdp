import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  InputBase,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab
} from '@mui/material';
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  PriorityHigh as PriorityHighIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const NoticeBoard = ({ user }) => {
  console.log(user.allStudentId, user.role);

  const theme = useTheme();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole] = useState(user?.role || 'student');

  const [openDialog, setOpenDialog] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    importance: 'medium',
    requiresDocument: false,
    documentTitle: '',
    documentDescription: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const handleAddNotice = async () => {
    if (!newNotice.title || !newNotice.content) {
      alert('Title and content are required!');
      return;
    }

    const formData = new FormData();
    formData.append('title', newNotice.title);
    formData.append('content', newNotice.content);
    formData.append('importance', newNotice.importance);
    formData.append('requires_document', newNotice.requiresDocument);
    formData.append('documentTitle', newNotice.documentTitle);
    formData.append('documentDescription', newNotice.documentDescription);
    if (selectedFile) formData.append('document', selectedFile);

    try {
      const res = await fetch('http://localhost:5000/api/authority/notices', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add notice');
      }
      const data = await res.json();
      setNotices(prev => [data, ...prev]);
      alert('Notice added successfully!');
      handleCloseDialog();
      fetchNotices();
    } catch (err) {
      console.error('Error adding notice:', err);
      alert(err.message || 'Failed to add notice');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewNotice({
      title: '',
      content: '',
      importance: 'medium',
      requiresDocument: false,
      documentTitle: '',
      documentDescription: ''
    });
    setSelectedFile(null);
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const [openPdf, setOpenPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);

  const fetchNotices = async () => {
    try {
      const res = await fetch(
        userRole === 'authority'
          ? 'http://localhost:5000/api/authority/notices'
          : 'http://localhost:5000/api/admin/students/notices'
      );
      const data = await res.json();
      setNotices(data || []);
    } catch (err) {
      setError('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const handleViewDetails = (notice) => {
    setSelectedNotice(notice);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setSelectedNotice(null);
    setOpenViewDialog(false);
  };

  const handleViewPdf = (url) => {
    // normalize incoming url: if it's a relative path (starts with '/'), prefix backend origin
    if (!url) {
      console.error('No URL provided to handleViewPdf');
      return;
    }

    let final = url;
    try {
      if (final.startsWith('/')) {
        final = `http://localhost:5000${final}`;
      } else if (!final.startsWith('http')) {
        // not absolute, assume it's a path under /uploads
        final = `http://localhost:5000/${final}`;
      }
      console.log('Opening PDF URL:', final);
      setPdfUrl(final);
      setOpenPdf(true);
    } catch (e) {
      console.error('Error normalizing PDF url', e, url);
      alert('Error opening PDF');
    }
  };

  const handleClosePdf = () => {
    setOpenPdf(false);
    setPdfUrl(null);
  };

  const handleUpload = async (noticeId, file) => {
  const formData = new FormData();
  formData.append("document", file);

  try {
    const res = await fetch(
      `http://localhost:5000/api/admin/students/notices/${noticeId}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    alert(data.message);
  } catch (err) {
    alert(err.message);
  }
};


  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getImportanceIcon = (importance) => {
    switch (importance) {
      case 'high':
        return <PriorityHighIcon />;
      case 'medium':
        return <WarningIcon />;
      case 'low':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const filteredNotices = notices.filter(notice =>
    notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notice.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
  <Box
    sx={{
      minHeight: '100vh',
      position: 'relative',
      bgcolor: 'transparent', // remove solid color
      //background: 'linear-gradient(to bottom, #0B3D91 50%, #ffffff 50%)',
      overflow: 'hidden',
    }}
  >
    {/* View Details Dialog */}
    <Dialog
      open={openViewDialog}
      onClose={handleCloseViewDialog}
      maxWidth="md"
      fullWidth
    >
      {selectedNotice && (
        <>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={getImportanceIcon(selectedNotice.importance)}
                label={selectedNotice.importance.toUpperCase()}
                color={getImportanceColor(selectedNotice.importance)}
                size="small"
              />
              <Typography variant="h6">{selectedNotice.title}</Typography>
            </Box>
            <IconButton onClick={handleCloseViewDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" paragraph>
              {selectedNotice.content}
            </Typography>
            {((!selectedNotice.student_documents || selectedNotice.student_documents.length === 0) && (selectedNotice.document_url || selectedNotice.student_document_url)) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Attached Document:
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => handleViewPdf(selectedNotice.document_url || selectedNotice.student_document_url)}
                  startIcon={<AttachFileIcon />}
                >
                  {selectedNotice.document_title || selectedNotice.documentTitle || 'View Document'}
                </Button>
                {(selectedNotice.document_description || selectedNotice.documentDescription) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedNotice.document_description || selectedNotice.documentDescription}
                  </Typography>
                )}
              </Box>
            )}

            {selectedNotice.student_documents && selectedNotice.student_documents.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Student Uploaded Documents
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedNotice.student_documents.map((d) => {
                    const filename = d.file_path ? d.file_path.split('/').pop() : 'document';
                    const normalized = d.file_path && d.file_path.startsWith('/') ? `http://localhost:5000${d.file_path}` : d.file_path;
                    return (
                      <Paper key={d.id} sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2">{filename}</Typography>
                          {d.uploaded_at && (
                            <Typography variant="caption" color="text.secondary">{new Date(d.uploaded_at).toLocaleString()}</Typography>
                          )}
                        </Box>
                        <Box>
                          <Button size="small" variant="outlined" onClick={() => handleViewPdf(normalized)} startIcon={<AttachFileIcon />}>View</Button>
                          <Button size="small" sx={{ ml: 1 }} variant="text" href={normalized} target="_blank" rel="noopener noreferrer">Download</Button>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            )}
            {selectedNotice.requiresDocument && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Required Document Upload:
                </Typography>
                <Typography variant="body2">
                  {selectedNotice.documentTitle}
                </Typography>
                {selectedNotice.documentDescription && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedNotice.documentDescription}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachFileIcon />}
                  sx={{ mt: 2 }}
                >
                  Upload Document
                  <input
                    type="file"
                    hidden
                    onChange={(e) => handleUpload(selectedNotice.id, e.target.files[0])}
                  />
                </Button>
              </Box>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>

    {/* PDF Preview Dialog */}
    <Dialog 
      open={openPdf} 
      onClose={handleClosePdf}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Document Preview</Typography>
        <IconButton onClick={handleClosePdf} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', minHeight: '70vh' }}
            title="PDF Preview"
          />
        )}
      </DialogContent>
    </Dialog>
    {/* Background Circles */}
    {/* ======= Dark Blue Half + Circles ======= */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "50%",
              //bgcolor: "#0B3D91",
              zIndex: 0,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                width: 200,
                height: 200,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.1)",
                top: "20%",
                left: "30%",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                width: 250,
                height: 250,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                top: "25%",
                left: "40%",
              }}
            />
          </Box>

    <Container maxWidth="lg" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
      {/* Add Notice Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Notice</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={newNotice.title}
              onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={4}
              value={newNotice.content}
              onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Importance</InputLabel>
              <Select
                value={newNotice.importance}
                label="Importance"
                onChange={(e) => setNewNotice({ ...newNotice, importance: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newNotice.requiresDocument}
                  onChange={(e) =>
                    setNewNotice({ ...newNotice, requiresDocument: e.target.checked })
                  }
                />
              }
              label="Requires Document Upload"
            />
            {newNotice.requiresDocument && (
              <>
                <TextField
                  label="Document Title"
                  fullWidth
                  value={newNotice.documentTitle}
                  onChange={(e) =>
                    setNewNotice({ ...newNotice, documentTitle: e.target.value })
                  }
                />
                <TextField
                  label="Document Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={newNotice.documentDescription}
                  onChange={(e) =>
                    setNewNotice({
                      ...newNotice,
                      documentDescription: e.target.value,
                    })
                  }
                />
              </>
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
            >
              Upload Notice Document
              <input
                type="file"
                hidden
                onChange={handleFileSelect}
                accept="application/pdf"
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" color="textSecondary">
                Selected file: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleAddNotice}
            variant="contained"
            disabled={!newNotice.title || !newNotice.content}
          >
            Add Notice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          color: theme.palette.primary.main,
          p: 4,
          borderRadius: 2,
          mb: 4,
          position: 'relative',
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Notice Board
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          {userRole === 'student'
            ? 'Stay updated with the latest announcements'
            : 'Manage and publish notices'}
        </Typography>
        {userRole === 'authority' && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setOpenDialog(true)}
            sx={{
              position: 'absolute',
              right: 24,
              bottom: -24,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Search Bar */}
      <Paper
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          mb: 4,
          bgcolor: 'white',
          boxShadow: 2,
          borderRadius: 2,
        }}
      >
        <IconButton sx={{ p: '10px' }} aria-label="search">
          <SearchIcon color="primary" />
        </IconButton>
        <InputBase
          sx={{ ml: 1, flex: 1, color: theme.palette.primary.main }}
          placeholder="Search notices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Paper>

      {/* Notices Grid */}
      <Grid container spacing={3} justifyContent="center">
  {filteredNotices.map((notice) => (
    <Grid item xs={12} sm={6} md={4} lg={4} key={notice.id}>
      {userRole === 'student' ? (
        <Paper
          onClick={() => handleViewDetails(notice)}
          elevation={1}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            //bgcolor: 'white',
            cursor: 'pointer',
            '&:hover': { boxShadow: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
            <Chip
              icon={getImportanceIcon(notice.importance)}
              label={notice.importance.toUpperCase()}
              color={getImportanceColor(notice.importance)}
              size="small"
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{notice.title}</Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Typography variant="caption" sx={{ color: 'gray', minWidth: 110, textAlign: 'right' }}>
            {new Date(notice.date).toLocaleDateString()}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }} onClick={(e) => e.stopPropagation()}>
            {(notice.document_url || notice.student_document_url) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Attached Document:</Typography>
                <Button size="small" variant="outlined" onClick={() => handleViewPdf(notice.document_url || notice.student_document_url)} startIcon={<AttachFileIcon />}>View</Button>
              </Box>
            )}
            {notice.requiresDocument && (
  <Box sx={{ mt: 1 }}>
    {/* Show what the authority wants */}
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      Required Document:Read
    </Typography>
    <Typography variant="body2">{notice.documentTitle}</Typography>
    {notice.documentDescription && (
      <Typography variant="caption" color="text.secondary">
        {notice.documentDescription}
      </Typography>
    )}

    {/* Upload button */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <Button
        size="small"
        variant="outlined"
        component="label"
        startIcon={<AttachFileIcon />}
      >
        Upload
        <input
          type="file"
          hidden
          onChange={(e) => handleUpload(notice.id, e.target.files[0])}
        />
      </Button>
    </Box>
  </Box>
)}

          </Box>
        </Paper>
            ) : (
              <Card
  sx={{
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4],
    },
    //bgcolor: 'white',
    height: 280, // fixed height
    width: '100%', // consistent width
    maxWidth: 360, // 🔹 optional: fixed width for squarish look
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden', // 🔹 prevents expanding content
  }}
>


                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        icon={getImportanceIcon(notice.importance)}
                        label={notice.importance.toUpperCase()}
                        color={getImportanceColor(notice.importance)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notice.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        // If authority added a document on the notice, preview it inline.
                        if (notice.document_url) {
                          handleViewPdf(notice.document_url);
                        } else {
                          handleViewDetails(notice);
                        }
                      }}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {notice.title}
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {notice.content}
                  </Typography>

                  {(notice.requiresDocument || notice.document_url || notice.student_documents?.length > 0) && (
                    <Box sx={{ mt: 'auto' }}>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {notice.requiresDocument && (
                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            startIcon={<AttachFileIcon />}
                          >
                            Upload
                            <input
                              type="file"
                              hidden
                              onChange={(e) =>
                                handleUpload(notice.id, e.target.files[0])
                              }
                            />
                          </Button>
                        )}

                        {/* Prefer showing student-uploaded docs to authority */}
                        {notice.student_documents && notice.student_documents.length > 0 ? (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewDetails(notice)}
                            startIcon={<AttachFileIcon />}
                          >
                            View Student Docs
                          </Button>
                        ) : (notice.document_url && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewPdf(notice.document_url)}
                            startIcon={<AttachFileIcon />}
                          >
                            View
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

};

export default NoticeBoard; 