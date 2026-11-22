-- قاعدة بيانات تطبيق المرافق (Al-Murafiq Travel App)
-- متوافقة مع SQLite و MySQL

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    destination VARCHAR(100) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    terms TEXT,
    checked_in BOOLEAN DEFAULT 0,
    seat_number VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itinerary_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    item_order INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    from_location VARCHAR(150),
    to_location VARCHAR(150),
    departure_datetime VARCHAR(50),
    airline VARCHAR(100),
    flight_number VARCHAR(50),
    hotel_name VARCHAR(150),
    stars INTEGER,
    room_type VARCHAR(100),
    board_type VARCHAR(50),
    check_in_date VARCHAR(50),
    check_out_date VARCHAR(50),
    vehicle_type VARCHAR(100),
    transfer_from VARCHAR(150),
    transfer_to VARCHAR(150),
    transfer_datetime VARCHAR(50),
    notes TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS destination_guides (
    destination VARCHAR(100) PRIMARY KEY,
    weather TEXT,
    plug_type TEXT,
    halal_restaurants TEXT,
    attractions TEXT
);
