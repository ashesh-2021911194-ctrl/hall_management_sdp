import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  InputBase,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import axios from "axios";


/*const ComplaintFormPage = ({ user }) => {
  const theme = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(user?.role === "authority");
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const userRole = user?.role || "student";
  const [viewDialog, setViewDialog] = useState(false);
  const [viewComplaint, setViewComplaint] = useState(null);

  const API_BASE =
    user?.role === "authority"
      ? "http://localhost:5000/api/authority/complaints"
      : "http://localhost:5000/api/admin/students/complaints";

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newComplaint, setNewComplaint] = useState({
    title: "",
    description: "",
    complaintType: "", // from predefined list
    customComplaint: "", // manual complaint text if "Other"
    building: "",
    floor: "",
    block: "",
    room: "",
    category: "",
    priority: "medium",
    status: "pending",
});

  const [replyDialog, setReplyDialog] = useState(false);
  const [reply, setReply] = useState("");


  // ✅ Use same student resolver as seat allocation
  const resolveStudentObj = (u) => {
    if (!u) return null;
    let cur = u;
    for (let i = 0; i < 4; i++) {
      if (!cur) return null;
      if (cur.allStudentId || cur.all_student_id) return cur;
      if (cur.user && typeof cur.user === "object") {
        cur = cur.user;
        continue;
      }
      return null;
    }
    return null;
  };

  const studentObj = resolveStudentObj(user);
  const studentId = studentObj?.allStudentId || studentObj?.all_student_id;

  const fetchComplaints = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    let url;
    if (userRole === "student") {
      if (!studentId) throw new Error("Student ID not loaded yet");
      url = `${API_BASE}/${studentId}`;
    } else if (userRole === "authority") {
      url = `${API_BASE}`; // fetch all complaints
    }

    console.log("Fetching complaints from:", url);
    const res = await axios.get(url);

    const mappedData = (res.data || []).map((c) => ({
  id: c.complaint_id,
  complaint: c.complaint,
  building: c.building,
  floor: c.floor,
  block: c.block,
  room: c.room,
  description: c.description,
  status: c.status,
  date: new Date(c.created_at).toLocaleDateString(),
  reply: c.response,
  studentName: c.student_name,
}));


    setComplaints(mappedData);
  } catch (err) {
    console.error("Error fetching complaints:", err);
    setError("Failed to fetch complaints");
  } finally {
    setLoading(false);
  }
}, [API_BASE, userRole, studentId]);


  useEffect(() => {
  if ((userRole === "student" && studentId) || userRole === "authority") {
    fetchComplaints();
  }
}, [fetchComplaints, userRole, studentId]);


  // ✅ Submit complaint
  // ✅ Submit complaint
  const handleAddComplaint = async () => {
    if (!studentId) {
      setError("Cannot submit complaint: Student ID not loaded yet.");
      return;
    }
    if (!newComplaint.title || !newComplaint.description) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Build REST body to match backend expectations in students.js
      const title = newComplaint.title;
      const complaint_type = newComplaint.complaintType || null;
      const is_custom = newComplaint.complaintType === "Other";
      const floor_no = newComplaint.floor;
      const block_no = newComplaint.block || null;
      const room_no = newComplaint.room || null;

      await axios.post(API_BASE, {
        allStudentId: studentId,
        title,
        description: newComplaint.description,
        complaint_type,
        building: newComplaint.building,
        floor_no,
        block_no,
        room_no,
        is_custom,
      });


      alert("Complaint submitted successfully!");
      setOpenDialog(false);
      setNewComplaint({
        title: "",
        description: "",
        complaintType: "",
        customComplaint: "",
        building: "",
        floor: "",
        block: "",
        room: "",
        category: "",
        priority: "medium",
        status: "pending",
      });
      fetchComplaints();
    } catch (err) {
      console.error("Error submitting complaint:", err);
      // Check if backend returned a 409 Conflict
    if (err.response?.status === 409) {
      alert(err.response.data.error || "This complaint already exists and is being processed.");
      // Keep the dialog open for user to modify or cancel
      return;
    }
      setError("Failed to submit complaint");
    }
  };

  // ✅ Update status (authority)
  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/authority/complaints/${complaintId}/status`,
        { status: newStatus }
      );
      fetchComplaints();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update complaint status");
    }
  };

  // ✅ Reply (authority)
  const handleReply = (complaintId) => {
    const complaint = complaints.find((c) => c.id === complaintId);
    setSelectedComplaint(complaint);
    setReply(complaint.reply || "");
    setReplyDialog(true);
  };

  const handleSubmitReply = async () => {
    if (!reply.trim()) return;

    try {
      await axios.put(
        `http://localhost:5000/api/authority/complaints/${selectedComplaint.id}/respond`,
        { response: reply, status: "Resolved" }
      );
      setReplyDialog(false);
      fetchComplaints();
    } catch (err) {
      console.error("Error submitting reply:", err);
      setError("Failed to send response");
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedComplaint(null);
    setNewComplaint({
      title: "",
      description: "",
      category: "",
      priority: "medium",
      status: "pending",
    });
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "resolved":
        return "success";
      case "in-progress":
        return "warning";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "resolved":
        return <CheckCircleIcon />;
      case "in-progress":
        return <PendingIcon />;
      case "rejected":
        return <CancelIcon />;
      default:
        return <PendingIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const q = (searchQuery || "").toLowerCase();
  const filteredComplaints = complaints.filter((complaint) => {
    // defensive guards: some complaint objects may not have all fields
    const title = (complaint.complaint || complaint.title || "").toString().toLowerCase();
    const description = (complaint.description || "").toString().toLowerCase();
    const category = (complaint.category || "").toString().toLowerCase();
    const studentName = (complaint.studentName || "").toString().toLowerCase();

    return (
      title.includes(q) ||
      description.includes(q) ||
      category.includes(q) ||
      studentName.includes(q)
    );
  });*/
  /* -----------------------------------------------------
   ⚙️ Facade Pattern — Complaint API Facade
   ------------------------------------------------------
   Centralizes all complaint-related HTTP calls so
   components don't deal with URLs or axios logic.
------------------------------------------------------ */
const ComplaintAPI = {
  getBase(role) {
    return role === "authority"
      ? "http://localhost:5000/api/authority/complaints"
      : "http://localhost:5000/api/admin/students/complaints";
  },

  async fetchComplaints(role, studentId) {
    const base = this.getBase(role);
    const url = role === "student" ? `${base}/${studentId}` : base;
    return axios.get(url);
  },

  async submitComplaint(payload) {
    return axios.post(
      "http://localhost:5000/api/admin/students/complaints",
      payload
    );
  },

  async updateStatus(id, status) {
    return axios.put(
      `http://localhost:5000/api/authority/complaints/${id}/status`,
      { status }
    );
  },

  async respond(id, response) {
    return axios.put(
      `http://localhost:5000/api/authority/complaints/${id}/respond`,
      { response, status: "Resolved" }
    );
  },
};

