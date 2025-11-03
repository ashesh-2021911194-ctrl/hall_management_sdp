// ✅ Login route
/*router.post("/login", async (req, res) => {
  const { username, password, role } = req.body; // role = "student" or "authority"

  try {
    if (role === "authority") {
      const result = await pool.query(
        `SELECT * FROM authority WHERE username = $1 AND password = $2`,
        [username, password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      return res.json({
        message: "Authority login successful",
        user: result.rows[0],
        role: "authority"
      });
    } else if (role === "student") {
      const result = await pool.query(
        `SELECT * FROM all_students WHERE roll_no = $1 AND password = $2`,
        [username, password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      return res.json({
  message: "Student login successful",
  user: {
    allStudentId: result.rows[0].all_student_id, // ✅ normalized name
    name: result.rows[0].name,
    roll_no: result.rows[0].roll_no,
    cgpa: result.rows[0].cgpa,
    year: result.rows[0].year,
    merit_rank: result.rows[0].merit_rank,
  },
  role: "student",
});

    } else {
      return res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;*/