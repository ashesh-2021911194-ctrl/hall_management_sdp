import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Container,
  AppBar,
  Toolbar,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import {
  FaHotel,
  FaClipboardList,
  FaUtensils,
  FaFileUpload,
  FaExclamationCircle,
  FaUserTie,
} from "react-icons/fa";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";

// ---------------------------------------------
// 🔶 Singleton + Facade Pattern: NotificationService
// ---------------------------------------------
class NotificationService {
  static instance;

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async fetchNotifications(studentId) {
    const res = await fetch(`/students/${studentId}/notifications`);
    const data = await res.json();
    return data.map((n) => ({
      id: n.notification_id,
      type: n.type,
      message: n.message,
      date: new Date(n.created_at).toLocaleDateString(),
      read: n.read,
      link: n.link,
    }));
  }

  async markAsRead(studentId, notificationId) {
    await fetch(`/students/${studentId}/notifications/${notificationId}/read`, {
      method: "POST",
    });
  }
}

// -----------------------------------------------------
// 🔷 Strategy Pattern: Role-based Feature Strategies
// -----------------------------------------------------
class FeatureStrategy {
  getFeatures() {
    throw new Error("Method not implemented");
  }
}

class StudentFeatureStrategy extends FeatureStrategy {
  getFeatures() {
    return [
      {
        id: 1,
        title: "Seat Allocation",
        description: "View your room allocation and details.",
        icon: <FaHotel size={28} />,
        link: "/seat-allocation",
        color: "#3B82F6",
      },
      {
        id: 2,
        title: "Notice Board",
        description: "Stay updated with the latest hall notices.",
        icon: <FaClipboardList size={28} />,
        link: "/notices",
        color: "#6366F1",
      },
      {
        id: 3,
        title: "Canteen Menu",
        description: "Check today's canteen menu and reviews.",
        icon: <FaUtensils size={28} />,
        link: "/canteen",
        color: "#06B6D4",
      },
      {
        id: 4,
        title: "Document Upload",
        description: "Upload and manage your documents.",
        icon: <FaFileUpload size={28} />,
        link: "/documents",
        color: "#A21CAF",
      },
      {
        id: 5,
        title: "Complaints",
        description: "Submit and track your complaints.",
        icon: <FaExclamationCircle size={28} />,
        link: "/complaints",
        color: "#F59E42",
      },
      {
        id: 6,
        title: "Staff Info",
        description: "View hall staff and authority details.",
        icon: <FaUserTie size={28} />,
        link: "/staff",
        color: "#2563EB",
      },
    ];
  }
}

class AuthorityFeatureStrategy extends FeatureStrategy {
  getFeatures() {
    return [
      {
        id: 1,
        title: "Smart Seat Allocation",
        description: "Allocate and manage student rooms.",
        icon: <FaHotel size={28} />,
        link: "/seat-allocation",
        color: "#3B82F6",
      },
      {
        id: 2,
        title: "Notice Management",
        description: "Create and manage hall notices.",
        icon: <FaClipboardList size={28} />,
        link: "/notices",
        color: "#6366F1",
      },
      {
        id: 3,
        title: "Live Canteen Menu",
        description: "Update and review canteen menu.",
        icon: <FaUtensils size={28} />,
        link: "/canteen",
        color: "#06B6D4",
      },
      {
        id: 4,
        title: "Document Management",
        description: "Review and manage student documents.",
        icon: <FaFileUpload size={28} />,
        link: "/documents",
        color: "#A21CAF",
      },
      {
        id: 5,
        title: "Complaints Management",
        description: "Handle and resolve student complaints.",
        icon: <FaExclamationCircle size={28} />,
        link: "/complaints",
        color: "#F59E42",
      },
      {
        id: 6,
        title: "Verified Hall Staff",
        description: "Manage and verify hall staff.",
        icon: <FaUserTie size={28} />,
        link: "/staff",
        color: "#2563EB",
      },
    ];
  }
}