/* -----------------------------------------------------
   🏭 Factory Pattern — Student Resolver
   ------------------------------------------------------
   Safely extracts all_student_id from deeply nested
   user objects (shared logic across features).
------------------------------------------------------ */
const StudentFactory = {
  resolve(user) {
    if (!user) return null;
    let cur = user;
    for (let i = 0; i < 4; i++) {
      if (cur?.allStudentId || cur?.all_student_id) return cur;
      cur = cur?.user;
    }
    return null;
  },
};

/* -----------------------------------------------------
   🧠 Container Component — ComplaintFormPage
------------------------------------------------------ */
const ComplaintFormPage = ({ user }) => {
  const theme = useTheme();

  /* -----------------------------------------------------
     🔁 Observer Pattern — React State
  ------------------------------------------------------ */
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(user?.role === "authority");
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  /* -----------------------------------------------------
   🪟 UI View State — Dialog & Selection
------------------------------------------------------ */
const [viewDialog, setViewDialog] = useState(false);
const [viewComplaint, setViewComplaint] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [replyDialog, setReplyDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [reply, setReply] = useState("");

  const [newComplaint, setNewComplaint] = useState({
    title: "",
    description: "",
    complaintType: "",
    customComplaint: "",
    building: "",
    floor: "",
    block: "",
    room: "",
    category: "",
    priority: "medium",
    status: "pending",
  });

  const userRole = user?.role || "student";
  const studentObj = StudentFactory.resolve(user);
  const studentId = studentObj?.allStudentId || studentObj?.all_student_id;

  /* -----------------------------------------------------
   🎨 Strategy Pattern — Status → Icon Resolver
------------------------------------------------------ */
const getStatusIcon = (status) => {
  switch (status) {
    case "resolved":
      return <CheckCircleIcon color="success" />;
    case "in-progress":
      return <PendingIcon color="warning" />;
    case "rejected":
      return <CancelIcon color="error" />;
    default:
      return <PendingIcon color="disabled" />;
  }
};

/* -----------------------------------------------------
   🧠 Command Pattern — Close Any Dialog Safely
------------------------------------------------------ */
const handleCloseDialog = () => {
  setOpenDialog(false);
  setReplyDialog(false);
  setViewDialog(false);

  setSelectedComplaint(null);
  setViewComplaint(null);
  setReply("");

  setNewComplaint({
    title: "",
    description: "",
    complaintType: "",
    customComplaint: "",
    building: "",
    floor: "",
    block: "",
    room: "",
    category: "",
    priority: "medium",
    status: "pending",
  });
};

/* -----------------------------------------------------
   🧠 Command Pattern — Submit Authority Reply
------------------------------------------------------ */
const handleSubmitReply = async () => {
  if (!reply.trim() || !selectedComplaint) return;

  try {
    await ComplaintAPI.respond(selectedComplaint.id, reply);
    setReplyDialog(false);
    setReply("");
    fetchComplaints();
  } catch (err) {
    console.error("Error submitting reply:", err);
    setError("Failed to send response");
  }
};

  /* -----------------------------------------------------
     🧠 Command Pattern — Fetch Complaints
  ------------------------------------------------------ */
  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ComplaintAPI.fetchComplaints(userRole, studentId);

      const mapped = (res.data || []).map((c) => ({
        id: c.complaint_id,
        complaint: c.complaint || c.title,
        description: c.description,
        building: c.building,
        floor: c.floor_no,
        block: c.block_no,
        room: c.room_no,
        status: c.status,
        date: new Date(c.created_at).toLocaleDateString(),
        reply: c.response,
        studentName: c.student_name,
      }));

      setComplaints(mapped);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  }, [userRole, studentId]);

  useEffect(() => {
    if ((userRole === "student" && studentId) || userRole === "authority") {
      fetchComplaints();
    }
  }, [fetchComplaints, userRole, studentId]);

  /* -----------------------------------------------------
     🧠 Command Pattern — Submit Complaint
  ------------------------------------------------------ */
  const handleAddComplaint = async () => {
    if (!studentId) {
      setError("Student ID not loaded");
      return;
    }

    try {
      await ComplaintAPI.submitComplaint({
        allStudentId: studentId,
        title: newComplaint.title,
        description: newComplaint.description,
        complaint_type: newComplaint.complaintType || null,
        building: newComplaint.building,
        floor_no: newComplaint.floor,
        block_no: newComplaint.block || null,
        room_no: newComplaint.room || null,
        is_custom: newComplaint.complaintType === "Other",
      });

      alert("Complaint submitted successfully!");
      setOpenDialog(false);
      setNewComplaint({
        title: "",
        description: "",
        complaintType: "",
        customComplaint: "",
        building: "",
        floor: "",
        block: "",
        room: "",
        category: "",
        priority: "medium",
        status: "pending",
      });

      fetchComplaints();
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response.data.error);
        return;
      }
      setError("Failed to submit complaint");
    }
  };

  /* -----------------------------------------------------
     🧠 Command Pattern — Authority Actions
  ------------------------------------------------------ */
  const handleStatusChange = async (id, status) => {
    await ComplaintAPI.updateStatus(id, status);
    fetchComplaints();
  };

  const handleReplySubmit = async () => {
    await ComplaintAPI.respond(selectedComplaint.id, reply);
    setReplyDialog(false);
    fetchComplaints();
  };

  /* -----------------------------------------------------
     🔍 Strategy Pattern — Search Filtering
  ------------------------------------------------------ */
  const q = searchQuery.toLowerCase();
  const filteredComplaints = complaints.filter((c) =>
    [c.complaint, c.description, c.studentName]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );

  

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
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
      py: 6,
    }}
  >
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

    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          color: '#0B3D91',
          p: 4,
          borderRadius: 3,
          mb: 4,
          position: 'relative',
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#0B3D91' }}>
          Complaints
        </Typography>
        <Typography variant="body1" sx={{ color: '#0B3D91', opacity: 0.95 }}>
          {userRole === 'student'
            ? 'Submit and track your complaints'
            : 'Manage and respond to student complaints'}
        </Typography>

        {userRole === 'student' && (
          <Fab
            color="secondary"
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
          //bgcolor: 'white',
          borderRadius: 2,
        }}
      >
        <IconButton sx={{ p: '10px', color: '#0B3D91' }} aria-label="search">
          <SearchIcon />
        </IconButton>
        <InputBase
          sx={{ ml: 1, flex: 1, color: '#0B3D91' }}
          placeholder="Search complaints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Paper>

      
