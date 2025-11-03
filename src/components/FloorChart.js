import React, { useState, useEffect, useCallback } from "react";

// 🏭 Factory Pattern – centralized API creation
const ApiFactory = {
  getRooms: (building, floor) =>
    fetch(`http://localhost:5000/api/admin/rooms?building=${building}&floor=${floor}`).then((res) =>
      res.json()
    ),

  getRoomStudents: (roomId) =>
    fetch(`http://localhost:5000/api/admin/rooms/${roomId}/students`).then((res) => res.json()),
};

// 🎨 Strategy Pattern – dynamic room color logic
const getRoomColorStrategy = (occupancy, capacity) => {
  const strategies = [
    { condition: occupancy === 0, color: "#f2f2f2" },
    { condition: occupancy < capacity / 2, color: "#a2d2ff" },
    { condition: occupancy < capacity, color: "#ffcc00" },
  ];
  const match = strategies.find((s) => s.condition);
  return match ? match.color : "#ff4d4d";
};

// 🧩 Presentational Component: RoomCard
const RoomCard = ({ room, onClick }) => (
  <div
    onClick={() => onClick(room)}
    style={{
      backgroundColor: getRoomColorStrategy(room.current_occupancy, room.capacity),
      padding: "20px",
      textAlign: "center",
      borderRadius: "6px",
      border: "1px solid #333",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "transform 0.2s ease",
    }}
  >
    {room.room_number}
    <br />
    {room.current_occupancy}/{room.capacity}
  </div>
);

// 🧱 Presentational Component: RoomGrid
const RoomGrid = ({ rooms, onRoomClick }) => {
  if (!rooms.length)
    return <p style={{ marginTop: "20px" }}>No rooms found for this building/floor.</p>;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "10px",
        marginTop: "20px",
      }}
    >
      {rooms.map((room) => (
        <RoomCard key={room.room_id} room={room} onClick={onRoomClick} />
      ))}
    </div>
  );
};

// 🪟 Modal Pattern – Room details modal
const RoomDetailsModal = ({ room, students, onClose }) => {
  if (!room) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        padding: "20px",
        border: "2px solid #333",
        borderRadius: "8px",
        zIndex: 1000,
        width: "400px",
        boxShadow: "0px 0px 20px rgba(0,0,0,0.3)",
      }}
    >
      <h4>
        Room {room.room_number} – {room.current_occupancy}/{room.capacity}
      </h4>

      {students.length > 0 ? (
        <table
          border="1"
          cellPadding="6"
          style={{
            width: "100%",
            marginTop: "10px",
            borderCollapse: "collapse",
          }}
        >
          <thead style={{ background: "#f2f2f2" }}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Roll</th>
              <th>CGPA</th>
              <th>Year</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.student_id}>
                <td>{s.student_id}</td>
                <td>{s.name}</td>
                <td>{s.roll_no}</td>
                <td>{s.cgpa}</td>
                <td>{s.year}</td>
                <td>
                  {s.expiry_date
                    ? new Date(s.expiry_date).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No students in this room.</p>
      )}

      <button
        onClick={onClose}
        style={{
          marginTop: "15px",
          padding: "8px 16px",
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
};

// 🧭 Main Component – FloorChart (Container)
const FloorChart = ({ building: parentBuilding, floor: parentFloor, refreshTrigger, textColor = "#063a70" }) => {
  const [building, setBuilding] = useState(parentBuilding || "Main Building");
  const [floor, setFloor] = useState(parentFloor || 2);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomStudents, setRoomStudents] = useState([]);

  // 🔁 Observer pattern – reacts to changes
  const fetchRooms = useCallback(async () => {
    if (!building || !floor) return;
    try {
      const data = await ApiFactory.getRooms(building, floor);
      setRooms(data);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  }, [building, floor]);

  const fetchRoomStudents = useCallback(async (roomId) => {
    try {
      const data = await ApiFactory.getRoomStudents(roomId);
      setRoomStudents(data);
    } catch (err) {
      console.error("Error fetching room students:", err);
    }
  }, []);

  useEffect(() => {
    setBuilding(parentBuilding || "Main Building");
  }, [parentBuilding]);

  useEffect(() => {
    setFloor(parentFloor || 2);
  }, [parentFloor]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, refreshTrigger]);

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    fetchRoomStudents(room.room_id);
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "#063a70" }}>
  Floor Chart – {building}, Floor {floor}
</h3>


      <RoomGrid rooms={rooms} onRoomClick={handleRoomClick} />

      <button
        onClick={fetchRooms}
        style={{
          marginTop: "20px",
          padding: "8px 16px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        🔄 Refresh
      </button>

      <RoomDetailsModal
        room={selectedRoom}
        students={roomStudents}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
};

export default FloorChart;





