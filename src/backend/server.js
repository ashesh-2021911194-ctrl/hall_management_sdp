// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

// Route modules
const studentRoutes = require("./routes/students");
const roomRoutes = require("./routes/rooms");
const authRoutes = require("./routes/auth");
const authorityRoutes = require("./routes/authority");

/* -----------------------------------------------------
   ⚙️ Facade Pattern — Unified App Configuration
------------------------------------------------------ */
class AppConfig {
  static corsOptions = {
    origin: "http://localhost:3000",
    credentials: true,
  };

  static initMiddlewares(app) {
    app.use(cors(AppConfig.corsOptions));
    app.use(express.json());
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  }

  static registerRoutes(app) {
    app.use("/api/admin/students", studentRoutes);
    app.use("/api/admin/rooms", roomRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/admin", authorityRoutes);
    app.use("/api/authority", authorityRoutes);
  }
}

/* -----------------------------------------------------
   🏗️ Singleton + Template Pattern — App Initialization
------------------------------------------------------ */
class Server {
  constructor() {
    if (!Server.instance) {
      this.app = express();
      AppConfig.initMiddlewares(this.app);
      AppConfig.registerRoutes(this.app);
      Server.instance = this;
    }
    return Server.instance;
  }

  start(port = 5000) {
    this.app.listen(port, () => {
      //console.log(`✅ Server running on http://localhost:${port}`);
      console.log(`✅ Server running `);
    });
  }
}

// 🚀 Start server
const server = new Server();
server.start(5000);

module.exports = server;



