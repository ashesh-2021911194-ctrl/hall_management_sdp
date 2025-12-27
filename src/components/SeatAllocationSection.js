// SeatAllocationSection.js
// =====================================================
// 🎯 Purpose: Display seat info and handle allocation logic
// 👷 Patterns Applied:
// - [Factory Pattern] for unified API endpoint generation
// - [Strategy Pattern] for dynamic role-based rendering (student vs authority)
// - [Template Method Pattern] for data fetching (fetchAllStudents method reused)
// - [Observer Pattern] through state updates triggering UI reactivity
// =====================================================

import React, { useState, useEffect } from "react";
import FloorChart from "./FloorChart";
import StudentSeat from "./StudentSeat";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
} from "@mui/material";

// =====================================================
// [Factory Pattern]
// API Factory centralizes endpoint creation and fetch logic
// =====================================================
const ApiFactory = {
  base: "http://localhost:5000/api/admin/students",

  async fetchJSON(endpoint, options = {}) {
    const res = await fetch(`${this.base}${endpoint}`, options);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return await res.json();
  },

  getAllocated() {
    return this.fetchJSON("/allocated");
  },
  getWaiting() {
    return this.fetchJSON("/waiting");
  },
  updateAllocation() {
    return this.fetchJSON("/update-allocation", { method: "POST" });
  },
  dismissStudent(studentId) {
    return this.fetchJSON(`/${studentId}/dismiss`, { method: "POST" });
  },
};

// =====================================================
// [Template Method Pattern]
// Defines the template for fetching all data sets in a unified way
// =====================================================
const useStudentData = (userRole) => {
  const [allocated, setAllocated] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllStudents = async () => {
    try {
      const [alloc, wait] = await Promise.all([
        ApiFactory.getAllocated(),
        ApiFactory.getWaiting(),
      ]);
      setAllocated(alloc);
      setWaiting(wait);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "authority") fetchAllStudents();
  }, [userRole]);

  return { allocated, waiting, loading, fetchAllStudents, setAllocated };
};

// =====================================================
// Main Component
// =====================================================
const SeatAllocationSection = ({ user }) => {
  const {
    allocated,
    waiting,
    loading,
    fetchAllStudents,
    setAllocated,
  } = useStudentData(user?.role);

  const [tab, setTab] = useState("allocated");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floor, setFloor] = useState(3);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [facultyFilter, setFacultyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // =====================================================
  // [Strategy Pattern]
  // Dynamically switch rendering based on user role
  // =====================================================
  if (user?.role === "student") return <StudentSeat user={user} />;

  if (user?.role === "authority") {
    if (loading) return <p>Loading student data...</p>;

    // [Observer Pattern] - state changes re-render the table dynamically
    /*const filteredAllocated = allocated.filter(
      (s) =>
        (s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(search.toLowerCase())) &&
        (yearFilter ? s.year === parseInt(yearFilter) : true) &&
        (buildingFilter ? s.building_name === buildingFilter : true)
    );

    const filteredWaiting = waiting.filter(
      (s) =>
        (s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(search.toLowerCase())) &&
        (yearFilter ? s.year === parseInt(yearFilter) : true)
    );*/
    const filteredAllocated = allocated.filter(
  (s) =>
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
     s.faculty?.toLowerCase().includes(search.toLowerCase()) ||
     s.department?.toLowerCase().includes(search.toLowerCase())) &&

    (yearFilter ? s.year === parseInt(yearFilter) : true) &&
    (buildingFilter ? s.building_name === buildingFilter : true) &&

    // ✅ ADD THESE TWO LINES
    (facultyFilter ? s.faculty === facultyFilter : true) &&
    (departmentFilter ? s.department === departmentFilter : true)
);


const filteredWaiting = waiting.filter(
  (s) =>
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
     s.faculty?.toLowerCase().includes(search.toLowerCase()) ||
     s.department?.toLowerCase().includes(search.toLowerCase())) &&

    (yearFilter ? s.year === parseInt(yearFilter) : true) &&

    // ✅ ADD THESE TWO LINES
    (facultyFilter ? s.faculty === facultyFilter : true) &&
    (departmentFilter ? s.department === departmentFilter : true)
);


