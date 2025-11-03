import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Paper,
  Grid,
} from "@mui/material";

/* =========================================================
   🏭 FACTORY PATTERN — Centralized endpoint creation
   Keeps API URLs consistent and maintainable
   ========================================================= */
const StudentApiFactory = {
  base: "http://localhost:5000/api/admin/students",
  seatUrl: (id) => `${StudentApiFactory.base}/my-seat/${id}`,
  applyUrl: (id) => `${StudentApiFactory.base}/apply/${id}`,
  withdrawUrl: (id) => `${StudentApiFactory.base}/withdraw/${id}`,
};

/* =========================================================
   🎯 STRATEGY PATTERN — Extract Student ID flexibly
   Multiple strategies to handle different shapes of user objects
   ========================================================= */
const IdExtractorStrategies = [
  (obj) => obj?.allStudentId,
  (obj) => obj?.all_student_id,
  (obj) => obj?.studentId,
  (obj) => obj?.student_id,
  (obj) => obj?.id,
];

const extractStudentId = (user) => {
  let cur = user;
  for (let depth = 0; depth < 6 && cur; depth++) {
    for (const strategy of IdExtractorStrategies) {
      const id = strategy(cur);
      if (id) return id;
    }
    cur = cur.user;
  }
  // fallback to localStorage
  try {
    const saved = localStorage.getItem("user");
    if (saved) return extractStudentId(JSON.parse(saved));
  } catch (err) {
    console.error("Error reading from localStorage:", err);
  }
  return null;
};

/* =========================================================
   🧩 TEMPLATE METHOD PATTERN — Custom data fetching hook
   Provides consistent data lifecycle (loading, success, error)
   ========================================================= */
const useSeatData = (studentId) => {
  const [seat, setSeat] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSeat = useCallback(async () => {
    if (!studentId) {
      setSeat({ hasSeat: false });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(StudentApiFactory.seatUrl(studentId));
      if (!res.ok) {
        setSeat({ hasSeat: false });
        return;
      }
      const data = await res.json();
      setSeat(data);
    } catch (err) {
      console.error("Error fetching seat:", err);
      setSeat({ hasSeat: false });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSeat();
  }, [fetchSeat]);

  return { seat, setSeat, loading };
};

/* =========================================================
   ⚙️ COMMAND PATTERN — Encapsulate actions
   ApplyCommand & WithdrawCommand make UI logic modular
   ========================================================= */
const ApplyCommand = async (studentId, files, setSeat) => {
  if (!studentId) return alert("Missing student id.");
  if (!files.resultCard || !files.hallCard)
    return alert("Please select both PDF files.");

  const formData = new FormData();
  formData.append("resultCard", files.resultCard);
  formData.append("hallCard", files.hallCard);

  try {
    const res = await fetch(StudentApiFactory.applyUrl(studentId), {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || data?.message);
    alert(data?.message || "Application submitted!");
    setSeat(data.seat ? { hasSeat: true, seat: data.seat } : { hasSeat: false });
  } catch (err) {
    console.error("Error applying for seat:", err);
    alert("Network error: " + err.message);
  }
};

const WithdrawCommand = async (studentId, setSeat) => {
  if (!studentId) return alert("Missing student id.");
  try {
    const res = await fetch(StudentApiFactory.withdrawUrl(studentId), {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || data?.message);
    alert(data?.message || "Seat withdrawn!");
    setSeat({ hasSeat: false });
  } catch (err) {
    console.error("Error withdrawing seat:", err);
    alert("Network error: " + err.message);
  }
};

/* =========================================================
   👁️ OBSERVER PATTERN — Reactively update on state changes
   React’s state + effect hooks act as reactive observers
   ========================================================= */
export default function StudentSeat({ user }) {
  const studentId = extractStudentId(user);
  const { seat, setSeat, loading } = useSeatData(studentId);
  const [files, setFiles] = useState({ resultCard: null, hallCard: null });

  console.log("DEBUG → studentId:", studentId);
  console.log("DEBUG → seat:", seat);

  if (loading) return <Typography>Loading seat info...</Typography>;

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        bgcolor: "white",
      }}
    >
      {/* ======= Dark Blue Half + Circles ======= */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "50%",
          bgcolor: "#0B3D91",
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

      {/* ======= Content ======= */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          pt: 12,
          px: 2,
        }}
      >
        {/* ======= Seat Details ======= */}
        <Card
          sx={{
            width: "100%",
            maxWidth: 500,
            p: 3,
            borderRadius: 3,
            boxShadow: 3,
            bgcolor: "white",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Seat Details
            </Typography>
            {seat?.hasSeat ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>
                    <b>Building:</b> {seat.seat.building_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <b>Floor:</b> {seat.seat.floor_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <b>Room:</b> {seat.seat.room_number}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <b>Expiry:</b>{" "}
                    {new Date(seat.seat.expiry_date).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    sx={{ mt: 1 }}
                    onClick={() => WithdrawCommand(studentId, setSeat)}
                  >
                    Withdraw Seat
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Typography>No seat allocated yet.</Typography>
            )}
          </CardContent>
        </Card>

        {/* ======= Apply Form ======= */}
        <Paper
          sx={{
            p: 3,
            width: "100%",
            maxWidth: 500,
            borderRadius: 3,
            boxShadow: 3,
            bgcolor: "white",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Apply for a Seat
          </Typography>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              ApplyCommand(studentId, files, setSeat);
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Upload Result Card
              </Typography>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    resultCard: e.target.files[0],
                  }))
                }
                required
              />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Upload Hall Card
              </Typography>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    hallCard: e.target.files[0],
                  }))
                }
                required
              />
            </Box>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
            >
              Apply for Seat
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

