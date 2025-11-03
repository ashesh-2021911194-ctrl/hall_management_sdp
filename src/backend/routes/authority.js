const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../db"); // adjust if your pool file is elsewhere

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // store directly under backend/uploads/
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

router.get("/applications", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.application_id, a.student_id, s.name AS student_name, s.roll_no, s.cgpa, s.year, s.merit_rank,
        a.result_card, a.hall_card,
        a.result_name, a.result_roll_no, a.result_cgpa, a.result_year, a.result_session,
        a.status, a.submitted_at
      FROM seat_applications a
      JOIN all_students s ON a.student_id = s.all_student_id
      WHERE a.status = 'Pending'
      ORDER BY a.submitted_at ASC
    `);

    const applications = result.rows.map((app) => ({
      ...app,
      result_card: app.result_card ? `/uploads/${path.basename(app.result_card)}` : null,
      hall_card: app.hall_card ? `/uploads/${path.basename(app.hall_card)}` : null,
    }));

    res.json(applications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Database error" });
  }
});


router.post("/applications/:applicationId/approve", async (req, res) => {
  const { applicationId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Get application + student (from all_students)
    const appRes = await client.query(
      `
      SELECT a.application_id, a.student_id AS all_student_id,
             s.name, s.roll_no, s.cgpa, s.year, s.merit_rank
      FROM seat_applications a
      JOIN all_students s ON a.student_id = s.all_student_id
      WHERE a.application_id = $1 AND a.status = 'Pending'
      `,
      [applicationId]
    );

    if (appRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Application not found or already processed" });
    }

    /*const student = appRes.rows[0];
    let score;

if (student.year === 1) {
  // For 1st year: merit rank + year (normalize merit so lower rank = higher score)
  const meritScore = (1 / student.merit_rank) * 100; // normalize merit
  score = (student.year * 25) + (meritScore * 25);
} else {
  // For 2nd, 3rd, 4th years: CGPA + year
  const cgpaScore = (student.cgpa / 4.0) * 50; // normalize CGPA (max 50 points)
  const yearScore = (student.year / 4.0) * 50; // normalize year (max 50 points)
  score = cgpaScore + yearScore;
}
    score = Math.round(score * 100) / 100; // round to 2 decimal places
*/   
    const student = appRes.rows[0];

// Convert all numeric fields properly
const year = parseInt(student.year);
const cgpa = parseFloat(student.cgpa);
const meritRank = parseFloat(student.merit_rank);

let score = 0;

if (year === 1 && meritRank > 0) {
  // 1st year → based on merit
  const meritScore = (1 / meritRank) * 100; // normalize merit
  score = (year * 25) + (meritScore * 25);
} else {
  // 2nd–4th years → based on CGPA + year
  const cgpaScore = (cgpa / 4.0) * 50; // normalize CGPA (max 50)
  const yearScore = (year / 4.0) * 50; // normalize year (max 50)
  score = cgpaScore + yearScore;
}

score = Math.round(score * 100) / 100; // round to 2 decimal places

    // 2️⃣ Ensure student exists in "students" table
    /*let studentId;
    const studentRes = await client.query(
      `SELECT student_id FROM students WHERE roll_no = $1`,
      [student.roll_no]
    );

    if (studentRes.rows.length > 0) {
      studentId = studentRes.rows[0].student_id;
    } else {
      const insertRes = await client.query(
        `INSERT INTO students (name, roll_no, cgpa, year, merit_rank, score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING student_id`,
        [student.name, student.roll_no, student.cgpa, student.year, student.merit_rank, score]
      );
      studentId = insertRes.rows[0].student_id;
    }*/
    let studentId;
const studentRes = await client.query(
  `SELECT student_id FROM students WHERE roll_no = $1`,
  [student.roll_no]
);

if (studentRes.rows.length > 0) {
  // Student already exists → update their info & score
  studentId = studentRes.rows[0].student_id;
  await client.query(
    `UPDATE students
     SET cgpa = $1, year = $2, merit_rank = $3, score = $4
     WHERE student_id = $5`,
    [student.cgpa, student.year, student.merit_rank, score, studentId]
  );
} else {
  // New student → insert
  const insertRes = await client.query(
    `INSERT INTO students (name, roll_no, cgpa, year, merit_rank, score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING student_id`,
    [student.name, student.roll_no, student.cgpa, student.year, student.merit_rank, score]
  );
  studentId = insertRes.rows[0].student_id;
}


    const roomRes = await client.query(
  `
  SELECT r.room_id, r.capacity, r.current_occupancy, f.floor_number, b.building_name
  FROM rooms r
  JOIN floors f ON r.floor_id = f.floor_id
  JOIN buildings b ON f.building_id = b.building_id
  WHERE r.current_occupancy < r.capacity
  ORDER BY
    CASE b.building_name
      WHEN 'Main Building' THEN 1
      WHEN 'Extension 1' THEN 2
      WHEN 'Extension 2' THEN 3
      ELSE 4
    END,
    f.floor_number DESC,
    r.room_number ASC
  LIMIT 1
  `
);


    if (roomRes.rows.length > 0) {
      const room = roomRes.rows[0];

      // Allocate seat
      await client.query(
        `INSERT INTO allocations (student_id, room_id, score, expiry_date, active)
         VALUES ($1, $2, $3, NOW() + interval '4 years', TRUE)`,
        [studentId, room.room_id, score]
      );

      await client.query(
        `UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = $1`,
        [room.room_id]
      );

      await client.query(
        `UPDATE seat_applications SET status = 'Approved' WHERE application_id = $1`,
        [applicationId]
      );

      // ✅ Notification for allocated seat
      await client.query(
        `INSERT INTO notifications (all_student_id, type, message, link)
         VALUES ($1, $2, $3, $4)`,
        [
          student.all_student_id,
          'seat_approval',
          `Your seat has been allocated in ${room.building_name}, Floor ${room.floor_number}, Room ${room.room_number}.`,
          '/seat-allocation'
        ]
      );

      await client.query("COMMIT");
      return res.json({ message: "Seat allocated successfully!" });
    }

    // 4️⃣ No free seat → add to waiting list
    await client.query(
      `INSERT INTO waiting_list (student_id, score, added_on)
       VALUES ($1, $2, NOW())`,
      [studentId, score]
    );

    await client.query(
      `UPDATE seat_applications SET status = 'Approved' WHERE application_id = $1`,
      [applicationId]
    );

    // ✅ Notification for waiting list
    await client.query(
      `INSERT INTO notifications (all_student_id, type, message, link)
       VALUES ($1, $2, $3, $4)`,
      [
        student.all_student_id,
        'waiting_list',
        'No seat was available. You have been added to the waiting list.',
        '/seat-allocation'
      ]
    );

    await client.query("COMMIT");
    res.json({ message: "No free seats. Student added to waiting list." });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error approving application:", err.message);
    res.status(500).json({ error: "Database error: " + err.message });
  } finally {
    client.release();
  }
});  // ✅ closes the approve route properly


// ✅ Reject application
router.post("/applications/:applicationId/reject", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Get student info from all_students via application
    const appRes = await client.query(
      `SELECT a.student_id AS all_student_id
       FROM seat_applications a
       WHERE a.application_id = $1`,
      [req.params.applicationId]
    );

    if (appRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Application not found" });
    }

    const student = appRes.rows[0];

    // 2️⃣ Update application status
    await client.query(
      `UPDATE seat_applications SET status = 'Rejected' WHERE application_id = $1`,
      [req.params.applicationId]
    );

    // 3️⃣ Insert notification
    await client.query(
      `INSERT INTO notifications (all_student_id, type, message, link)
       VALUES ($1, $2, $3, $4)`,
      [
        student.all_student_id,
        'seat_rejection',
        'Your seat application has been rejected by the authority.',
        '/seat-allocation'
      ]
    );

    await client.query("COMMIT");
    res.json({ message: "Application rejected and student notified." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error rejecting application:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

const upload = multer({ storage });
// POST /api/authority/notices (create notice)
router.post("/notices", upload.single("document"), async (req, res) => {
  const {
    title,
    content,
    importance,
    requires_document,
    documentTitle,
    documentDescription,
  } = req.body; // now destructuring title & description too
  const file = req.file;

  try {
    const documentUrl = file ? `/uploads/${file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO notices 
        (title, content, importance, requires_document, document_title, document_description, document_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        content,
        importance || "medium",
        requires_document === "true",
        documentTitle || null,          // insert document_title
        documentDescription || null,    // insert document_description
        documentUrl,
        1, // authority_id = 1
      ]
    );

    res.json(result.rows[0]); // return the new notice
  } catch (err) {
    console.error("Error creating notice:", err);
    res.status(500).json({ error: "Failed to create notice" });
  }
});