<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
  {filteredComplaints.map((complaint) => (
    <Box
      key={complaint.id}
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.75)",
        borderRadius: 2,
        p: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        transition: "0.3s",
        "&:hover": {
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box
  sx={{
    display: "flex",
    alignItems: "center",
    gap: 1,              // tighter spacing
    flexWrap: "nowrap",  // keep everything on one line (desktop)
    overflow: "hidden",
  }}
>
  {/* TITLE */}
  <Typography
    sx={{
      fontWeight: 600,
      color: "#031533ff",
      width: 180,
      flexShrink: 0,
    }}
  >
    {complaint.title}
  </Typography>

  {/* DESCRIPTION */}
  <Typography
    sx={{
      color: "#0B3D91",
      width: 260,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      flexShrink: 0,
    }}
  >
    {complaint.description}
  </Typography>

  {/* CATEGORY */}
  <Chip
    label={complaint.category}
    size="small"
    sx={{ flexShrink: 0 }}
  />

  {/* SUBMITTED BY */}
  <Typography
    sx={{
      width: 140,
      flexShrink: 0,
    }}
  >
    {complaint.studentName}
  </Typography>

  {/* DATE */}
  <Typography
    variant="caption"
    sx={{
      color: "#0B3D91",
      width: 90,
      flexShrink: 0,
    }}
  >
    {complaint.date}
  </Typography>
</Box>


        {/* RIGHT SIDE */}
<Box
  sx={{
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // pushes button to right
    gap: 1,
  }}
>
  {/* STATUS SECTION */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Chip
      icon={getStatusIcon(complaint.status)}
      label={complaint.status}
      size="small"
      sx={{
        bgcolor: "rgba(11,61,145,0.08)",
        color: "#0B3D91",
      }}
    />

    {userRole === "authority" && (
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <Select
          value={complaint.status}
          onChange={(e) =>
            handleStatusChange(complaint.id, e.target.value)
          }
        >
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="in-progress">In Progress</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </FormControl>
    )}
  </Box>

  {/* VIEW DETAILS – RIGHT MOST */}
  <Button
    variant="outlined"
    size="small"
    onClick={() => {
      setViewComplaint(complaint);
      setViewDialog(true);
    }}
    sx={{
      borderColor: "#0B3D91",
      color: "#ffffffff",
      textTransform: "none",
      whiteSpace: "nowrap",
    }}
  >
    View Details
  </Button>
</Box>

      </Box>
    </Box>
  ))}
</Box>



{/* Complaint Details Dialog */}
<Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
  <DialogTitle sx={{ bgcolor: 'white', color: 'primary.main' }}>Complaint Details</DialogTitle>
  <DialogContent sx={{ bgcolor: 'white' }}>
    {viewComplaint && (
      <Box sx={{ display: 'flex', gap: 4, pt: 2, flexWrap: 'wrap', bgcolor: 'white' }}>
        
        {/* Left: Complaint Info */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          {/* Title */}
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
            {viewComplaint.title}
          </Typography>

          {/* Description */}
          <Typography variant="body1" sx={{ color: 'primary.main', mb: 2 }}>
            {viewComplaint.description}
          </Typography>

          {/* Student & Date */}
          <Typography variant="subtitle1" sx={{ color: 'primary.main', mb: 1 }}>
            Submitted by: {viewComplaint.studentName} <br />
            Date: {viewComplaint.date}
          </Typography>

          {/* Location */}
          <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
            Location: 
            {viewComplaint.building ? ` Building ${viewComplaint.building}` : " Not Provided"}
            {viewComplaint.floor ? `, Floor ${viewComplaint.floor}` : ""}
            {viewComplaint.block ? `, Block ${viewComplaint.block}` : ""}
            {viewComplaint.room ? `, Room ${viewComplaint.room}` : ""}
          </Typography>
        </Box>

        {/* Right: Authority Response */}
        {viewComplaint.reply && (
          <Box
            sx={{
              flex: 1,
              minWidth: 300,
              bgcolor: 'white',
              p: 3,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              border: theme => `1px solid ${theme.palette.primary.main}`, // optional border to distinguish
            }}
          >
            <Typography variant="h6" sx={{ color: 'primary.main', mb: 1, fontWeight: 'bold' }}>
              Authority's Response
            </Typography>
            <Typography variant="body1" sx={{ color: 'primary.main', fontSize: '1rem' }}>
              {viewComplaint.reply}
            </Typography>
          </Box>
        )}
      </Box>
    )}
  </DialogContent>

  <DialogActions sx={{ bgcolor: 'white' }}>
    <Button onClick={() => setViewDialog(false)} sx={{ color: 'white' }}>
      Close
    </Button>
  </DialogActions>
</Dialog>






{/* Add/Edit Complaint Dialog */}
<Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
  <DialogTitle>
    {selectedComplaint ? 'Edit Complaint' : 'Submit New Complaint'}
  </DialogTitle>

  <DialogContent>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

      {/* Title */}
      <TextField
        label="Title"
        fullWidth
        value={newComplaint.title}
        onChange={(e) =>
          setNewComplaint({ ...newComplaint, title: e.target.value })
        }
      />

      {/* Description */}
      <TextField
        label="Description"
        fullWidth
        multiline
        rows={4}
        value={newComplaint.description}
        onChange={(e) =>
          setNewComplaint({ ...newComplaint, description: e.target.value })
        }
      />

      {/* ------------------------- */}
      {/* COMPLAINT TYPE SELECTOR */}
      {/* ------------------------- */}
      <FormControl fullWidth>
        <InputLabel>Complaint Type</InputLabel>
        <Select
          value={newComplaint.complaintType}
          label="Complaint Type"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, complaintType: e.target.value })
          }
        >
          <MenuItem value="Electricity">Electricity</MenuItem>
          <MenuItem value="Water Supply">Water Supply</MenuItem>
          <MenuItem value="Cleaning">Cleaning</MenuItem>
          <MenuItem value="Meal Quality">Meal Quality</MenuItem>
          <MenuItem value="WiFi">WiFi</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
      </FormControl>

      {/* Show custom input ONLY if "Other" */}
      {newComplaint.complaintType === "Other" && (
        <TextField
          label="Custom Complaint"
          fullWidth
          value={newComplaint.customComplaint}
          onChange={(e) =>
            setNewComplaint({
              ...newComplaint,
              customComplaint: e.target.value,
            })
          }
        />
      )}

      {/* ------------------------- */}
      {/* LOCATION SELECTORS */}
      {/* ------------------------- */}

      {/* Building */}
      <FormControl fullWidth>
        <InputLabel>Building</InputLabel>
        <Select
          value={newComplaint.building}
          label="Building"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, building: e.target.value })
          }
        >
          <MenuItem value="A">Building A</MenuItem>
          <MenuItem value="B">Building B</MenuItem>
          <MenuItem value="C">Building C</MenuItem>
        </Select>
      </FormControl>

      {/* Floor */}
      <FormControl fullWidth disabled={!newComplaint.building}>
        <InputLabel>Floor</InputLabel>
        <Select
          value={newComplaint.floor}
          label="Floor"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, floor: e.target.value })
          }
        >
          <MenuItem value="1">1st Floor</MenuItem>
          <MenuItem value="2">2nd Floor</MenuItem>
          <MenuItem value="3">3rd Floor</MenuItem>
        </Select>
      </FormControl>

      {/* Block */}
      <FormControl fullWidth disabled={!newComplaint.floor}>
        <InputLabel>Block (optional)</InputLabel>
        <Select
          value={newComplaint.block}
          label="Block"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, block: e.target.value })
          }
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="East">East Block</MenuItem>
          <MenuItem value="West">West Block</MenuItem>
          <MenuItem value="North">North Block</MenuItem>
          <MenuItem value="South">South Block</MenuItem>
        </Select>
      </FormControl>

      {/* Room */}
      <TextField
        label="Room No (optional)"
        fullWidth
        value={newComplaint.room}
        onChange={(e) =>
          setNewComplaint({ ...newComplaint, room: e.target.value })
        }
      />

      {/* CATEGORY */}
      <FormControl fullWidth>
        <InputLabel>Category</InputLabel>
        <Select
          value={newComplaint.category}
          label="Category"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, category: e.target.value })
          }
        >
          <MenuItem value="Maintenance">Maintenance</MenuItem>
          <MenuItem value="Discipline">Discipline</MenuItem>
          <MenuItem value="Facilities">Facilities</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
      </FormControl>

      {/* PRIORITY */}
      <FormControl fullWidth>
        <InputLabel>Priority</InputLabel>
        <Select
          value={newComplaint.priority}
          label="Priority"
          onChange={(e) =>
            setNewComplaint({ ...newComplaint, priority: e.target.value })
          }
        >
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>

    </Box>
  </DialogContent>

  <DialogActions>
    <Button onClick={handleCloseDialog}>Cancel</Button>
    <Button
      onClick={handleAddComplaint}
      variant="contained"
      disabled={
        !newComplaint.title ||
        !newComplaint.description ||
        !newComplaint.category
      }
    >
      {selectedComplaint ? 'Save Changes' : 'Submit Complaint'}
    </Button>
  </DialogActions>
</Dialog>


      {/* Reply Dialog */}
      <Dialog
        open={replyDialog}
        onClose={() => setReplyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reply to Complaint</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Your Response"
              fullWidth
              multiline
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitReply}
            variant="contained"
            disabled={!reply.trim()}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  </Box>
);

};

export default ComplaintFormPage; 