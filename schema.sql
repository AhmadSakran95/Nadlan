-- ============================================================================
-- Nadlantours SQL Schema (SQLite / MySQL / PostgreSQL Compatible)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr VARCHAR(10) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    city VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(15) NOT NULL DEFAULT '$',
    terms TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itinerary_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(20) NOT NULL,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    travel_date VARCHAR(100),
    hotel_name VARCHAR(255),
    stars VARCHAR(50),
    board_type VARCHAR(100),
    tour_title VARCHAR(255),
    notes TEXT,
    flight_file_name VARCHAR(255),
    flight_file_mime VARCHAR(120),
    flight_file_data LONGTEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_pnr_lastname ON bookings(pnr, last_name);
CREATE INDEX IF NOT EXISTS idx_itinerary_booking_id ON itinerary_steps(booking_id);
