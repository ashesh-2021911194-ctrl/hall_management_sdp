import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Material UI Components
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
} from "@mui/material";


const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [year, setYear] = useState("");
  const [meritRank, setMeritRank] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, present_address: presentAddress, cgpa: cgpa || null,
  year: year || null,
  merit_rank: meritRank || null,faculty,
  department, }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      alert("Account created!");
      navigate("/");
    } catch (err) {
      alert("Error creating account");
      console.error(err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 6 }}>
        <Typography variant="h5" mb={2}>Create Account</Typography>

        <form onSubmit={handleSignup}>
          <TextField
            label="DU Institutional Email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

            <TextField
              label="Full Name"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextField
              label="Present Address"
              fullWidth
              margin="normal"
              value={presentAddress}
              onChange={(e) => setPresentAddress(e.target.value)}
              required
            />

            <TextField
  label="CGPA"
  type="number"
  inputProps={{ step: "0.01", min: 0, max: 4 }}
  fullWidth
  margin="normal"
  value={cgpa}
  onChange={(e) => setCgpa(e.target.value)}
/>

<TextField
  label="Year"
  type="number"
  fullWidth
  margin="normal"
  value={year}
  onChange={(e) => setYear(e.target.value)}
/>

<TextField
  label="Merit Rank"
  type="number"
  fullWidth
  margin="normal"
  value={meritRank}
  onChange={(e) => setMeritRank(e.target.value)}
/>

<TextField
  label="Faculty"
  fullWidth
  margin="normal"
  value={faculty}
  onChange={(e) => setFaculty(e.target.value)}
  required
/>

<TextField
  label="Department"
  fullWidth
  margin="normal"
  value={department}
  onChange={(e) => setDepartment(e.target.value)}
  required
/>



          <TextField
            type="password"
            label="Password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <TextField
            type="password"
            label="Confirm Password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Sign Up
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default SignupPage;
