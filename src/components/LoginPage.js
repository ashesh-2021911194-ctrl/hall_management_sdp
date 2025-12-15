// src/pages/LoginPage.js
import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  TextField,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// =============================
// Styled Components
// =============================
const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  padding: theme.spacing(1.5, 4),
  fontSize: "1.05rem",
  borderRadius: "30px",
  textTransform: "none",
  transition: "all 0.3s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: theme.shadows[4] },
}));

// =============================
// Subcomponent: LoginForm
// =============================
const LoginForm = ({ role, username, password, setRole, setUsername, setPassword, handleLogin }) => (
  <Box
    component="form"
    onSubmit={handleLogin}
    sx={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      mt: 1,
    }}
  >
    <TextField
      select
      label="Role"
      value={role}
      onChange={(e) => setRole(e.target.value)}
      margin="normal"
      fullWidth
    >
      <MenuItem value="student">Student</MenuItem>
      <MenuItem value="authority">Authority</MenuItem>
    </TextField>

    <TextField
      type="text"
      label={role === "student" ? "Roll No" : "Username"}
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      margin="normal"
      fullWidth
      required
    />

    <TextField
      type="password"
      label="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      margin="normal"
      fullWidth
      required
    />

    <StyledButton type="submit" variant="contained" color="primary" fullWidth>
      Login
    </StyledButton>
  </Box>
);

// =============================
// Main Component: LoginPage
// =============================
const LoginPage = ({ setUser }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const navigate = useNavigate();

  // -----------------------------
  // Handle Login Logic (Command Pattern)
  // -----------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert("Please enter valid credentials");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await res.json();

      if (!res.ok || !data.role) {
        alert(data.error || "Invalid username/password");
        return;
      }

      const loggedInUser = { role: data.role, ...data.user };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong");
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          //bgcolor: "background.default",
          px: 2,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: "20px",
            backgroundColor: "rgba(255,255,255,0.95)",
            width: "100%",
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{
              mb: 3,
              color: "#0a3561ff",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Welcome to DU HallHub
          </Typography>

          <LoginForm
            role={role}
            username={username}
            password={password}
            setRole={setRole}
            setUsername={setUsername}
            setPassword={setPassword}
            handleLogin={handleLogin}
          />

          <StyledButton
            variant="outlined"
            color="primary"
            onClick={() => navigate("/signup")}
            fullWidth
          >
            Sign Up
          </StyledButton>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;