// GET /api/authority/notices
router.get("/notices", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM notices ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching notices:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// ✅ Dismiss allocated student seat
router.post("/students/:studentId/dismiss", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Get active allocation + all_student_id
    const allocRes = await client.query(
      `
      SELECT a.allocation_id, a.room_id, r.room_number, f.floor_number, b.building_name,
             s.all_student_id
      FROM allocations a
      JOIN students st ON a.student_id = st.student_id
      JOIN all_students s ON st.roll_no = s.roll_no
      JOIN rooms r ON a.room_id = r.room_id
      JOIN floors f ON r.floor_id = f.floor_id
      JOIN buildings b ON f.building_id = b.building_id
      WHERE a.student_id = $1 AND a.active = TRUE
      `,
      [req.params.studentId]
    );

    if (allocRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No active allocation found for this student." });
    }

    const alloc = allocRes.rows[0];

    // 2️⃣ Mark allocation inactive
    await client.query(
      `UPDATE allocations SET active = FALSE WHERE allocation_id = $1`,
      [alloc.allocation_id]
    );

    // 3️⃣ Decrement room occupancy
    await client.query(
      `UPDATE rooms SET current_occupancy = current_occupancy - 1 WHERE room_id = $1`,
      [alloc.room_id]
    );

    // 4️⃣ Insert notification
    await client.query(
      `INSERT INTO notifications (all_student_id, type, message, link)
       VALUES ($1, $2, $3, $4)`,
      [
        alloc.all_student_id,
        "seat_dismissal",
        `Your seat in ${alloc.building_name}, Floor ${alloc.floor_number}, Room ${alloc.room_number} has been dismissed by authority.`,
        "/seat-allocation",
      ]
    );

    await client.query("COMMIT");
    res.json({ message: "Student seat dismissed successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error dismissing seat:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});


// GET /api/authority/complaints — all complaints
router.get("/complaints", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, s.name AS student_name, s.roll_no
      FROM complaints c
      JOIN students s ON c.student_id = s.student_id
      ORDER BY c.created_at DESC
    `);
    console.log("Authority complaints result:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching complaints:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/authority/complaints/:id/respond — send response to a complaint
router.put("/complaints/:id/respond", async (req, res) => {
  const { id } = req.params;
  const { response, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE complaints
       SET response = $1, status = $2, responded_at = CURRENT_TIMESTAMP
       WHERE complaint_id = $3
       RETURNING *`,
      [response, status || "Resolved", id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error responding to complaint:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// PUT /api/authority/complaints/:id/status — update complaint status
router.put("/complaints/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE complaints
       SET status = $1
       WHERE complaint_id = $2
       RETURNING *`,
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Database error" });
  }
});



// GET all canteen items
router.get("/canteen-menu", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM canteen_items 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching menu:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST - Add new item (Authority only)
router.post("/canteen-menu", async (req, res) => {
  const { name, description, price, category, preparationTime, created_by } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO canteen_items 
       (name, description, price, category, preparation_time, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, price, category, preparationTime, created_by]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// PUT - Edit item (Authority only)
router.put("/canteen-menu/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const { name, description, price, category, preparationTime } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE canteen_items 
       SET name = $1, description = $2, price = $3, category = $4, 
           preparation_time = $5, updated_at = CURRENT_TIMESTAMP
       WHERE item_id = $6
       RETURNING *`,
      [name, description, price, category, preparationTime, itemId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// DELETE - Delete item (Authority only)
router.delete("/canteen-menu/:itemId", async (req, res) => {
  const { itemId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM canteen_items WHERE item_id = $1`,
      [itemId]
    );
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// PATCH - Toggle availability (Authority only)
router.patch("/canteen-menu/:itemId/availability", async (req, res) => {
  const { itemId } = req.params;
  const { available } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE canteen_items 
       SET available = $1, updated_at = CURRENT_TIMESTAMP
       WHERE item_id = $2
       RETURNING *`,
      [available, itemId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating availability:", err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});


module.exports = router;
