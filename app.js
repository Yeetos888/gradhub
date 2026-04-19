import express from "express";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import session from "express-session";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: "student-portal-secret-key-123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 22894
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to database:", err);
        return;
    }
    console.log("Connected to database");
    
    // Add description column to courses table if it doesn't exist
    const addDescriptionSql = "ALTER TABLE courses ADD COLUMN description TEXT AFTER instructor";
    db.query(addDescriptionSql, (err) => {
        if (err && err.code !== "ER_DUP_FIELDNAME") {
            console.log("Description column may already exist or other alter error:", err.message);
        } else if (!err) {
            console.log("Added description column to courses table");
        }
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Auth Routes
app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard", (req, res) => {
    if (!req.session.user || req.session.user.type !== "student") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/schedule", (req, res) => {
    if (!req.session.user || req.session.user.type !== "student") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "schedule.html"));
});

app.get("/mentor/dashboard", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") return res.redirect("/mentor/login");
    res.sendFile(path.join(__dirname, "public", "mentor_dashboard.html"));
});

app.get("/mentor/courses", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") return res.redirect("/mentor/login");
    res.sendFile(path.join(__dirname, "public", "mentor_courses_new.html"));
});

app.get("/mentor/schedules", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") return res.redirect("/mentor/login");
    res.sendFile(path.join(__dirname, "public", "mentor_schedules.html"));
});

app.get("/schedule", (req, res) => {
    if (!req.session.user || req.session.user.type !== "student") return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "student_schedule.html"));
});

app.get("/courses", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "public", "courses.html"));
});

app.get("/mentor/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/mentor/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// API Routes
app.post("/api/signup", async (req, res) => {
    const { role = "student", first_name, last_name, username, email, major, specialization, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        if (role === "mentor") {
            const mentorSql = "INSERT INTO mentors (first_name, last_name, username, email, specialization, password_hash) VALUES (?, ?, ?, ?, ?, ?)";
            const mentorValues = [first_name, last_name, username, email, specialization || null, password_hash];

            db.query(mentorSql, mentorValues, (err, result) => {
                if (err) {
                    console.error("Database error during mentor signup:", err);
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({ success: false, message: "Username or Email already exists." });
                    }
                    return res.status(500).json({ success: false, message: "Mentor registration failed." });
                }

                req.session.user = {
                    type: "mentor",
                    id: result.insertId,
                    first_name,
                    last_name,
                    username,
                    email,
                    specialization: specialization || "N/A"
                };

                res.json({ success: true, message: "Mentor registration successful!" });
            });
            return;
        }

        const studentSql = "INSERT INTO students (first_name, last_name, username, email, major, password_hash) VALUES (?, ?, ?, ?, ?, ?)";
        const studentValues = [first_name, last_name, username, email, major || null, password_hash];

        db.query(studentSql, studentValues, (err, result) => {
            if (err) {
                console.error("Database error during signup:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({ success: false, message: "Username or Email already exists." });
                }
                return res.status(500).json({ success: false, message: "Student registration failed." });
            }

            req.session.user = {
                type: "student",
                id: result.insertId,
                first_name,
                last_name,
                username,
                email,
                major: major || "Undeclared"
            };

            const enrollSql = "INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, 1), (?, 2), (?, 3)";
            db.query(enrollSql, [result.insertId, result.insertId, result.insertId], (enrollErr) => {
                if (enrollErr) console.error("Auto-enrollment failed:", enrollErr);
                res.json({ success: true, message: "Student registration successful!" });
            });
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Internal server error.");
    }
});

app.post("/api/login", (req, res) => {
    const { identifier, password, role = "student" } = req.body;

    const table = role === "mentor" ? "mentors" : "students";
    const sql = `SELECT * FROM ${table} WHERE username = ? OR email = ?`;

    db.query(sql, [identifier, identifier], async (err, results) => {
        if (err) {
            console.error("Database error during login:", err);
            return res.status(500).send("Login failed.");
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (role === "mentor") {
            req.session.user = {
                type: "mentor",
                id: user.mentor_id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                email: user.email,
                specialization: user.specialization
            };
            return res.json({ success: true, message: `Welcome back, Mentor ${user.first_name}!` });
        }

        req.session.user = {
            type: "student",
            id: user.student_id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            email: user.email,
            major: user.major
        };

        res.json({ success: true, message: `Welcome back, ${user.first_name}!` });
    });
});

// Create a new course
app.post("/api/mentor/create-course", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const { course_name, course_code, description } = req.body;

    if (!course_name || !course_code) {
        return res.status(400).json({ success: false, message: "Course name and code are required." });
    }

    const instructor = `${req.session.user.first_name} ${req.session.user.last_name}`;
    const sql = "INSERT INTO courses (course_name, course_code, instructor, description) VALUES (?, ?, ?, ?)";
    db.query(sql, [course_name, course_code, instructor, description || null], (err, result) => {
        if (err) {
            console.error("Database error creating course:", err);
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ success: false, message: "Course code already exists." });
            }
            return res.status(500).json({ success: false, message: `Unable to create course: ${err.message || err}` });
        }

        const courseId = result.insertId;
        const enrollSql = "INSERT IGNORE INTO enrollments (student_id, course_id) SELECT student_id, ? FROM students";
        db.query(enrollSql, [courseId], (enrollErr) => {
            if (enrollErr) {
                console.error("Database error enrolling students:", enrollErr);
                return res.json({ success: true, message: "Course created but auto-enrollment failed." });
            }

            res.json({ success: true, message: "Course created and all students enrolled successfully.", courseId: courseId });
        });
    });
});

