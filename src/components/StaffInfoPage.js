import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  IconButton,
  InputBase,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon
} from '@mui/icons-material';

const StaffInfoPage = ({ user }) => {
  const theme = useTheme();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const userRole = user?.role || 'student';
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    department: '',
    image: null
  });

  // Predefined roles and department mapping (memoized for stable reference)
  const ROLES = useMemo(() => [
    'Hall Manager',
    'Assistant Manager',
    'Technician',
    'Caretaker',
    'Security Officer',
    'Accountant',
    'Housekeeping Supervisor'
  ], []);

  const DEPARTMENTS_BY_ROLE = useMemo(() => ({
    'Hall Manager': ['Administration'],
    'Assistant Manager': ['Administration'],
    'Technician': ['Maintenance', 'Electrical', 'Plumbing'],
    'Caretaker': ['Maintenance', 'Grounds'],
    'Security Officer': ['Security'],
    'Accountant': ['Accounts', 'Finance'],
    'Housekeeping Supervisor': ['Housekeeping', 'Laundry']
  }), []);

  // When role changes, default department to first available option for that role
  useEffect(() => {
    if (!newStaff.role) return;
    const opts = DEPARTMENTS_BY_ROLE[newStaff.role] || ['Administration'];
    if (!opts.includes(newStaff.department)) {
      setNewStaff(prev => ({ ...prev, department: opts[0] }));
    }
  }, [newStaff.role, newStaff.department, DEPARTMENTS_BY_ROLE]);

  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, filterRole, filterDepartment]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterRole) params.append('role', filterRole);
      if (filterDepartment) params.append('department', filterDepartment);

      const base = userRole === 'student' ? 'http://localhost:5000/api/admin/students/staff' : 'http://localhost:5000/api/authority/staff';
      const url = params.toString() ? `${base}?${params.toString()}` : base;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      // normalize to client shape
      const mapped = data.map(s => ({
        id: s.staff_id || s.id,
        name: s.name,
        role: s.designation || s.role,
        email: s.email,
        phone: s.phone,
        department: s.department,
        image: s.image_url || null
      }));
      setStaff(mapped);
    } catch (err) {
      console.error('fetchStaff error', err);
      setError('Failed to fetch staff information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.role || !newStaff.email || !newStaff.department) return;

    // send to backend
    (async () => {
      try {
        const authorityUsername = user?.user?.username || user?.username || JSON.parse(localStorage.getItem('user')||'{}')?.user?.username || JSON.parse(localStorage.getItem('user')||'{}')?.username;
        const res = await fetch('http://localhost:5000/api/authority/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authority-Username': authorityUsername
          },
          body: JSON.stringify({
            name: newStaff.name,
            role: newStaff.role,
            email: newStaff.email,
            phone: newStaff.phone,
            department: newStaff.department
          })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Failed to add staff');
        const staffMember = {
          id: data.staff_id,
          name: data.name,
          role: data.designation,
          email: data.email,
          phone: data.phone,
          department: data.department,
          image: data.image_url || null
        };
        setStaff([staffMember, ...staff]);
        handleCloseDialog();
      } catch (err) {
        console.error('Error adding staff:', err);
        alert('Error adding staff');
      }
    })();
  };

  const handleEditStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setNewStaff(staffMember);
    setOpenDialog(true);
  };

  const handleDeleteStaff = (staffId) => {
    setStaff(staff.filter(member => member.id !== staffId));
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedStaff(null);
    setNewStaff({
      name: '',
      role: '',
      email: '',
      phone: '',
      department: '',
      image: null
    });
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewStaff({ ...newStaff, image: URL.createObjectURL(file) });
    }
  };

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // grid sizing and card styles differ for student vs authority view
  const gridSize = userRole === 'student' ? { xs: 12, sm: 12, md: 6 } : { xs: 12, sm: 6, md: 4 };
  const cardSxBase = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[4] },
  };

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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            p: 4,
            borderRadius: 2,
            mb: 4,
            position: 'relative'
          }}
        >
          <Typography variant="h4" gutterBottom>
            Staff Information
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {userRole === 'student' ? 'View hall staff and authorities' : 'Manage hall staff and authorities'}
          </Typography>
          {userRole === 'authority' && (
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
            bgcolor: "white",
          }}
        >
          <IconButton sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Paper>

        {/* Role / Department Filters (visible to students and authority) */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="filter-role-label">Filter by Role</InputLabel>
            <Select
              labelId="filter-role-label"
              value={filterRole}
              label="Filter by Role"
              onChange={(e) => { setFilterRole(e.target.value); setFilterDepartment(''); }}
            >
              <MenuItem value="">All Roles</MenuItem>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="filter-dept-label">Filter by Department</InputLabel>
            <Select
              labelId="filter-dept-label"
              value={filterDepartment}
              label="Filter by Department"
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="">All Departments</MenuItem>
              {(filterRole ? (DEPARTMENTS_BY_ROLE[filterRole] || []) : Array.from(new Set(Object.values(DEPARTMENTS_BY_ROLE).flat())))
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Staff Grid */}
        <Grid container spacing={3}>
          {filteredStaff.map((member) => (
            <Grid item {...gridSize} key={member.id}>
              <Card
                sx={{
                  ...cardSxBase,
                  ...(userRole === 'student' ? { minHeight: 300, padding: 2 } : {}),
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={member.image}
                      sx={{ width: userRole === 'student' ? 80 : 64, height: userRole === 'student' ? 80 : 64, mr: 2 }}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant={userRole === 'student' ? 'h5' : 'h6'}>{member.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.role}
                      </Typography>
                    </Box>
                    {userRole === 'authority' && (
                      <Box sx={{ ml: 'auto' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStaff(member)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteStaff(member.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant={userRole === 'student' ? 'body1' : 'body2'}>{member.email}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant={userRole === 'student' ? 'body1' : 'body2'}>{member.phone}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant={userRole === 'student' ? 'body1' : 'body2'}>{member.department}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Add/Edit Staff Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Avatar
                  src={newStaff.image}
                  sx={{ width: 100, height: 100 }}
                >
                  <PersonIcon sx={{ fontSize: 60 }} />
                </Avatar>
              </Box>
              <Button
                variant="outlined"
                component="label"
                sx={{ alignSelf: 'center' }}
              >
                Upload Photo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </Button>
              <TextField
                label="Name"
                fullWidth
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Role"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  {ROLES.map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel id="dept-select-label">Department</InputLabel>
                <Select
                  labelId="dept-select-label"
                  label="Department"
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                >
                  {(DEPARTMENTS_BY_ROLE[newStaff.role] || ['Administration']).map(d => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleAddStaff}
              variant="contained"
              disabled={!newStaff.name || !newStaff.role || !newStaff.email || !newStaff.department}
            >
              {selectedStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default StaffInfoPage; 