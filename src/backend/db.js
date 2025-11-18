// db.js
const { Pool } = require("pg");

/* -----------------------------------------------------
   🎯 Strategy Pattern — Environment-specific configs
------------------------------------------------------ */
const dbConfigs = {
  development: {
    user: "postgres",
    host: "localhost",
    database: "du_hall_hub",
    password: "Ashesh_127",
    port: 5432,
  },
  production: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false },
  },
};

/* -----------------------------------------------------
   🏭 Factory Pattern — Creates Pool based on environment
------------------------------------------------------ */
class DatabaseFactory {
  static createPool(env = "development") {
    const config = dbConfigs[env] || dbConfigs.development;
    console.log(`🏭 DatabaseFactory: Creating pool for '${env}' environment`);
    return new Pool(config);
  }
}

/* -----------------------------------------------------
   🔁 Singleton Pattern — One shared DB instance
------------------------------------------------------ */
class Database {
  constructor() {
    if (!Database.instance) {
      console.log("🆕 Singleton: No existing instance found. Creating new DB connection pool...");
      const env = process.env.NODE_ENV || "development";
      this.pool = DatabaseFactory.createPool(env);
      Database.instance = this;
      console.log("✅ Singleton: Database instance created successfully!");
    } else {
      console.log("♻️ Singleton: Reusing existing DB connection pool instance.");
    }
    return Database.instance;
  }

  getPool() {
    return this.pool;
  }
}

/* -----------------------------------------------------
   🌐 Export the single shared pool instance
------------------------------------------------------ */
const dbInstance = new Database().getPool();
module.exports = dbInstance;


