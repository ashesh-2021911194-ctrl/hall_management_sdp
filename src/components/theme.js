// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1e3a8a",
      light: "#60a5fa",
      dark: "#1e40af",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#38bdf8",
      light: "#7dd3fc",
      dark: "#0ea5e9",
      contrastText: "#ffffff",
    },
    background: {
      default: "#eaf3ff",
      paper: "rgba(255,255,255,0.45)",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
  },

  shape: {
    borderRadius: 22, // smoother & rounder like the UI design
  },

  typography: {
    fontFamily: '"Inter","Poppins","Roboto","Arial",sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },

  components: {
    MuiCssBaseline: {
  styleOverrides: `
    html {
      min-height: 100%;
      background: linear-gradient(
        180deg,
        #bfdbfe 0%,
        #93c5fd 35%,
        #e0f2fe 70%,
        #ffffff 100%
      );
      background-attachment: fixed;
    }

    body {
      position: relative;
      min-height: 100vh;
      background: transparent;
      z-index: 0;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;

      background-image: url("/assets/19697.jpg");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 1440px 980px;

      opacity: 0.05;   /* slightly higher for visibility */
      pointer-events: none;

      z-index: 0;
    }
  `,
},




    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(18px)",
          background: "rgba(255, 255, 255, 0.55)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.3)",
          boxShadow:
            "0px 8px 20px rgba(30, 58, 138, 0.12), 0px 6px 12px rgba(0,0,0,0.05)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 22,
          padding: 4,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(232,243,255,0.4))",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow:
            "0 12px 28px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)",
          transition: "0.3s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow:
              "0 20px 35px rgba(0,0,0,0.15), 0 10px 12px rgba(0,0,0,0.04)",
          },
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          padding: "12px 22px",
          borderRadius: 30,
          fontWeight: 600,
          textTransform: "none",
          color: "#ffffff",
          boxShadow: "0 4px 15px rgba(30, 58, 138, 0.2)",
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          boxShadow: "0px 6px 20px rgba(59,130,246,0.25)",
          "&:hover": {
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            transform: "translateY(-2px)",
          },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          "& .MuiOutlinedInput-root": {
            borderRadius: 16,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            "& fieldset": {
              border: "1px solid rgba(255,255,255,0.4)",
            },
            "&:hover fieldset": {
              borderColor: "#60a5fa",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#2563eb",
              boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.15)",
            },
          },
        },
      },
    },
  },
});

export default theme;










/*import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e40af',
      light: '#3b82f6',
      dark: '#1e3a8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ea580c',
      light: '#f97316',
      dark: '#c2410c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
      lineHeight: 1.6,
    },
    subtitle2: {
      fontWeight: 500,
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.3px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1e3a8a 0%, #172555 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-4px)',
            border: '1px solid rgba(30, 64, 175, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        },
        elevation1: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #1e40af 0%, #1e3a8a 100%)',
          boxShadow: '0 4px 20px rgba(30, 64, 175, 0.15)',
          borderBottom: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.3s ease',
            '&:hover fieldset': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused fieldset': {
              boxShadow: '0 0 0 3px rgba(30, 64, 175, 0.1)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
        filled: {
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
          border: '1px solid rgba(30, 64, 175, 0.2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
          },
        },
      },
    },
  },
});

export default theme;*/
 