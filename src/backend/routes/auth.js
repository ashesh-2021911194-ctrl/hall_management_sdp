// routes/auth.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

/* -----------------------------------------------------
   🧱 Repository Pattern — Database abstraction layer
------------------------------------------------------ */
class AuthRepository {
  static async getAuthorityByCredentials(username, password) {
    return pool.query(
      `SELECT * FROM authority WHERE username = $1 AND password = $2`,
      [username, password]
    );
  }

  static async getStudentByCredentials(rollNo, password) {
    return pool.query(
      `SELECT * FROM all_students WHERE roll_no = $1 AND password = $2`,
      [rollNo, password]
    );
  }
}

/* -----------------------------------------------------
   🧩 Template Method Pattern — Base login class
------------------------------------------------------ */
class LoginTemplate {
  async login(username, password) {
    try {
      const result = await this.verifyCredentials(username, password);
      if (result.rows.length === 0) {
        return { status: 401, data: { error: "Invalid credentials" } };
      }
      return { status: 200, data: this.formatResponse(result.rows[0]) };
    } catch (err) {
      console.error("Login error:", err);
      return { status: 500, data: { error: "Database error" } };
    }
  }
}

/* -----------------------------------------------------
   ⚙️ Strategy Implementations for Each Role
------------------------------------------------------ */
class AuthorityLoginStrategy extends LoginTemplate {
  async verifyCredentials(username, password) {
    return AuthRepository.getAuthorityByCredentials(username, password);
  }

  formatResponse(user) {
    return {
      message: "Authority login successful",
      user,
      role: "authority",
    };
  }
}

class StudentLoginStrategy extends LoginTemplate {
  async verifyCredentials(username, password) {
    return AuthRepository.getStudentByCredentials(username, password);
  }

  formatResponse(user) {
    return {
      message: "Student login successful",
      user: {
        allStudentId: user.all_student_id,
        name: user.name,
        roll_no: user.roll_no,
        cgpa: user.cgpa,
        year: user.year,
        merit_rank: user.merit_rank,
      },
      role: "student",
    };
  }
}

/* -----------------------------------------------------
   🏭 Factory Pattern — Selects strategy by role
------------------------------------------------------ */
class LoginFactory {
  static getStrategy(role) {
    switch (role) {
      case "authority":
        return new AuthorityLoginStrategy();
      case "student":
        return new StudentLoginStrategy();
      default:
        throw new Error("Invalid role");
    }
  }
}

/* -----------------------------------------------------
   🚀 Route Layer — Clean, minimal & scalable
------------------------------------------------------ */
router.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const strategy = LoginFactory.getStrategy(role);
    const result = await strategy.login(username, password);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

