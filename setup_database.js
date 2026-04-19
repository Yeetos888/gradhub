import "dotenv/config";
import mysql from "mysql2";

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 22894
});

const queries = [
    `CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_name VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) NOT NULL UNIQUE,
        instructor VARCHAR(100),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        schedule_day VARCHAR(50),
        schedule_time VARCHAR(50),
        location VARCHAR(100),
        meeting_link VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        course_id INT,
        UNIQUE KEY unique_enrollment (student_id, course_id),
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
    )`,
    `CREATE TABLE IF NOT EXISTS mentors (
        mentor_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        specialization VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    // Demo data for courses
    `INSERT IGNORE INTO courses (id, course_name, course_code, instructor, description) VALUES 
        (1, 'Web Development', 'CS101', 'Dr. Sarah Smith', 'Learn modern web development with HTML, CSS, and JavaScript'),
        (2, 'Data Structures', 'CS202', 'Prof. John Doe', 'Master fundamental data structures and algorithms'),
        (3, 'Artificial Intelligence', 'AI301', 'Ms. Emily White', 'Explore AI concepts and machine learning principles')`,
    // Demo data for schedules
    `INSERT IGNORE INTO schedules (id, course_id, schedule_day, schedule_time, location, meeting_link) VALUES 
        (1, 1, 'Monday, Wednesday', '10:00 AM - 11:30 AM', 'Room 302', 'https://meet.google.com/abc-defg-hij'),
        (2, 2, 'Tuesday, Thursday', '02:00 PM - 03:30 PM', 'Lab A', 'https://meet.google.com/klm-nopq-rst'),
        (3, 3, 'Friday', '09:00 AM - 12:00 PM', 'Hall 4', 'https://zoom.us/j/123456789')`,
    // Enroll existing students in all courses for demo purposes
    `INSERT IGNORE INTO enrollments (student_id, course_id)
     SELECT s.student_id, c.id FROM students s CROSS JOIN courses c`
];

async function setup() {
    for (const query of queries) {
        try {
            await db.promise().query(query);
            console.log("Executed query successfully");
        } catch (err) {
            console.error("Error executing query:", err);
        }
    }
    db.end();
}

setup();