// Create schedule for a course
app.post("/api/mentor/create-schedule", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const { course_id, schedule_day, schedule_time, location, meeting_link } = req.body;

    if (!course_id || !schedule_day || !schedule_time || !location || !meeting_link) {
        return res.status(400).json({ success: false, message: "All schedule fields are required." });
    }

    const sql = "INSERT INTO schedules (course_id, schedule_day, schedule_time, location, meeting_link) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [course_id, schedule_day, schedule_time, location, meeting_link], (err, result) => {
        if (err) {
            console.error("Database error creating schedule:", err);
            return res.status(500).json({ success: false, message: "Unable to create schedule" });
        }

        res.json({ success: true, message: "Schedule created successfully.", scheduleId: result.insertId });
    });
});

app.get("/api/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    res.json({ success: true, user: req.session.user });
});

app.get("/api/courses", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const sql = "SELECT * FROM courses ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database error fetching courses:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch courses" });
        }
        res.json({ success: true, courses: results });
    });
});

app.get("/api/schedule", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const sql = `SELECT s.id, s.schedule_day, s.schedule_time, s.location, s.meeting_link, 
                        c.id as course_id, c.course_name, c.course_code, c.instructor 
                 FROM schedules s 
                 JOIN courses c ON s.course_id = c.id 
                 ORDER BY s.id DESC`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database error fetching schedule:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch schedule" });
        }
        res.json({ success: true, schedule: results });
    });
});

// Update schedule
app.post("/api/mentor/update-schedule", (req, res) => {
    if (!req.session.user || req.session.user.type !== "mentor") {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const { schedule_id, schedule_day, schedule_time, location, meeting_link } = req.body;
    if (!schedule_id || !schedule_day || !schedule_time || !location || !meeting_link) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const sql = `UPDATE schedules SET schedule_day = ?, schedule_time = ?, location = ?, meeting_link = ? WHERE id = ?`;
    db.query(sql, [schedule_day, schedule_time, location, meeting_link, schedule_id], (err, result) => {
        if (err) {
            console.error("Database error updating schedule:", err);
            return res.status(500).json({ success: false, message: "Unable to update schedule" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Schedule not found." });
        }

        res.json({ success: true, message: "Schedule updated successfully." });
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Could not log out" });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully" });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});