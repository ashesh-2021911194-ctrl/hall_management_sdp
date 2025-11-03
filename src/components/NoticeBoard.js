import React, { useState, useEffect } from 'react';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

  useEffect(() => {
    fetchNotices();
  }, [userRole]);

  const fetchNotices = async () => {
  try {
    const res = await fetch(
      userRole === "authority"
        ? "http://localhost:5000/api/authority/notices"
        : "http://localhost:5000/api/admin/students/notices"
    );
    const data = await res.json();
    setNotices(data);
  } catch (err) {
    setError("Failed to fetch notices");
  } finally {
    setLoading(false);
  }
};


  const handleAddNotice = async () => {
    if (!newNotice.title || !newNotice.content) {
      alert("Title and content are required!");
      return;
    }

    const formData = new FormData();
    formData.append("title", newNotice.title);
    formData.append("content", newNotice.content);
    formData.append("importance", newNotice.importance);
    formData.append("requires_document", newNotice.requiresDocument);
    formData.append("documentTitle", newNotice.documentTitle);
    formData.append("documentDescription", newNotice.documentDescription);

    if (selectedFile) {
      formData.append("document", selectedFile);
    }

    try {
      console.log("Submitting notice:", {
        title: newNotice.title,
        content: newNotice.content,
        importance: newNotice.importance,
        requiresDocument: newNotice.requiresDocument
      });

      const res = await fetch("http://localhost:5000/api/authority/notices", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add notice");
      }

      const data = await res.json();
      
      // Add the new notice to the state
      setNotices(prevNotices => [data, ...prevNotices]);
      
      alert("Notice added successfully!");
      handleCloseDialog();
      
      // Refresh notices list
      fetchNotices();
    } catch (err) {
      console.error("Error adding notice:", err);
      alert(err.message || "Failed to add notice");
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
      background: 'linear-gradient(to bottom, #0B3D91 50%, #ffffff 50%)',
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
            {(selectedNotice.document_url || selectedNotice.student_document_url) && (
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
    <Box
      sx={{
        position: 'absolute',
        top: '-150px',
        left: '-150px',
        width: 300,
        height: 300,
        bgcolor: theme.palette.primary.main,
        borderRadius: '50%',
        opacity: 0.3,
        zIndex: 0,
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        top: '50px',
        right: '-100px',
        width: 250,
        height: 250,
        bgcolor: theme.palette.primary.main,
        borderRadius: '50%',
        opacity: 0.25,
        zIndex: 0,
      }}
    />

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
      <Grid container spacing={3}>
  {filteredNotices.map((notice) => (
    <Grid item xs={12} md={6} lg={4} key={notice.id}>
      {userRole === 'student' ? (
        <Accordion
  sx={{
    bgcolor: 'white',
    boxShadow: 2,
    height: 280, // fixed height
    width: '100%', // consistent width
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  }}
>

                <AccordionSummary
  expandIcon={<ExpandMoreIcon />}
  aria-controls={`notice-content-${notice.id}`}
  id={`notice-header-${notice.id}`}
  sx={{
    minHeight: 'unset', // removes unnecessary default padding
    '& .MuiAccordionSummary-content': {
      margin: 0,
      alignItems: 'center',
    },
  }}
>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip
                      icon={getImportanceIcon(notice.importance)}
                      label={notice.importance.toUpperCase()}
                      color={getImportanceColor(notice.importance)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="subtitle1">
                      {notice.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ ml: 2, color: 'gray' }}
                    >
                      {new Date(notice.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" paragraph>
                    {notice.content}
                  </Typography>

                  {(notice.document_url || notice.student_document_url) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Attached PDF:
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() =>
                          handleViewPdf(
                            notice.document_url || notice.student_document_url
                          )
                        }
                        startIcon={<AttachFileIcon />}
                      >
                        {notice.document_title ||
                          notice.documentTitle ||
                          'View PDF'}
                      </Button>
                      {(notice.document_description ||
                        notice.documentDescription) && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {notice.document_description ||
                            notice.documentDescription}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {notice.requiresDocument && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="subtitle2"
                        color="primary"
                      >
                        Required Document:
                      </Typography>
                      <Typography variant="body2">
                        {notice.document_title}
                      </Typography>
                      {notice.document_description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {notice.document_description}
                        </Typography>
                      )}
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFileIcon />}
                        sx={{ mt: 1 }}
                      >
                        Upload Document
                        <input
                          type="file"
                          hidden
                          onChange={(e) =>
                            handleUpload(notice.id, e.target.files[0])
                          }
                        />
                      </Button>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ) : (
              <Card
  sx={{
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4],
    },
    bgcolor: 'white',
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
                      onClick={() => handleViewDetails(notice)}
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

                  {(notice.requiresDocument || notice.document_url || notice.student_document_url) && (
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
                        {(notice.document_url || notice.student_document_url) && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewPdf(notice.document_url || notice.student_document_url)}
                            startIcon={<AttachFileIcon />}
                          >
                            View
                          </Button>
                        )}
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