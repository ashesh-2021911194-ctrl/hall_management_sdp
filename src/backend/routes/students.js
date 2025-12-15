const express = require("express");
const router = express.Router();
const pool = require("../db");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const pdfParse = require("pdf-parse");


// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });
// ✅ Get Allocated Students
router.get("/allocated", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.student_id, s.name, s.roll_no, s.cgpa, s.year, s.score,
       s.faculty, s.department,
       a.expiry_date, r.room_number, f.floor_number, b.building_name
FROM allocations a
JOIN students s ON a.student_id = s.student_id
JOIN rooms r ON a.room_id = r.room_id
JOIN floors f ON r.floor_id = f.floor_id
JOIN buildings b ON f.building_id = b.building_id
WHERE a.active = TRUE
ORDER BY b.building_name, f.floor_number DESC, r.room_number ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching allocated students:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Get Waiting Students
router.get("/waiting", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.student_id, s.name, s.roll_no, s.cgpa, s.year, s.score,
       s.faculty, s.department,
       w.added_on
FROM waiting_list w
JOIN students s ON w.student_id = s.student_id
ORDER BY s.score DESC, w.added_on ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching waiting students:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/admin/students/staff
// Returns staff entries added by authority. Supports optional filtering by role and department via query params.
router.get('/staff', async (req, res) => {
  try {
    const { role, department } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      conditions.push(`designation = $${idx++}`);
      params.push(role);
    }
    if (department) {
      conditions.push(`department = $${idx++}`);
      params.push(department);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const q = `SELECT staff_id, name, designation AS role, email, phone, department, created_at FROM staff ${whereClause} ORDER BY created_at DESC`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching staff for students:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Fill Vacant Seat (Assign top waiting student to a room)
router.post("/fill-vacant/:roomId", async (req, res) => {
  const { roomId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get top waiting student
    const studentRes = await client.query(`
      SELECT w.student_id, COALESCE(w.score, s.score) AS score
      FROM waiting_list w
      JOIN students s ON w.student_id = s.student_id
      ORDER BY COALESCE(w.score, s.score) DESC, w.added_on ASC
      LIMIT 1
    `);

    if (studentRes.rows.length === 0) {
      await client.query("COMMIT");
      return res.json({ message: "No waiting students" });
    }

  const studentId = studentRes.rows[0].student_id;

    // Allocate this student to the vacant room
    await client.query(`
      INSERT INTO allocations (student_id, room_id, allocation_run_id, score, expiry_date, active)
      VALUES ($1, $2, $3, $4, NOW() + interval '4 years', TRUE)
    `, [studentId, roomId, Date.now(), studentRes.rows[0].score || null]);

    await client.query(`
      UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = $1
    `, [roomId]);

    // Remove from waiting list
    await client.query(`DELETE FROM waiting_list WHERE student_id = $1`, [studentId]);

    await client.query("COMMIT");

    res.json({ message: `Student ${studentId} assigned to room ${roomId}` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error filling vacant seat:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

router.post("/update-allocation", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Collect all students (allocated + waiting)
    const candidatesRes = await client.query(`
      SELECT s.student_id, s.score
      FROM students s
      WHERE s.student_id IN (
        SELECT student_id FROM allocations WHERE active = TRUE
        UNION
        SELECT student_id FROM waiting_list
      )
      ORDER BY s.score DESC
    `);
    const students = candidatesRes.rows;

    if (students.length === 0) {
      await client.query("COMMIT");
      return res.json({ message: "No students to allocate" });
    }

    // 2️⃣ Fetch rooms by building & floor priority
    const roomsRes = await client.query(`
      SELECT r.room_id, r.capacity, r.room_number, f.floor_number, b.building_name
      FROM rooms r
      JOIN floors f ON r.floor_id = f.floor_id
      JOIN buildings b ON f.building_id = b.building_id
      ORDER BY
        CASE b.building_name
          WHEN 'Main Building' THEN 1
          WHEN 'Extension 1' THEN 2
          WHEN 'Extension 2' THEN 3
        END,
        f.floor_number DESC,
        r.room_number ASC
    `);
    const rooms = roomsRes.rows;

    // 3️⃣ Reset allocations, waiting list, and rooms
    await client.query(`UPDATE allocations SET active = FALSE WHERE active = TRUE`);
    await client.query(`DELETE FROM waiting_list`);
    await client.query(`UPDATE rooms SET current_occupancy = 0`);

    // 4️⃣ Reassign — assign students sequentially into rooms and track per-room counts
    let studentIndex = 0;
    for (const room of rooms) {
      const capacity = room.capacity;
      let assignedCount = 0;

      for (let i = 0; i < capacity && studentIndex < students.length; i++) {
        const student = students[studentIndex];

        await client.query(`
          INSERT INTO allocations (student_id, room_id, allocation_run_id, score, expiry_date, active)
          VALUES ($1, $2, $3, $4, NOW() + interval '6 months', TRUE)
        `, [student.student_id, room.room_id, Date.now(), student.score]);

        studentIndex++;
        assignedCount++;
      }

      // set the room occupancy to the number actually assigned (cap it at capacity)
      await client.query(
        `UPDATE rooms SET current_occupancy = $1::int WHERE room_id = $2::int`,
        [Math.min(assignedCount, capacity), room.room_id]
      );
    }

    // 5️⃣ Leftover students → waiting list
    for (; studentIndex < students.length; studentIndex++) {
      const student = students[studentIndex];
      await client.query(
        `INSERT INTO waiting_list (student_id, score, added_on)
         VALUES ($1, $2, NOW())`,
        [student.student_id, student.score]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Allocation updated successfully!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating allocation:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// ✅ My Seat (studentId here = all_student_id)
router.get("/my-seat/:studentId", async (req, res) => {
  const allStudentId = parseInt(req.params.studentId, 10);
  console.log("Looking for seat with allStudentId:", allStudentId);

  if (isNaN(allStudentId)) {
    return res.status(400).json({ error: "Invalid student ID" });
  }

  try {
    // Step 1: Map all_student_id -> student_id via roll_no
    const studentMap = await pool.query(
      `SELECT s.student_id
       FROM all_students st
       JOIN students s ON st.roll_no = s.roll_no
       WHERE st.all_student_id = $1`,
      [allStudentId]
    );

    if (studentMap.rows.length === 0) {
      console.log("No matching student found in students for all_student_id:", allStudentId);
      return res.json({ hasSeat: false });
    }

    const studentId = studentMap.rows[0].student_id;
    console.log(`Mapped all_student_id ${allStudentId} -> student_id ${studentId}`);

    // Step 2: Fetch active seat allocation
    const result = await pool.query(`
      SELECT a.allocation_id, a.expiry_date, a.active, a.student_id,
             r.room_number, f.floor_number, b.building_name
      FROM allocations a
      JOIN rooms r ON a.room_id = r.room_id
      JOIN floors f ON r.floor_id = f.floor_id
      JOIN buildings b ON f.building_id = b.building_id
      WHERE a.student_id = $1 AND a.active = TRUE
    `, [studentId]);

    console.log("Query result rows:", result.rows);

    if (result.rows.length === 0) {
      return res.json({ hasSeat: false });
    }

    res.json({ hasSeat: true, seat: result.rows[0] });

  } catch (err) {
    console.error("Error fetching seat info:", err);
    res.status(500).json({ error: "Database error" });
  }
});




// routes/students.js
/* =========================================================
   🎯 STRATEGY PATTERN — ID Mapping Strategies
   Tries several strategies to resolve the incoming param into
   the internal students.student_id (number or via all_students)
   ========================================================= */
const IdMapper = {
  async map(rawId, client) {
    // try numeric student_id first
    const asNumber = Number(rawId);
    if (!Number.isNaN(asNumber)) {
      const check = await client.query(`SELECT student_id FROM students WHERE student_id = $1 LIMIT 1`, [asNumber]);
      if (check.rows.length > 0) return check.rows[0].student_id;

      // try mapping as all_student_id
      const map = await client.query(
        `SELECT s.student_id FROM all_students a JOIN students s ON a.roll_no = s.roll_no WHERE a.all_student_id = $1 LIMIT 1`,
        [asNumber]
      );
      if (map.rows.length > 0) return map.rows[0].student_id;
    }

    // fallback: try raw string as all_student_id
    const map2 = await client.query(
      `SELECT s.student_id FROM all_students a JOIN students s ON a.roll_no = s.roll_no WHERE a.all_student_id = $1 LIMIT 1`,
      [rawId]
    );
    if (map2.rows.length > 0) return map2.rows[0].student_id;

    return null;
  },
};

/* =========================================================
   🗄️ REPOSITORY PATTERN — Data access encapsulation
   AllocationsRepo & RoomsRepo centralize DB operations so the
   higher-level withdraw logic is easier to test and read.
   ========================================================= */
const AllocationsRepo = {
  async getActiveByStudentId(studentId, client) {
    const r = await client.query(`SELECT allocation_id, room_id FROM allocations WHERE student_id = $1 AND active = TRUE`, [studentId]);
    return r.rows;
  },
  async deactivateByIds(allocationIds, client) {
    if (!allocationIds || allocationIds.length === 0) return [];
    const r = await client.query(`UPDATE allocations SET active = FALSE WHERE allocation_id = ANY($1::int[]) RETURNING allocation_id`, [allocationIds]);
    return r.rows.map(rr => rr.allocation_id);
  }
};

const RoomsRepo = {
  async decrementOccupancy(roomIds, client) {
    for (const rid of roomIds) {
      await client.query(`UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0) WHERE room_id = $1`, [rid]);
    }
  }
};

/* =========================================================
   🧭 TEMPLATE METHOD — Transaction Template
   Wraps the BEGIN / COMMIT / ROLLBACK boilerplate so business
   logic can be implemented as a simple function.
   ========================================================= */
const TransactionTemplate = {
  async run(work) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (e) { console.error("Rollback failed:", e); }
      throw err;
    } finally {
      client.release();
    }
  }
};

/* =========================================================
   ⚙️ COMMAND PATTERN — WithdrawCommand
   Encapsulates the withdraw operation (map id, deactivate allocations,
   decrement room occupancy) as a reusable command.
   ========================================================= */
const WithdrawCommand = {
  async execute(rawId) {
    return TransactionTemplate.run(async (client) => {
      const internalId = await IdMapper.map(rawId, client);
      if (!internalId) {
        // keep behavior identical: surface not-found
        const err = new Error("Student not found");
        err.status = 404;
        throw err;
      }

      const allocs = await AllocationsRepo.getActiveByStudentId(internalId, client);
      if (!allocs || allocs.length === 0) {
        const err = new Error("No active allocation found for this student.");
        err.status = 404;
        throw err;
      }

      const allocationIds = allocs.map(r => r.allocation_id);
      const roomIds = Array.from(new Set(allocs.map(r => r.room_id)));

      console.log(`withdraw: deactivating allocations ${allocationIds.join(', ')} for student_id ${internalId}`);

      const deactivated = await AllocationsRepo.deactivateByIds(allocationIds, client);
      await RoomsRepo.decrementOccupancy(roomIds, client);

      return { deactivatedCount: deactivated.length, allocation_ids: deactivated };
    });
  }
};

router.post("/withdraw/:studentId", async (req, res) => {
  const rawId = req.params.studentId;
  try {
    const result = await WithdrawCommand.execute(rawId);
    return res.json({ message: "Seat withdrawn successfully", deactivated: result.deactivatedCount, allocation_ids: result.allocation_ids });
  } catch (err) {
    if (err.status === 404) {
      console.warn(`withdraw: ${err.message} for param '${rawId}'`);
      return res.status(404).json({ error: err.message });
    }
    console.error("Error withdrawing seat:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post(
  "/apply/:studentId",
  upload.fields([
    { name: "resultCard", maxCount: 1 },
    { name: "hallCard", maxCount: 1 },
  ]),
  async (req, res) => {
    const allStudentId = parseInt(req.params.studentId, 10);
    if (isNaN(allStudentId))
      return res.status(400).json({ error: "Invalid student ID" });

    try {
      if (!req.files || !req.files.resultCard || !req.files.hallCard) {
        return res.status(400).json({ error: "Both PDFs are required" });
      }

      const resultCardPath = req.files.resultCard[0].path;
      const hallCardPath = req.files.hallCard[0].path;

      // --- Extract data from result PDF ---
      let extractedName = null;
      let extractedRoll = null;
      let extractedCgpa = null;
      let extractedYear = null;
      let extractedSession = null;

      try {
        const fileBuffer = await fs.promises.readFile(resultCardPath);
        const pdfData = await pdfParse(fileBuffer);
        const text = pdfData?.text || "";

        const nameMatch = text.match(/(?:Name|Student Name|Candidate Name)\s*[:\-\–]?\s*([A-Za-z0-9 .,'\-]{2,200})/i);
        const rollMatch = text.match(/(?:Roll(?:\s*No(?:\.)?)?|Roll Number|Registration(?:\s*No(?:\.)?)?)\s*[:\-\–]?\s*([A-Za-z0-9\/\-]+)/i);
        const cgpaMatch = text.match(/(?:CGPA|GPA|C\.G\.P\.A)\s*[:\-\–]?\s*([0-4](?:\.[0-9]{1,2})?)/i);
        const yearMatch = text.match(/(?:Year|Class|Study Year)\s*[:\-\–]?\s*(\d{1,2}|\d{4})/i);
        const sessionMatch = text.match(/(?:Session|Academic Year|Term)\s*[:\-\–]?\s*([0-9]{4}(?:[-\/][0-9]{2,4})?)/i);

        if (nameMatch) extractedName = nameMatch[1].trim();
        if (rollMatch) extractedRoll = rollMatch[1].trim();
        if (cgpaMatch) extractedCgpa = parseFloat(cgpaMatch[1]);
        if (yearMatch) {
          const y = yearMatch[1].trim();
          if (y.length <= 2) extractedYear = parseInt(y, 10);
        }
        if (sessionMatch) extractedSession = sessionMatch[1].trim();
      } catch (parseErr) {
        console.warn("PDF parse failed:", parseErr.message);
      }

      // --- Find or create student in `students` table ---
      let studentId;

      const studentMap = await pool.query(
        `SELECT s.student_id
         FROM all_students a
         JOIN students s ON a.roll_no = s.roll_no
         WHERE a.all_student_id = $1`,
        [allStudentId]
      );

      if (studentMap.rows.length === 0) {
        // Student not found — insert from all_students
        const insertResult = await pool.query(
          `INSERT INTO students (name, roll_no, cgpa, year, merit_rank)
           SELECT name, roll_no, COALESCE(cgpa, 0.00), COALESCE(year, 1), COALESCE(merit_rank, 9999)
           FROM all_students
           WHERE all_student_id = $1
           RETURNING student_id;`,
          [allStudentId]
        );
        studentId = insertResult.rows[0].student_id;
        console.log(`Created new student in students table: ${studentId}`);
      } else {
        studentId = studentMap.rows[0].student_id;
      }

      // --- Update students table (with extracted data) ---
      const updateFields = [];
      const updateValues = [];
      let idx = 1;

      if (extractedName) {
        updateFields.push(`name = $${idx++}`);
        updateValues.push(extractedName);
      }
      if (extractedRoll) {
        updateFields.push(`roll_no = $${idx++}`);
        updateValues.push(extractedRoll);
      }
      if (extractedCgpa !== null && !isNaN(extractedCgpa)) {
        updateFields.push(`cgpa = $${idx++}`);
        updateValues.push(extractedCgpa);
      }
      if (extractedYear) {
        updateFields.push(`year = $${idx++}`);
        updateValues.push(extractedYear);
      }

      if (updateFields.length > 0) {
        updateValues.push(studentId);
        await pool.query(
          `UPDATE students SET ${updateFields.join(", ")} WHERE student_id = $${updateValues.length}`,
          updateValues
        );
      }

      // --- Insert into seat_applications (all_students_id) ---
      const insertAppQuery = `
        INSERT INTO seat_applications
          (student_id, result_card, hall_card, result_name, result_roll_no, result_cgpa, result_year, result_session)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const appValues = [
        allStudentId,  // must be all_students.all_student_id
        resultCardPath,
        hallCardPath,
        extractedName,
        extractedRoll,
        extractedCgpa,
        extractedYear,
        extractedSession,
      ];

      const { rows } = await pool.query(insertAppQuery, appValues);

      res.json({
        message: "Application submitted successfully!",
        student_update: { name: extractedName, roll_no: extractedRoll, cgpa: extractedCgpa, year: extractedYear },
        application: rows[0],
      });
    } catch (err) {
      console.error("Error submitting application:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  }
);


// ✅ Dismiss allocated student seat + auto-fill vacant room
router.post("/:studentId/dismiss", async (req, res) => {
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
    const roomId = alloc.room_id;

    // 2️⃣ Mark allocation inactive
    await client.query(
      `UPDATE allocations SET active = FALSE WHERE allocation_id = $1`,
      [alloc.allocation_id]
    );

    // 3️⃣ Decrement room occupancy
    await client.query(
      `UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0) WHERE room_id = $1`,
      [roomId]
    );

    // 4️⃣ Insert dismissal notification
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

    // 5️⃣ Try to auto-fill from waiting list (highest score first)
    const waitingRes = await client.query(`
      SELECT w.student_id, COALESCE(w.score, s.score) AS score
      FROM waiting_list w
      JOIN students s ON w.student_id = s.student_id
      ORDER BY COALESCE(w.score, s.score) DESC, w.added_on ASC
      LIMIT 1
    `);

    if (waitingRes.rows.length > 0) {
      const nextStudentId = waitingRes.rows[0].student_id;
      const nextScore = waitingRes.rows[0].score;

      // ✅ Create new allocation
      const newAlloc = await client.query(
        `
        INSERT INTO allocations (student_id, room_id, allocation_run_id, score, expiry_date, active)
        VALUES ($1, $2, $3, $4, NOW() + interval '6 months', TRUE)
        RETURNING allocation_id
        `,
        [nextStudentId, roomId, Date.now(), nextScore]
      );

      // ✅ Update room occupancy
      /*await client.query(
        `UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = $1`,
        [roomId]
      );

      // ✅ Remove from waiting list
      await client.query(`DELETE FROM waiting_list WHERE student_id = $1`, [nextStudentId]);*/
      // ✅ Remove the newly allocated student from waiting list
const delRes = await client.query(
  `DELETE FROM waiting_list WHERE student_id = $1 RETURNING *`,
  [nextStudentId]
);
if (delRes.rowCount === 0) {
  console.warn(`⚠️ No waiting list entry found for student ${nextStudentId}.`);
}

// ✅ Update room occupancy
await client.query(
  `UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = $1`,
  [roomId]
);
      // ✅ Notify the newly allocated student
      const nextStudentRes = await client.query(
        `SELECT s.roll_no, a.all_student_id, b.building_name, f.floor_number, r.room_number
         FROM students s
         JOIN all_students a ON s.roll_no = a.roll_no
         JOIN allocations al ON al.student_id = s.student_id
         JOIN rooms r ON al.room_id = r.room_id
         JOIN floors f ON r.floor_id = f.floor_id
         JOIN buildings b ON f.building_id = b.building_id
         WHERE s.student_id = $1 AND al.allocation_id = $2
        `,
        [nextStudentId, newAlloc.rows[0].allocation_id]
      );

      const next = nextStudentRes.rows[0];

      await client.query(
        `INSERT INTO notifications (all_student_id, type, message, link)
         VALUES ($1, $2, $3, $4)`,
        [
          next.all_student_id,
          "seat_allocation",
          `Congratulations! You’ve been allocated a seat in ${next.building_name}, Floor ${next.floor_number}, Room ${next.room_number}.`,
          "/seat-allocation",
        ]
      );

      await client.query("COMMIT");

      return res.json({
        message: `Student ${req.params.studentId} dismissed. Student ${nextStudentId} auto-allocated to room ${roomId+1}.`,
      });
    }

    // 6️⃣ If no waiting student found
    await client.query("COMMIT");
    return res.json({
      message: `Student ${req.params.studentId} dismissed successfully. No waiting student available.`,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error dismissing seat:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// GET /students/:allStudentId/notifications
/* =========================================================
  🗄️ REPOSITORY PATTERN — NotificationsRepo (Facade)
  Encapsulates notification DB access (getByAllStudentId, markRead).
  Provides a stable interface for higher-level services and makes
  it easier to test, cache, or replace notification persistence.
  ========================================================= */
const NotificationsRepo = {
  async getByAllStudentId(allStudentId) {
    const result = await pool.query(
      `SELECT notification_id AS id, type, message, read, created_at AS date, link
       FROM notifications
       WHERE all_student_id = $1
       ORDER BY created_at DESC`,
      [allStudentId]
    );
    return result.rows;
  },

  async markRead(allStudentId, notificationId) {
    const result = await pool.query(
      `UPDATE notifications SET read = TRUE
       WHERE all_student_id = $1 AND notification_id = $2 RETURNING notification_id AS id`,
      [allStudentId, notificationId]
    );
    return result.rows;
  }
};
router.get("/:allStudentId/notifications", async (req, res) => {
  const allStudentId = parseInt(req.params.allStudentId, 10);
  if (isNaN(allStudentId)) return res.status(400).json({ error: "Invalid student ID" });

  try {
    const rows = await NotificationsRepo.getByAllStudentId(allStudentId);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Database error" });
  }
});



router.post("/:allStudentId/notifications/:notificationId/read", async (req, res) => {
  const { allStudentId, notificationId } = req.params;
  try {
    const updated = await NotificationsRepo.markRead(allStudentId, notificationId);
    if (updated.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: "Notification marked as read.", notification_id: updated[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});





router.get("/notices", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.notice_id AS id,
        n.title,
        n.content,
        n.importance,
        n.requires_document AS "requiresDocument",
        n.document_title AS document_title,
        n.document_description AS document_description,
        n.document_url AS document_url,
        d.file_path AS student_document_url,
        n.created_at AS date
      FROM notices n
      LEFT JOIN notice_documents d
        ON n.notice_id = d.notice_id
      ORDER BY n.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching notices:", err);
    res.status(500).json({ error: "Database error" });
  }
});



// POST /api/students/notices/:noticeId/upload
// If notice requires document upload
//const multer = require("multer");


router.post("/notices/:noticeId/upload", upload.single("document"), async (req, res) => {
  try {
    const { noticeId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    const webPath = `/uploads/${file.filename}`;
    const insertRes = await pool.query(
      `INSERT INTO notice_documents (notice_id, file_path, uploaded_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [noticeId, webPath]
    );

    return res.json({ message: "Document uploaded successfully", document: insertRes.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});


/*router.post("/complaints", async (req, res) => {
  const {
    allStudentId,
    title,
    description,
    complaint_type,
    building,
    floor_no,
    block_no,
    room_no,
    is_custom,
  } = req.body;

  if (!allStudentId || !building || !floor_no)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const mapResult = await pool.query(
      "SELECT student_id FROM students WHERE roll_no = (SELECT roll_no FROM all_students WHERE all_student_id = $1)",
      [allStudentId]
    );

    if (mapResult.rows.length === 0)
      return res.status(404).json({ error: "Student not found in hall" });

    const studentId = mapResult.rows[0].student_id;

    const result = await pool.query(
      `INSERT INTO complaints 
      (student_id, title, description, complaint_type, building, floor_no, block_no, room_no, is_custom)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        studentId,
        title || null,
        description || null,
        complaint_type || null,
        building,
        floor_no,
        block_no || null,
        room_no || null,
        is_custom || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {

    // ⭐ ⭐ ⭐ ADD THIS ⭐ ⭐ ⭐
    if (err.code === "23505") {
      return res.status(409).json({
        error: "This complaint already exists and is being processed."
      });
    }
    
    console.error("Error submitting complaint:", err);
    res.status(500).json({ error: "Database error" });
  }
});




// GET /api/admin/students/complaints/:allStudentId — fetch complaints for a student
router.get("/complaints/:allStudentId", async (req, res) => {
  const allStudentId = parseInt(req.params.allStudentId, 10);
  console.log("GET complaints - allStudentId:", allStudentId);
  if (isNaN(allStudentId)) {
    console.log("Invalid student ID");
    return res.status(400).json({ error: "Invalid student ID" });
  }

  try {
    // Map all_student_id → student_id
    const mapResult = await pool.query(
      `SELECT student_id 
       FROM students 
       WHERE roll_no = (SELECT roll_no FROM all_students WHERE all_student_id = $1)`,
      [allStudentId]
    );

    if (mapResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found in hall" });
    }

    const studentId = mapResult.rows[0].student_id;

    console.log("Found student_id:", studentId);
    
    // Fetch complaints
    const complaintsResult = await pool.query(
      `SELECT 
  c.*, 
  s.name as student_name
 
       FROM complaints c 
       JOIN students s ON c.student_id = s.student_id 
       WHERE c.student_id = $1 
       ORDER BY c.created_at DESC`,
      [studentId]
    );
    
    console.log("Student complaints result:", complaintsResult.rows);
    res.json(complaintsResult.rows);
  } catch (err) {
    console.error("Error fetching complaints:", err);
    res.status(500).json({ error: "Server error" });
  }
});*/
/* -----------------------------------------------------
   🧱 Repository Pattern — ComplaintRepository
------------------------------------------------------ */
const ComplaintRepository = {
  async mapStudent(pool, allStudentId) {
    return pool.query(
      `SELECT student_id 
       FROM students 
       WHERE roll_no = (
         SELECT roll_no FROM all_students WHERE all_student_id = $1
       )`,
      [allStudentId]
    );
  },

  async insertComplaint(pool, data) {
    return pool.query(
      `INSERT INTO complaints
      (student_id, title, description, complaint_type, building, floor_no, block_no, room_no, is_custom)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      data
    );
  },

  async getComplaints(pool, studentId) {
    return pool.query(
      `SELECT c.*, s.name AS student_name
       FROM complaints c
       JOIN students s ON c.student_id = s.student_id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );
  },
};

/* -----------------------------------------------------
   🧠 Service Layer Pattern — ComplaintService
------------------------------------------------------ */
const ComplaintService = {
  async create(pool, payload) {
    const {
      allStudentId,
      title,
      description,
      complaint_type,
      building,
      floor_no,
      block_no,
      room_no,
      is_custom,
    } = payload;

    if (!allStudentId || !building || !floor_no)
      throw { status: 400, message: "Missing required fields" };

    const map = await ComplaintRepository.mapStudent(pool, allStudentId);
    if (!map.rows.length)
      throw { status: 404, message: "Student not found in hall" };

    const studentId = map.rows[0].student_id;

    return ComplaintRepository.insertComplaint(pool, [
      studentId,
      title || null,
      description || null,
      complaint_type || null,
      building,
      floor_no,
      block_no || null,
      room_no || null,
      is_custom || false,
    ]);
  },
};

/* -----------------------------------------------------
   🎮 Controller Pattern — Routes
------------------------------------------------------ */

// POST complaint
router.post("/complaints", async (req, res) => {
  try {
    const result = await ComplaintService.create(pool, req.body);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "This complaint already exists and is being processed.",
      });
    }
    res.status(err.status || 500).json({ error: err.message || "DB error" });
  }
});

// GET complaints (student)
router.get("/complaints/:allStudentId", async (req, res) => {
  const id = parseInt(req.params.allStudentId, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid student ID" });

  try {
    const map = await ComplaintRepository.mapStudent(pool, id);
    if (!map.rows.length)
      return res.status(404).json({ error: "Student not found" });

    const studentId = map.rows[0].student_id;
    const result = await ComplaintRepository.getComplaints(pool, studentId);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


/* -----------------------------------------------------
   🧱 Repository Pattern — Data Access Layer
------------------------------------------------------ */
const CanteenRepository = {
  async getMenu(pool) {
    return pool.query(`
      SELECT ci.*, 
             COALESCE(AVG(cr.rating), 0) as average_rating,
             COUNT(cr.review_id) as review_count
      FROM canteen_items ci
      LEFT JOIN canteen_reviews cr ON ci.item_id = cr.item_id
      GROUP BY ci.item_id
      ORDER BY ci.created_at DESC
    `);
  },

  async getReviews(pool, itemId) {
    return pool.query(
      `SELECT * FROM canteen_reviews 
       WHERE item_id = $1 
       ORDER BY review_date DESC`,
      [itemId]
    );
  },

  async insertReview(pool, data) {
    return pool.query(
      `INSERT INTO canteen_reviews 
       (item_id, all_student_id, student_name, roll_no, rating, comment, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      data
    );
  },

  async deleteReview(pool, reviewId, studentId) {
    return pool.query(
      `DELETE FROM canteen_reviews 
       WHERE review_id = $1 AND all_student_id = $2
       RETURNING *`,
      [reviewId, studentId]
    );
  },
};

/* -----------------------------------------------------
   🧠 Service Layer Pattern — Business Logic
------------------------------------------------------ */
const CanteenService = {
  async addReview(pool, itemId, payload) {
    const {
      all_student_id,
      student_name,
      roll_no,
      rating,
      comment,
      user_id,
    } = payload;

    const parsedItemId = parseInt(itemId, 10);
    if (isNaN(parsedItemId)) throw new Error("Invalid itemId");

    let effectiveStudentId = all_student_id;

    if (!effectiveStudentId && roll_no) {
      const map = await pool.query(
        `SELECT all_student_id FROM all_students WHERE roll_no = $1 LIMIT 1`,
        [roll_no]
      );
      effectiveStudentId = map.rows[0]?.all_student_id;
    }

    if (!effectiveStudentId) throw new Error("Student not found");

    return CanteenRepository.insertReview(pool, [
      parsedItemId,
      effectiveStudentId,
      student_name || null,
      roll_no || null,
      Number(rating),
      comment?.trim() || null,
      user_id || String(effectiveStudentId),
    ]);
  },
};

/* -----------------------------------------------------
   🎮 Controller Pattern — Route Controllers
------------------------------------------------------ */
router.get("/canteen-menu", async (req, res) => {
  try {
    const result = await CanteenRepository.getMenu(pool);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/canteen-menu/:itemId/reviews", async (req, res) => {
  try {
    const result = await CanteenRepository.getReviews(
      pool,
      req.params.itemId
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/canteen-menu/:itemId/reviews", async (req, res) => {
  try {
    const result = await CanteenService.addReview(
      pool,
      req.params.itemId,
      req.body
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/canteen-menu/reviews/:reviewId", async (req, res) => {
  try {
    const result = await CanteenRepository.deleteReview(
      pool,
      req.params.reviewId,
      req.body.all_student_id
    );

    if (result.rows.length === 0)
      return res.status(403).json({ error: "Unauthorized" });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

module.exports = router;
