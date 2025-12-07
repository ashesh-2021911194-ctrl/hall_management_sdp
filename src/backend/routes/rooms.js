// routes/rooms.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

/* ======================================================
   📦 DAO Pattern — Direct SQL operations (Data Access)
====================================================== */
class RoomDAO {
  async fetchRooms(building, floor) {
    return pool.query(
      `
      SELECT r.room_id, r.room_number, r.capacity, r.current_occupancy
      FROM rooms r
      JOIN floors f ON r.floor_id = f.floor_id
      JOIN buildings b ON f.building_id = b.building_id
      WHERE b.building_name = $1 AND f.floor_number = $2
      ORDER BY r.room_number ASC
      `,
      [building, floor]
    );
  }

  async fetchStudents(roomId) {
    return pool.query(
      `
      SELECT s.student_id, s.name, s.roll_no, s.cgpa, s.year, a.expiry_date
      FROM allocations a
      JOIN students s ON a.student_id = s.student_id
      WHERE a.room_id = $1 AND a.active = TRUE
      ORDER BY s.year ASC, s.cgpa DESC
      `,
      [roomId]
    );
  }
}

/* ======================================================
   🧱 Repository Pattern — Uses DAO for queries
====================================================== */
class RoomRepository {
  constructor(dao) {
    this.dao = dao;
  }

  async getRoomsByBuildingAndFloor(building, floor) {
    return this.dao.fetchRooms(building, floor);
  }

  async getStudentsByRoomId(roomId) {
    return this.dao.fetchStudents(roomId);
  }
}

/* ======================================================
   💼 Service Layer — Business logic
====================================================== */
class RoomService {
  constructor(repository) {
    this.repository = repository;
  }

  async fetchRooms(building, floor) {
    if (!building || !floor)
      throw new Error("Building name and floor number are required.");

    const result = await this.repository.getRoomsByBuildingAndFloor(building, Number(floor));
    return result.rows;
  }

  async fetchRoomStudents(roomId) {
    const result = await this.repository.getStudentsByRoomId(roomId);
    return result.rows;
  }
}

/* ======================================================
   🏭 Factory Pattern — Creates service with DAO + Repository
====================================================== */
class ServiceFactory {
  static createRoomService() {
    const dao = new RoomDAO();
    const repo = new RoomRepository(dao);
    return new RoomService(repo);
  }
}

/* ======================================================
   🚀 Routes — Clean & Testable
====================================================== */
const roomService = ServiceFactory.createRoomService();

// Get Rooms by Building & Floor
router.get("/", async (req, res) => {
  const { building, floor } = req.query;

  try {
    const rooms = await roomService.fetchRooms(building, floor);
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get Students in a Room
router.get("/:roomId/students", async (req, res) => {
  const { roomId } = req.params;

  try {
    const students = await roomService.fetchRoomStudents(roomId);
    res.json(students);
  } catch (err) {
    console.error("Error fetching students in room:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;


