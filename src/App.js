// app.js
import React, { useState, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import ProfilePage from "./components/ProfilePage";
import HomePage from "./components/HomePage";
import DocumentUploadForm from "./components/DocumentUploadForm";
import NoticeBoard from "./components/NoticeBoard";
import CanteenSection from "./components/CanteenSection";
import StaffInfoPage from "./components/StaffInfoPage";
import ComplaintFormPage from "./components/ComplaintFormPage";
import SeatAllocationSection from "./components/SeatAllocationSection";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";

/* -----------------------------------------------------
   🏭 Theme Factory Pattern
------------------------------------------------------ */
class ThemeFactory {
  static createAppTheme() {
    return createTheme({
      palette: {
        primary: { main: "#1e40af", light: "#3b82f6", dark: "#1e3a8a", contrastText: "#fff" },
        secondary: { main: "#ea580c", light: "#f97316", dark: "#c2410c", contrastText: "#fff" },
        background: { default: "#fff", paper: "#fff" },
        text: { primary: "#1f2937", secondary: "#6b7280" },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontWeight: 800 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: "none" },
      },
      shape: { borderRadius: 12 },
    });
  }
}

/* -----------------------------------------------------
   🌍 Context Pattern — User Context
------------------------------------------------------ */
const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

/* -----------------------------------------------------
   🛡️ Guard Pattern — Private Route Wrapper
------------------------------------------------------ */
const PrivateRoute = ({ element, user }) => (user ? element : <Navigate to="/" />);

/* -----------------------------------------------------
   🚀 Main App Component
------------------------------------------------------ */
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetUser = (data) => {
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const theme = ThemeFactory.createAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserContext.Provider value={{ user, setUser: handleSetUser }}>
        <Router>
          <Routes>
            <Route path="/" element={<LoginPage setUser={handleSetUser} />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/home" element={<PrivateRoute user={user} element={<HomePage user={user} />} />} />
            <Route path="/documents" element={<PrivateRoute user={user} element={<DocumentUploadForm user={user} />} />} />
            <Route path="/profile" element={<PrivateRoute user={user} element={<ProfilePage user={user} />} />} />
            <Route path="/notices" element={<PrivateRoute user={user} element={<NoticeBoard user={user} />} />} />
            <Route path="/canteen" element={<PrivateRoute user={user} element={<CanteenSection user={user} />} />} />
            <Route path="/staff" element={<PrivateRoute user={user} element={<StaffInfoPage />} />} />
            <Route path="/complaints" element={<PrivateRoute user={user} element={<ComplaintFormPage user={user} />} />} />
            <Route path="/seat-allocation" element={<PrivateRoute user={user} element={<SeatAllocationSection user={user} />} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </UserContext.Provider>
    </ThemeProvider>
  );
}

export default App;

