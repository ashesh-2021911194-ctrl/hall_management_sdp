// src/pages/ProfilePage.js
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useLocation } from "react-router-dom";

// =============================
// Subcomponent: ProfileDetails
// =============================
const ProfileDetails = ({ user }) => (
  <Stack spacing={1.2} alignItems="center">
    {user.role === "student" && (
      <>
        <Typography><b>Roll No:</b> {user.roll_no}</Typography>
        <Typography><b>CGPA:</b> {user.cgpa}</Typography>
        <Typography><b>Year:</b> {user.year}</Typography>
        <Typography><b>Merit Rank:</b> {user.merit_rank}</Typography>
      </>
    )}
    {user.role === "authority" && (
      <Typography color="text.secondary">
        You have administrative privileges.
      </Typography>
    )}
  </Stack>
);

// =============================
// Main Component: ProfilePage
// =============================
const ProfilePage = () => {
  const theme = useTheme();
  const location = useLocation();
  const user = location.state?.user || JSON.parse(localStorage.getItem("user"));

  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: theme.palette.background.default,
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 5,
          width: "100%",
          maxWidth: 480,
          borderRadius: 4,
          textAlign: "center",
          bgcolor: "rgba(255,255,255,0.95)",
        }}
      >
        <Avatar
          sx={{
            bgcolor: theme.palette.primary.main,
            width: 100,
            height: 100,
            mx: "auto",
            mb: 2,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          {user.name?.charAt(0)?.toUpperCase()}
        </Avatar>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {user.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {user.role === "student" ? "Student" : "Authority"}
        </Typography>

        <Divider sx={{ my: 2 }} />
        <ProfileDetails user={user} />
      </Paper>
    </Box>
  );
};

export default ProfilePage;

