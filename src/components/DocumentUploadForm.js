import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputBase,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Upload as UploadIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

/* =======================================================
   ApiFactory (Factory / Facade)
   Centralizes all API endpoint strings and simple fetch wrappers
   ======================================================= */
const ApiFactory = {
  baseAdmin: "http://localhost:5000/api/admin",
  getApplications: () => `${ApiFactory.baseAdmin}/applications`,
  approveApplication: (id) => `${ApiFactory.baseAdmin}/applications/${id}/approve`,
  rejectApplication: (id) => `${ApiFactory.baseAdmin}/applications/${id}/reject`,
  // For real uploads you'd have an endpoint like /uploads/documents
  // We keep using local mock flow (preserve behavior).
  async fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed ${res.status}`);
    }
    return await res.json();
  },
};

/* =======================================================
   StatusFactory (Factory Pattern)
   Produces icon + color for statuses (keeps view consistent)
   ======================================================= */
const StatusFactory = {
  getColor(status) {
    switch (status) {
      case "accepted":
        return "success";
      case "rejected":
        return "error";
      default:
        return "warning";
    }
  },
  getIcon(status) {
    switch (status) {
      case "accepted":
        return <CheckCircleIcon />;
      case "rejected":
        return <CancelIcon />;
      default:
        return <PendingIcon />;
    }
  },
};

/* =======================================================
   Commands (Command Pattern)
   Encapsulate actions (approve/reject/upload) so UI stays clean
   ======================================================= */
const ApproveCommand = async (applicationId, refreshFn) => {
  try {
    const res = await fetch(ApiFactory.approveApplication(applicationId), {
      method: "POST",
    });
    const data = await res.json();
    alert(data.message);
    if (typeof refreshFn === "function") await refreshFn();
  } catch (err) {
    console.error("Approve error:", err);
    alert("Failed to approve application");
  }
};

const RejectCommand = async (applicationId, refreshFn) => {
  try {
    const res = await fetch(ApiFactory.rejectApplication(applicationId), {
      method: "POST",
    });
    const data = await res.json();
    alert(data.message);
    if (typeof refreshFn === "function") await refreshFn();
  } catch (err) {
    console.error("Reject error:", err);
    alert("Failed to reject application");
  }
};

const UploadCommand = async (newDoc, setDocuments, closeDialog, setError) => {
  try {
    // In your real app you'd POST form-data to a backend.
    // Here we keep behavior: insert new doc client-side.
    setDocuments((prev) => [newDoc, ...prev]);
    if (typeof closeDialog === "function") closeDialog();
  } catch (err) {
    console.error("Upload error:", err);
    setError("Failed to upload document");
  }
};

/* =======================================================
   Template Method: useDocumentData
   Encapsulates data-loading behaviour (mock + real API)
   ======================================================= */
const useDocumentData = (role, location) => {
  const [documents, setDocuments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotices = useCallback(async () => {
    try {
      // fetch notices from backend depending on role
      const url = (role === 'authority')
        ? 'http://localhost:5000/api/authority/notices'
        : 'http://localhost:5000/api/admin/students/notices';

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch notices: ${res.status}`);
      }
      const data = await res.json();
      // normalize to array
      setNotices(data || []);
    } catch (err) {
      console.error('fetchNotices error', err);
      setError('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  }, [role]);

  

  const fetchApplications = useCallback(async () => {
    try {
      const data = await ApiFactory.fetchJson(ApiFactory.getApplications());
      // keep server shape (already returned in your backend)
      setDocuments(
  data.map((d) => ({
    application_id: d.application_id,

    // 🔥 normalize backend → frontend
    name: d.student_name,
    roll_no: d.roll_no,
    cgpa: d.cgpa,
    year: d.year,
    merit_rank: d.merit_rank,

    result_card: d.result_card,
    hall_card: d.hall_card,
    status: d.status,

    // keep filters happy
    hallId: d.hall_id ?? "",
  }))
);

    } catch (err) {
      console.error("Error fetching applications:", err);
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // role-based fetching (Strategy / Template)
    if (role === "authority") {
      // authority should fetch real applications
      fetchApplications();
    } else {
      // students use local mock behavior + notices
      Promise.all([ fetchNotices()]).catch((err) =>
        console.error(err)
      );
    }
    // re-run on location change (keeps original behavior)
  }, [role, location, fetchApplications, fetchNotices]);

  return { documents, setDocuments, notices, setNotices, loading, error, setError, fetchApplications };
};

/* =======================================================
   RoleRenderer (Strategy Pattern)
   Provides render functions for student vs authority view
   ======================================================= */
const RoleRenderer = {
  studentView: ({
    theme,
    searchQuery,
    setSearchQuery,
    openDialog,
    setOpenDialog,
    handleFileSelect,
    selectedFile,
    documentTitle,
    setDocumentTitle,
    documentDescription,
    setDocumentDescription,
    handleUploadClick,
    activeTab,
    handleTabChange,
    filteredDocuments,
    navigate,
    notices,
    setSelectedNoticeId,
    handleCloseDialog,
  }) => {
    return (
      <>
        <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
          <Paper
            sx={{
              p: "2px 4px",
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <IconButton sx={{ p: "10px" }} aria-label="search">
              <SearchIcon />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Paper>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Upload Document
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="All Documents" />
          <Tab label="Required Documents" />
        </Tabs>

        {/* Required notices that ask for uploads */}
        {Array.isArray(notices) && notices.filter((n) => n.requiresDocument).length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
            <Typography variant="h6">Required Documents</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              {notices
                .filter((n) => n.requiresDocument)
                .map((n) => (
                  <Paper key={n.id} sx={{ p: 2, minWidth: 240, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{n.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{n.date}</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setDocumentTitle(n.title || "");
                        setSelectedNoticeId?.(n.id);
                        setOpenDialog(true);
                      }}
                    >
                      Upload
                    </Button>
                  </Paper>
                ))}
            </Box>
          </Paper>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Related Notice</TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments
                .filter((doc) => activeTab === 0 || doc.noticeId)
                .map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>{doc.description}</TableCell>
                    <TableCell>
                      {doc.noticeTitle ? (
                        <Chip
                          label={doc.noticeTitle}
                          color="primary"
                          size="small"
                          onClick={() => navigate("/notices")}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{doc.fileName}</TableCell>
                    <TableCell>{doc.uploadDate}</TableCell>
                    <TableCell>
                      <Chip
                        icon={StatusFactory.getIcon(doc.status)}
                        label={doc.status}
                        color={StatusFactory.getColor(doc.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Upload Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
              <TextField
                label="Document Title"
                fullWidth
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
              />
              <Button variant="outlined" component="label" startIcon={<AttachFileIcon />}>
                Select File
                <input type="file" hidden onChange={handleFileSelect} />
              </Button>
              {selectedFile && (
                <Typography variant="body2" color="text.secondary">
                  Selected file: {selectedFile.name}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleUploadClick} variant="contained" disabled={!selectedFile || !documentTitle}>
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },

  authorityView: ({
    theme,
    searchQuery,
    setSearchQuery,
    hallIdSearch,
    setHallIdSearch,
    filteredDocuments,
    handleViewPdf,
    handleApprove,
    handleReject,
    openPdf,
    pdfUrl,
    setOpenPdf,
    navigate,
  }) => {
    return (
      <>
        <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
          <Paper
            sx={{
              p: "2px 4px",
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <IconButton sx={{ p: "10px" }} aria-label="search">
              <SearchIcon />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Paper>
          <TextField
            label="Search by Hall ID"
            value={hallIdSearch}
            onChange={(e) => setHallIdSearch(e.target.value)}
            sx={{ width: 200 }}
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Roll No</TableCell>
                <TableCell>CGPA</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Merit Rank</TableCell>
                <TableCell>Result Card</TableCell>
                <TableCell>Hall Card</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No applications to review
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.application_id}>
                    <TableCell>{doc.name}</TableCell>
<TableCell>{doc.roll_no}</TableCell>
<TableCell>{doc.cgpa}</TableCell>
<TableCell>{doc.year}</TableCell>
<TableCell>{doc.merit_rank}</TableCell>


                    <TableCell>
                      {doc.result_card ? (
                        <Button
                          variant="outlined"
                          onClick={() => handleViewPdf(`http://localhost:5000${doc.result_card}`)}
                        >
                          View PDF
                        </Button>
                      ) : "-"}
                    </TableCell>

                    <TableCell>
                      {doc.hall_card ? (
                        <Button
                          variant="outlined"
                          onClick={() => handleViewPdf(`http://localhost:5000${doc.hall_card}`)}
                        >
                          View PDF
                        </Button>
                      ) : "-"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        icon={StatusFactory.getIcon(doc.status)}
                        label={doc.status}
                        color={StatusFactory.getColor(doc.status)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" color="success" onClick={() => handleApprove(doc.application_id)}>
                          <CheckCircleIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleReject(doc.application_id)}>
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PDF Viewer Dialog */}
        <Dialog open={openPdf} onClose={() => setOpenPdf(false)} maxWidth="md" fullWidth>
          <DialogTitle>View PDF</DialogTitle>
          <DialogContent>
            <iframe title="PDF Viewer" src={pdfUrl} width="100%" height="600px" style={{ border: "none" }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPdf(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
};

/* =======================================================
   Component: DocumentUploadForm
   Observer: React state + effects provide reactive updates
   ======================================================= */
const DocumentUploadForm = ({ user }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Role (student / authority)
  const userRole = user?.role || "student";

  // Data hook (Template Method + Facade)
  const {
    documents,
    setDocuments,
    notices,
    loading,
    error,
    setError,
    fetchApplications,
  } = useDocumentData(userRole, location);

  // Local UI state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [hallIdSearch, setHallIdSearch] = useState("");
  const [openPdf, setOpenPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);

  // Handlers (thin glue that calls Commands / RoleRenderer)
  const handleFileSelect = (e) => setSelectedFile(e.target.files[0] || null);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFile(null);
    setDocumentTitle("");
    setDocumentDescription("");
    setSelectedNoticeId(null);
  };

  const handleUploadClick = async () => {
    if (!selectedFile || !documentTitle) return;

    // If upload is for a specific notice, POST multipart/form-data to backend
    if (selectedNoticeId) {
      try {
        const form = new FormData();
        form.append("document", selectedFile);

        const uploadRes = await fetch(`http://localhost:5000/api/students/notices/${selectedNoticeId}/upload`, {
          method: "POST",
          body: form,
        });

        if (!uploadRes.ok) {
          const txt = await uploadRes.text().catch(() => "");
          throw new Error(txt || `Upload failed: ${uploadRes.status}`);
        }

        // If backend returns JSON with file path/message, we can use it.
        let uploadJson = {};
        try {
          uploadJson = await uploadRes.json();
        } catch (e) {
          // ignore parse errors
        }

        const newDocument = {
          id: documents.length + 1,
          title: documentTitle,
          description: documentDescription,
          fileName: selectedFile.name,
          uploadDate: new Date().toISOString().split("T")[0],
          status: "pending",
          noticeId: selectedNoticeId,
          noticeTitle: notices.find((n) => n.id === selectedNoticeId)?.title || null,
          hallId: "HALL001",
          studentDocumentUrl: uploadJson.filePath || null,
        };

        setDocuments((prev) => [newDocument, ...prev]);
        handleCloseDialog();
      } catch (err) {
        console.error("Upload failed:", err);
        setError("Upload failed. Please try again.");
      }
      return;
    }

    // Fallback/mock behavior (no notice association)
    const newDocument = {
      id: documents.length + 1,
      title: documentTitle,
      description: documentDescription,
      fileName: selectedFile.name,
      uploadDate: new Date().toISOString().split("T")[0],
      status: "pending",
      noticeId: null,
      hallId: "HALL001",
    };
    UploadCommand(newDocument, setDocuments, handleCloseDialog, setError);
  };

  const handleApprove = async (applicationId) => {
    await ApproveCommand(applicationId, fetchApplications);
  };

  const handleReject = async (applicationId) => {
    await RejectCommand(applicationId, fetchApplications);
  };

  const handleViewPdf = (url) => {
    setPdfUrl(url);
    setOpenPdf(true);
  };

  // Filtering logic (kept same semantics)
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.fileName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.noticeTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesHallId = !hallIdSearch || (doc.hallId?.toLowerCase() || "").includes(hallIdSearch.toLowerCase());
    return matchesSearch && matchesHallId;
  });

  const handleTabChange = (event, newValue) => setActiveTab(newValue);

  // Early UI states
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
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

  // Main render: header + role-specific content + upload dialog
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ bgcolor: "white", color: "primary.main", p: 4, borderRadius: 2, mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              Document Management
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {userRole === "student" ? "Upload and manage your documents" : "Review and manage student documents"}
          </Typography>
        </Box>

        {/* Role-specific view */}
        {userRole === "student" ? (
          RoleRenderer.studentView({
            theme,
            searchQuery,
            setSearchQuery,
            openDialog,
            setOpenDialog,
            handleFileSelect,
            selectedFile,
            documentTitle,
            setDocumentTitle,
            documentDescription,
            setDocumentDescription,
            handleUploadClick,
            activeTab,
            handleTabChange,
            filteredDocuments,
            navigate,
            notices,
            setSelectedNoticeId,
            handleCloseDialog,
          })
        ) : (
          RoleRenderer.authorityView({
            theme,
            searchQuery,
            setSearchQuery,
            hallIdSearch,
            setHallIdSearch,
            filteredDocuments,
            handleViewPdf,
            handleApprove,
            handleReject,
            openPdf,
            pdfUrl,
            setOpenPdf,
            navigate,
          })
        )}

        {/* Re-use Upload Dialog for students (component-level) */}
        {/* (Student dialog is rendered from RoleRenderer) */}
      </Container>
    </Box>
  );
};

export default DocumentUploadForm;
