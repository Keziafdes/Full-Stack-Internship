require("dotenv").config();

const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./database");
const NodeCache = require("node-cache");
require("./jobs");

require("./jobs");
const app = express();
const cache = new NodeCache({ stdTTL: 300 });
app.use((req, res, next) => {
    console.log(
        `${new Date().toISOString()} - ${req.method} ${req.url}`
    );
    next();
});
const PORT = 3000;

if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set. Using a local development secret.");
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again later."
    }
});

app.use("/api", apiLimiter);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: process.env.SESSION_SECRET || "local-development-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000
    }
}));

// Create the courses table and add starter courses if needed.
db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL
    );
`);

const courseCount = db.prepare("SELECT COUNT(*) AS count FROM courses").get().count;

if (courseCount === 0) {
    const insertCourse = db.prepare(
        "INSERT INTO courses (name, description) VALUES (?, ?)"
    );

    const addStarterCourses = db.transaction(() => {
        insertCourse.run("Web Development", "Learn HTML, CSS and JavaScript.");
        insertCourse.run("Python Programming", "Learn programming fundamentals with Python.");
        insertCourse.run("UI/UX Design", "Explore user interface and user experience design.");
    });

    addStarterCourses();
}

// Reusable authentication check.
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Please log in to perform this action."
        });
    }

    next();
}

// Serve CSS.
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "style.css"));
});

// Display pages.
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/courses", (req, res) => {
    res.render("courses");
});

app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

// Register a user and save their form submission.
app.post("/submit", async (req, res) => {
    try {
        const { name, email, age, course, password, confirmPassword } = req.body;

        const strongPassword =
            typeof password === "string" &&
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        const cleanName = typeof name === "string" ? name.trim() : "";
        const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        if (
            !cleanName ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
            !age ||
            !course ||
            !Number.isInteger(Number(age)) ||
            Number(age) < 16 ||
            Number(age) > 100
        ) {
            return res.status(400).send("Invalid registration details.");
        }

        if (!strongPassword) {
            return res.status(400).send("Password must be at least 8 characters and include uppercase, lowercase, number and special character.");
        }

        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match.");
        }

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(cleanEmail);

        if (existingUser) {
            return res.status(409).send("An account with this email already exists. Please log in.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const registerUser = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO users (name, email, password_hash)
                VALUES (?, ?, ?)
            `).run(cleanName, cleanEmail, passwordHash);

            const userId = Number(result.lastInsertRowid);

            db.prepare(`
                INSERT INTO submissions (user_id, name, email, age, course)
                VALUES (?, ?, ?, ?, ?)
            `).run(userId, cleanName, cleanEmail, Number(age), course);

            return userId;
        });

        const userId = registerUser();

        req.session.user = {
            id: userId,
            name: cleanName,
            email: cleanEmail
        };

        res.render("success", {
            student: {
                name: cleanName,
                email: cleanEmail,
                age: Number(age),
                course
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).send("An account with this email already exists.");
        }

        res.status(500).send("Registration failed. Please try again.");
    }
});

// Log in an existing user.
app.post("/login", async (req, res) => {
    try {
        const email = typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";
        const password = req.body.password;

        if (!email || typeof password !== "string") {
            return res.status(400).render("login", {
                error: "Enter your email and password."
            });
        }

        const user = db.prepare(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?"
        ).get(email);

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).render("login", {
                error: "Invalid email or password."
            });
        }

        // Regenerate the session to help prevent session fixation.
        req.session.regenerate((err) => {
            if (err) {
                console.error("Session error:", err.message);
                return res.status(500).send("Could not create a login session.");
            }

            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email
            };

            req.session.save((saveError) => {
                if (saveError) {
                    return res.status(500).send("Could not save your login session.");
                }

                res.redirect("/courses");
            });
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).send("Login failed. Please try again.");
    }
});

// Log out.
app.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);

        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

// API: get all courses.
app.get("/api/books", async (req, res) => {
    const query = typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";
        const cacheKey = `books_${query.toLowerCase()}`;

if (cache.has(cacheKey)) {
    console.log("Cache HIT:", cacheKey);
    return res.json(cache.get(cacheKey));
}

console.log("Cache MISS:", cacheKey);

    if (!query || query.length > 100) {
        return res.status(400).json({
            error: "Enter a search term of 1 to 100 characters."
        });
    }

    try {
        const url = new URL("https://openlibrary.org/search.json");
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "10");

        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            return res.status(502).json({
                error: "The book service is temporarily unavailable."
            });
        }

        const data = await response.json();
        const results = {
    results: (data.docs || []).map(book => ({
        title: book.title || "Untitled",
        authors: book.author_name || [],
        year: book.first_publish_year || null
    }))
};

cache.set(cacheKey, results);
return res.json(results);

        
    } catch (error) {
        console.error("Book API error:", error.message);

        res.status(502).json({
            error: "Could not connect to the book service. Please try again."
        });
    }
});


app.get("/api/courses", (req, res) => {
    const courses = db.prepare(
        "SELECT id, name, description FROM courses ORDER BY id"
    ).all();

    res.json(courses);
});

// API: get one course.
app.get("/api/courses/:id", (req, res) => {
    const course = db.prepare(
        "SELECT id, name, description FROM courses WHERE id = ?"
    ).get(Number(req.params.id));

    if (!course) {
        return res.status(404).json({ error: "Course not found." });
    }

    res.json(course);
});

// All course modifications require authentication.
app.post("/api/courses", requireLogin, (req, res) => {
    const { name, description } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim()
    ) {
        return res.status(400).json({
            error: "Course name and description are required."
        });
    }

    const result = db.prepare(
        "INSERT INTO courses (name, description) VALUES (?, ?)"
    ).run(name.trim(), description.trim());

    const course = db.prepare(
        "SELECT id, name, description FROM courses WHERE id = ?"
    ).get(Number(result.lastInsertRowid));

    res.status(201).json(course);
});

app.put("/api/courses/:id", requireLogin, (req, res) => {
    const { name, description } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim()
    ) {
        return res.status(400).json({
            error: "Course name and description are required."
        });
    }

    const result = db.prepare(`
        UPDATE courses
        SET name = ?, description = ?
        WHERE id = ?
    `).run(name.trim(), description.trim(), Number(req.params.id));

    if (result.changes === 0) {
        return res.status(404).json({ error: "Course not found." });
    }

    const course = db.prepare(
        "SELECT id, name, description FROM courses WHERE id = ?"
    ).get(Number(req.params.id));

    res.json(course);
});

app.delete("/api/courses/:id", requireLogin, (req, res) => {
    const course = db.prepare(
        "SELECT id, name, description FROM courses WHERE id = ?"
    ).get(Number(req.params.id));

    if (!course) {
        return res.status(404).json({ error: "Course not found." });
    }

    db.prepare("DELETE FROM courses WHERE id = ?").run(Number(req.params.id));

    res.json({
        message: "Course deleted successfully.",
        course
    });
});

// Start server.
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});