const FACULTY_DEPARTMENT_MAP = {
  
  "Faculty of Engineering": [
    "Computer Science & Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electronics Engineering",
    "Chemical Engineering",
    "Nuclear Engineering",
    "Electrical and Electronic Engineering",
  ],

  "Faculty of Science": [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
  ],

  "Faculty of Arts": [
    "English Literature",
    "History",
    "Bengali Language",
    "Philosophy",
    "Sociology",
    "Islamic Studies",
  ],

  "Faculty of Business": [
    "Accounting",
    "Finance",
    "Management",
    "Economics",
    "Marketing",
  ],
};

    // =====================================================
    // [Command Pattern]
    // Encapsulates button click actions as async commands
    // =====================================================
    const handleUpdateAllocation = async () => {
      try {
        const data = await ApiFactory.updateAllocation();
        alert(data.message);
        await fetchAllStudents();
      } catch (err) {
        console.error(err);
        alert("Error updating allocation");
      }
    };

    const handleDismiss = async (student) => {
      const confirmDismiss = window.confirm(
        `Are you sure you want to dismiss seat of ${student.name} (${student.roll_no})?`
      );
      if (!confirmDismiss) return;

      try {
        const data = await ApiFactory.dismissStudent(student.student_id);
        alert(data.message);
        const newAllocated = await ApiFactory.getAllocated();
        setAllocated(newAllocated);
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error(err);
        alert("Error dismissing student");
      }
    };

    // =====================================================
    // Render UI (Authority View)
    // =====================================================
    return (
  <Box
    sx={{
      minHeight: "100vh",
      color: "primary.main",
      p: 4,
    }}
  >
    <Box
  sx={{
    bgcolor: "white",
    borderRadius: 2,
    px: 2,
    py: 3, // 👈 increases height
    mb: 4,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  }}
>
  <Typography
    variant="h4"
    align="center"
    sx={{ fontWeight: "bold", color: "primary.main" }}
  >
    🏛️ Authority: Student List
  </Typography>
</Box>



    {/* Tabs */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 3,
        borderRadius: 2,
        bgcolor: "rgba(255, 255, 255, 0.75)",
      }}
    >
      <Tabs
        value={tab}
        onChange={(e, newVal) => setTab(newVal)}
        centered
        textColor="inherit"
        indicatorColor="primary"
      >
        <Tab value="allocated" label="Allocated Students" sx={{ color: "#063a70" }} />
        <Tab value="waiting" label="Waiting Students" sx={{ color: "#063a70" }} />
      </Tabs>
    </Box>

    {/* Update Allocation Button */}
    <Box textAlign="center" sx={{ mb: 3 }}>
      <Button
        variant="contained"
        color="success"
        onClick={handleUpdateAllocation}
        sx={{
          px: 3,
          py: 1,
          fontWeight: "bold",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,255,128,0.2)",
        }}
      >
        Update Allocation
      </Button>
    </Box>

    {/* Search & Filters */}
    <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          fullWidth
          label="Search by name or roll..."
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
        bgcolor: "rgba(255, 255, 255, 0.75)",
        borderRadius: 1,
        "& .MuiInputBase-input": {
          color: "primary.main",
        },
        "& .MuiInputLabel-root": {
          color: "primary.main",
        },
        "& .MuiOutlinedInput-root": {
          "& fieldset": {
            borderColor: "primary.main",
          },
          "&:hover fieldset": {
            borderColor: "primary.main",
          },
          "&.Mui-focused fieldset": {
            borderColor: "primary.main",
          },
        },
      }}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth>
          <InputLabel sx={{ color: "primary.main" }}>Year</InputLabel>
          <Select
            value={yearFilter}
            label="Year"
            onChange={(e) => setYearFilter(e.target.value)}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.75)",
              color: "primary.main",
              minWidth: 150,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ffffffff" },
            }}
          >
            <MenuItem value="">All Years</MenuItem>
            <MenuItem value="1">1st Year</MenuItem>
            <MenuItem value="2">2nd Year</MenuItem>
            <MenuItem value="3">3rd Year</MenuItem>
            <MenuItem value="4">4th Year</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {tab === "allocated" && (
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "primary.main" }}>Building</InputLabel>
            <Select
              value={buildingFilter}
              label="Building"
              onChange={(e) => setBuildingFilter(e.target.value)}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.75)",
              color: "primary.main",
                minWidth: 150,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ffffffff" },
              }}
            >
              <MenuItem value="">All Buildings</MenuItem>
              <MenuItem value="Main Building">Main Building</MenuItem>
              <MenuItem value="Extension 1">Extension 1</MenuItem>
              <MenuItem value="Extension 2">Extension 2</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      )}
    
    
    <Grid item xs={12} sm={6} md={4}>
  <FormControl fullWidth>
    <InputLabel>Faculty</InputLabel>
    <Select
      value={facultyFilter}
      label="Faculty"
      onChange={(e) => {
        setFacultyFilter(e.target.value);
        setDepartmentFilter("");
      }}
      sx={{
    bgcolor: "rgba(255,255,255,0.75)",
    minWidth: 150,
    minHeight: 56,              // ✅ FIX
    display: "flex",
    alignItems: "center",
  }}
    >
      <MenuItem value="">All Faculties</MenuItem>
      {Object.keys(FACULTY_DEPARTMENT_MAP).map((faculty) => (
        <MenuItem key={faculty} value={faculty}>
          {faculty}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

<Grid item xs={12} sm={6} md={4}>
  <FormControl fullWidth disabled={!facultyFilter}>
    <InputLabel>Department</InputLabel>
    <Select
      value={departmentFilter}
      label="Department"
      onChange={(e) => setDepartmentFilter(e.target.value)}
      sx={{
    bgcolor: "rgba(255,255,255,0.75)",
    minWidth: 150,
    minHeight: 56,              // ✅ FIX
    display: "flex",
    alignItems: "center",
  }}
    >
      <MenuItem value="">All Departments</MenuItem>
      {facultyFilter &&
        FACULTY_DEPARTMENT_MAP[facultyFilter].map((dept) => (
          <MenuItem key={dept} value={dept}>
            {dept}
          </MenuItem>
        ))}
    </Select>
  </FormControl>
</Grid>
</Grid>
    {/* Floor Chart */}
<Card
  sx={{
    bgcolor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 3,
    p: 2,
    mb: 4,
    boxShadow: "0 0 15px rgba(0,0,0,0.3)",
    color: "#063a70", // ✅ sets default text color for all children
  }}
>
  <CardContent sx={{ color: "#063a70" }}>
    <Typography variant="h6" sx={{ mb: 2, color: "#063a70" }}>
      Floor Overview
    </Typography>
    <FloorChart
      building={buildingFilter || "Main Building"}
      floor={floor}
      refreshTrigger={refreshTrigger}
      textColor="#063a70"
    />
  </CardContent>
</Card>


    {/* Floor Selector */}
    <Box textAlign="center" sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ mr: 2, color: "primary.main" }}>
        Select Floor:
      </Typography>
      <Select
        value={floor}
        onChange={(e) => setFloor(Number(e.target.value))}
        sx={{
          color: "primary.main",
          bgcolor: "white",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
        }}
      >
        <MenuItem value={3}>3rd Floor</MenuItem>
        <MenuItem value={2}>2nd Floor</MenuItem>
        <MenuItem value={1}>1st Floor</MenuItem>
      </Select>
    </Box>

    {/* Allocated Table */}
    {tab === "allocated" && (
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.75)",
          borderRadius: 3,
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {[
                "ID",
                "Name",
                "Roll No",
                "CGPA",
                "Year",
                "Score",
                "Faculty",        
                "Department",
                "Building",
                "Floor",
                "Room",
                "Expiry Date",
                "Actions",
              ].map((head) => (
                <TableCell key={head} sx={{ color: "#063a70", fontWeight: "bold" }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAllocated.map((s) => (
              <TableRow key={s.student_id} hover>
                <TableCell sx={{ color: "#063a70" }}>{s.student_id}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.name}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.roll_no}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.cgpa}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.year}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.score}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.faculty}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.department}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.building_name}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.floor_number}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.room_number}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>
                  {new Date(s.expiry_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="red"
                    onClick={() => handleDismiss(s)}
                    sx={{ borderRadius: 2, fontWeight: "bold" }}
                  >
                    Dismiss
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}

    {/* Waiting Table */}
    {tab === "waiting" && (
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.75)",
          borderRadius: 3,
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {["ID", "Name", "Roll No", "CGPA", "Year", "Score", "Faculty", "Department", "Added On"].map(
                (head) => (
                  <TableCell key={head} sx={{ color: "#063a70", fontWeight: "bold" }}>
                    {head}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredWaiting.map((s) => (
              <TableRow key={s.student_id} hover>
                <TableCell sx={{ color: "#063a70" }}>{s.student_id}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.name}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.roll_no}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.cgpa}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.year}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.score}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.faculty}</TableCell>
                <TableCell sx={{ color: "#063a70" }}>{s.department}</TableCell>

                <TableCell sx={{ color: "#063a70" }}>
                  {new Date(s.added_on).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Box>
);

  }

  // Fallback
  return <p>Please log in to see this page.</p>;
};

export default SeatAllocationSection;


