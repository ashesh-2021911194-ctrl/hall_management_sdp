// routes/rooms.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

/* -----------------------------------------------------
   🧱 Repository Pattern — Handles all DB interactions
------------------------------------------------------ */
class RoomRepository {
  static async getRoomsByBuildingAndFloor(building, floor) {
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

  static async getStudentsByRoomId(roomId) {
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

/* -----------------------------------------------------
   💼 Service Layer — Business logic + error handling
------------------------------------------------------ */
class RoomService {
  constructor(repository) {
    this.repository = repository;
  }

  async fetchRooms(building, floor) {
    if (!building || !floor)
      throw new Error("Building name and floor number are required.");

    const result = await this.repository.getRoomsByBuildingAndFloor(
      building,
      Number(floor)
    );
    return result.rows;
  }

  async fetchRoomStudents(roomId) {
    const result = await this.repository.getStudentsByRoomId(roomId);
    return result.rows;
  }
}

/* -----------------------------------------------------
   🏭 Factory Pattern — Creates service instance
------------------------------------------------------ */
class ServiceFactory {
  static createRoomService() {
    return new RoomService(RoomRepository);
  }
}

/* -----------------------------------------------------
   🚀 Routes — Clean, thin, & testable
------------------------------------------------------ */
const roomService = ServiceFactory.createRoomService();

// ✅ Get Rooms by Building & Floor
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

// ✅ Get Students in a Room
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


