
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");

// Serve CSS
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "style.css"));
});

// Temporary storage
const submissions = [];

let courses = [
    {
        id: 1,
        name: "Web Development",
        description: "Learn to build websites using HTML, CSS and JavaScript."
    },
    {
        id: 2,
        name: "Python Programming",
        description: "Learn programming fundamentals with Python."
    },
    {
        id: 3,
        name: "UI/UX Design",
        description: "Explore user interface and user experience design."
    }
];

let nextCourseId = 4;

// Display LearnSpace
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/courses", (req, res) => {
    res.render("courses");
});

// Registration form
app.post("/submit", (req, res) => {
    const {
        name, email, age, course,
        password, confirmPassword
    } = req.body;

    const strongPassword =
        typeof password === "string" &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);

    if (
        !name?.trim() ||
        !email?.trim() ||
        !age ||
        !course ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 16 ||
        Number(age) > 100
    ) {
        return res.status(400).send("Invalid registration details.");
    }

    if (!strongPassword) {
        return res.status(400).send("Password does not meet the strength requirements.");
    }

    if (
        typeof confirmPassword !== "string" ||
        password !== confirmPassword
    ) {
        return res.status(400).send("Passwords do not match.");
    }

    const student = {
        name: name.trim(),
        email: email.trim(),
        age: Number(age),
        course
    };

    submissions.push(student);
    res.render("success", { student });
});

// API: Get all courses (READ)
app.get("/api/courses", (req, res) => {
    res.json(courses);
});

// API: Get one course (READ)
app.get("/api/courses/:id", (req, res) => {
    const course = courses.find(
        item => item.id === Number(req.params.id)
    );

    if (!course) {
        return res.status(404).json({ error: "Course not found." });
    }

    res.json(course);
});

// API: Add a course (CREATE)
app.post("/api/courses", (req, res) => {
    const { name, description } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim()
    ) {
        return res.status(400).json({
            error: "Course name and description are required."
        });
    }

    const course = {
        id: nextCourseId++,
        name: name.trim(),
        description: description.trim()
    };

    courses.push(course);
    res.status(201).json(course);
});

// API: Update a course (UPDATE)
app.put("/api/courses/:id", (req, res) => {
    const course = courses.find(
        item => item.id === Number(req.params.id)
    );

    if (!course) {
        return res.status(404).json({ error: "Course not found." });
    }

    const { name, description } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof description !== "string" || !description.trim()
    ) {
        return res.status(400).json({
            error: "Course name and description are required."
        });
    }

    course.name = name.trim();
    course.description = description.trim();

    res.json(course);
});

// API: Delete a course (DELETE)
app.delete("/api/courses/:id", (req, res) => {
    const index = courses.findIndex(
        item => item.id === Number(req.params.id)
    );

    if (index === -1) {
        return res.status(404).json({ error: "Course not found." });
    }

    const deletedCourse = courses.splice(index, 1)[0];
    res.json({
        message: "Course deleted successfully.",
        course: deletedCourse
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
