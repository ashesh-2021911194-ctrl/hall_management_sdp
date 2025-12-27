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

  static async createStudent({ name, roll_no, email, password, present_address, cgpa,
  year,
  merit_rank, faculty, department }) {
  return pool.query(
    `INSERT INTO all_students
     (name, roll_no, email, password, present_address, cgpa, year, merit_rank, faculty, department)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      name,
      roll_no,
      email,
      password,
      present_address,
      cgpa,
      year,
      merit_rank,
      faculty, department
    ]
  );
}

static async checkExisting(email, roll_no) {
  return pool.query(
    `SELECT * FROM all_students WHERE email = $1 OR roll_no = $2`,
    [email, roll_no]
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

router.post("/signup", async (req, res) => {
  const { email, password, name, present_address, cgpa, year, merit_rank, faculty,
  department } = req.body;


  try {
    // Check email format
    const emailRegex = /^[a-z]+-[0-9]{8,10}@[a-z]{2,4}\.du\.ac\.bd$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid institutional email format" });
    }

    // Extract roll (name may be provided by user; fallback to email-derived)
    const roll = email.split("-")[1].split("@")[0];
    const finalName = name && name.trim().length > 0 ? name.trim() : email.split("-")[0];

    // Check existing user
    const exists = await AuthRepository.checkExisting(email, roll);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Account already exists" });
    }

    // Insert into DB
    const result = await AuthRepository.createStudent({
      name: finalName,
      roll_no: roll,
      email,
      password,
      present_address: present_address || null,
      cgpa: cgpa || null,
  year: year || null,
  merit_rank: merit_rank || null,faculty,
  department
    });

    res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
      role: "student"
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});


module.exports = router;