// -----------------------------------------------------------
// 🔸 Factory Pattern: FeatureFactory (creates card components)
// -----------------------------------------------------------
const FeatureFactory = ({ feature }) => (
  // Grid item set to md=4 => 12/4 = 3 cards per row on md and larger screens
  <Grid item key={feature.id} xs={12} sm={6} md={4}>
    <Paper
      elevation={3}
      sx={{
        p: 3,
        textAlign: "center",
        borderRadius: 3,
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": { transform: "translateY(-6px)", boxShadow: 6 },
        // Make each card stretch to the same height and layout content vertically
        height: 260,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(feature.color, 0.1),
          color: feature.color,
        }}
      >
        {feature.icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {feature.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {feature.description}
      </Typography>
      <Button
        component={Link}
        to={feature.link}
        variant="contained"
        size="small"
        sx={{ mt: 1 }}
      >
        Open
      </Button>
    </Paper>
  </Grid>
);

// -----------------------------------------------------------
// 🔹 Observer Pattern: Notifications state updates via hooks
// -----------------------------------------------------------

const HomePage = ({ user }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(user?.role || "student");
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // Observe & react to student role change
    if (userRole === "student" && user?.allStudentId) {
      notificationService
        .fetchNotifications(user.allStudentId)
        .then((data) => setNotifications(data))
        .catch((err) =>
          console.error("Failed to fetch notifications", err)
        );
    }
  }, [userRole, user?.allStudentId]);

  const handleNotificationClick = (e) => setAnchorEl(e.currentTarget);
  const handleNotificationClose = () => setAnchorEl(null);

  const handleNotificationItemClick = async (notification) => {
    try {
      await notificationService.markAsRead(user.allStudentId, notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setAnchorEl(null);
      if (notification.link) window.location.href = notification.link;
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Select correct feature strategy
  const featureStrategy =
    userRole === "student"
      ? new StudentFeatureStrategy()
      : new AuthorityFeatureStrategy();
  const features = featureStrategy.getFeatures();

  return (
    <Box sx={{ bgcolor: theme.palette.primary, minHeight: "100vh" }}>
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
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ bgcolor: "white" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#14054bff" }}>
            DU HallHub
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            

            {/* Navigation Links */}
            <Button component={Link} to="/home" sx={{ color: "white" }}>
              Home
            </Button>
            <Button component={Link} to="/search" sx={{ color: "white" }}>
              Search
            </Button>

            {/* Notification Bell */}
            <IconButton color="inherit" onClick={handleNotificationClick}>
              <Badge
                badgeContent={notifications.filter((n) => !n.read).length}
                color="error"
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleNotificationClose}
              PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
            >
              {notifications.length === 0 ? (
                <MenuItem disabled>No notifications</MenuItem>
              ) : (
                notifications.map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => handleNotificationItemClick(notification)}
                    sx={{
                      bgcolor: notification.read
                        ? "inherit"
                        : alpha(theme.palette.primary.main, 0.08),
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.date}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>

            {userRole === "student" && (
              <IconButton
                onClick={() => navigate("/profile", { state: { user } })}
                color="inherit"
              >
                <Avatar>
                  <AccountCircleIcon />
                </Avatar>
              </IconButton>
            )}

            <IconButton color="red">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section (neutral background) */}
      <Box
        sx={{
          width: "100%",
          minHeight: 320,
          background: theme.palette.primary,
          color: theme.palette.text.primary,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          pb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: theme.palette.text.primary }}>
          Welcome to DU HallHub
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, color: theme.palette.text.secondary }}>
          Your centralized system for hall management, canteen updates, notices
          & more.
        </Typography>
        <Button variant="contained" color="primary">
          Read More
        </Button>
      </Box>

      {/* Main Features Section */}
      <Container maxWidth="lg" sx={{ mt: -10 }}>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{ p: 4, borderRadius: 4, bgcolor: 'transparent', boxShadow: 'none' }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 3,
                  color: "#1E293B",
                  textAlign: "center",
                }}
              >
                Features
              </Typography>
              <Grid container spacing={4} justifyContent="center" alignItems="stretch">
                {features.map((feature) => (
                  <FeatureFactory key={feature.id} feature={feature} />
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
