import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Badge,
} from "@mui/material";
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneIcon from '@mui/icons-material/Done';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse } from '@mui/material';

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
   🧭 TEMPLATE METHOD — RequestTemplate
   Centralizes fetch/json/error handling for frontend API calls
   so commands and services can reuse consistent behavior.
   ========================================================= */
const RequestTemplate = {
  async request(url, options = {}) {
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore non-json */ }
    if (!res.ok) {
      const err = new Error(data?.error || data?.message || 'Request failed');
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }
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

/* =========================================================
   ⚙️ COMMAND PATTERN — WithdrawCommand
   Uses RequestTemplate for API interaction and exposes
   an execute() method so the UI can treat it as a command.
   ========================================================= */
const WithdrawCommand = {
  async execute(studentId, setSeat) {
    if (!studentId) return alert("Missing student id.");
    try {
      const data = await RequestTemplate.request(StudentApiFactory.withdrawUrl(studentId), { method: 'POST' });
      alert(data?.message || "Seat withdrawn!");
      setSeat({ hasSeat: false });
    } catch (err) {
      console.error("Error withdrawing seat:", err);
      if (err.status) return alert(err.message);
      alert("Network error: " + err.message);
    }
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
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(true);

  /* =========================================================
     👁️ OBSERVER PATTERN — NotificationService (singleton)
     - subscribe(studentId, cb) -> returns unsubscribe fn
     - markRead(studentId, notificationId)
     - refresh(studentId)
     Internal cache keeps latest notifications per studentId and
     notifies subscribers on updates.
     ========================================================= */
  const NotificationService = React.useMemo(() => {
    const subscribers = new Map(); // studentId -> Set(callback)
    const cache = new Map(); // studentId -> notifications[]

    const notify = (studentId) => {
      const subs = subscribers.get(studentId);
      if (!subs) return;
      const payload = cache.get(studentId) || [];
      subs.forEach((cb) => {
        try { cb(payload); } catch (e) { console.error('subscriber callback error', e); }
      });
    };

    const fetchNotifications = async (studentId) => {
      if (!studentId) return [];
      try {
        const data = await RequestTemplate.request(`${StudentApiFactory.base}/${studentId}/notifications`);
        cache.set(studentId, data);
        notify(studentId);
        return data;
      } catch (err) {
        console.error('NotificationService.fetchNotifications error', err);
        cache.set(studentId, []);
        notify(studentId);
        return [];
      }
    };

    return {
      subscribe(studentId, cb) {
        if (!subscribers.has(studentId)) subscribers.set(studentId, new Set());
        subscribers.get(studentId).add(cb);
        // deliver cached immediately if available
        if (cache.has(studentId)) cb(cache.get(studentId));
        else fetchNotifications(studentId).catch(() => {});
        return () => {
          const set = subscribers.get(studentId);
          if (set) set.delete(cb);
        };
      },

      async markRead(studentId, notificationId) {
        if (!studentId) throw new Error('Missing studentId');
        try {
          await RequestTemplate.request(`${StudentApiFactory.base}/${studentId}/notifications/${notificationId}/read`, { method: 'POST' });
          // optimistic update in cache
          const list = (cache.get(studentId) || []).map(n => n.id === notificationId ? { ...n, read: true } : n);
          cache.set(studentId, list);
          notify(studentId);
          return list;
        } catch (err) {
          console.error('NotificationService.markRead error', err);
          throw err;
        }
      },

      refresh(studentId) { return fetchNotifications(studentId); }
    };
  }, []);

  // Subscribe to notifications via NotificationService (Observer)
  useEffect(() => {
    setNotifLoading(true);
    if (!studentId) {
      setNotifications([]);
      setNotifLoading(false);
      return;
    }

    const unsub = NotificationService.subscribe(studentId, (data) => {
      setNotifications(data);
      setNotifLoading(false);
    });

    return () => { unsub(); };
  }, [studentId, NotificationService]);

  const markNotificationRead = async (notificationId) => {
    if (!studentId) return;
    try {
      await NotificationService.markRead(studentId, notificationId);
      // NotificationService updates subscribers (including this component)
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

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
        {/* ======= Notifications ======= */}
        <Paper sx={{ width: "100%", maxWidth: 500, p: 0, borderRadius: 3, boxShadow: 3, bgcolor: "white", overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Notifications</Typography>
              <Badge color="error" badgeContent={notifications.filter(n => !n.read).length}>
                <NotificationsIcon />
              </Badge>
            </Box>
            <IconButton
              aria-label={notifOpen ? 'collapse notifications' : 'expand notifications'}
              onClick={() => setNotifOpen(open => !open)}
              size="small"
              sx={{ transform: notifOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={notifOpen} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              {notifLoading ? (
                <Typography>Loading notifications...</Typography>
              ) : notifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No notifications</Typography>
              ) : (
                <List dense>
                  {notifications.map((n) => (
                    <React.Fragment key={n.id}>
                      <ListItem alignItems="flex-start" sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={n.message}
                          secondary={new Date(n.date).toLocaleString()}
                          sx={{ opacity: n.read ? 0.6 : 1 }}
                        />
                        <ListItemSecondaryAction>
                          {!n.read && (
                            <IconButton edge="end" size="small" onClick={() => markNotificationRead(n.id)}>
                              <DoneIcon fontSize="small" />
                            </IconButton>
                          )}
                          {n.link && (
                            <IconButton edge="end" size="small" onClick={() => window.open(n.link, '_blank')}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </Collapse>
        </Paper>

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
                    onClick={() => WithdrawCommand.execute(studentId, setSeat)}
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

