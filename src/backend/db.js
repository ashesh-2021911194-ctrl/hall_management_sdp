// src/backend/db.js
require('dotenv').config();
console.log('DB_PASS loaded from .env:', process.env.DB_PASS);
const { Pool } = require("pg");

/* -----------------------------------------------------
   🎯 Production-only configuration (Render PostgreSQL)
------------------------------------------------------ */
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};



/* -----------------------------------------------------
   🏭 Factory Pattern — Creates Pool
------------------------------------------------------ */
class DatabaseFactory {
  static createPool() {
    console.log("🏭 DatabaseFactory: Creating pool for Render PostgreSQL");
    return new Pool(dbConfig);
  }
}

/* -----------------------------------------------------
   🔁 Singleton Pattern — One shared DB instance
------------------------------------------------------ */
class Database {
  constructor() {
    if (!Database.instance) {
      console.log("🆕 Singleton: Creating new DB connection pool...");
      this.pool = DatabaseFactory.createPool();
      Database.instance = this;
      console.log("✅ Database instance created successfully!");
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



