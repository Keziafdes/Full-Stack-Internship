
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Read form data
app.use(express.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Load the stylesheet
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "style.css"));
});

// Temporary storage for valid submissions
const submissions = [];

// Display the registration form
app.get("/", (req, res) => {
    res.render("index");
});

// Validate and handle form submission
app.post("/submit", (req, res) => {
    const {
        name,
        email,
        age,
        course,
        password,
        confirmPassword
    } = req.body;

    const strongPassword =
        typeof password === "string" &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);

    // Server-side validation
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
        return res.status(400).send(
            "Invalid details. Check your name, email, age and course."
        );
    }

    if (!strongPassword) {
        return res.status(400).send(
            "Password must have at least 8 characters, uppercase, lowercase, a number and a symbol."
        );
    }

    if (
        typeof confirmPassword !== "string" ||
        password !== confirmPassword
    ) {
        return res.status(400).send(
            "Passwords do not match. Please go back and try again."
        );
    }

    // Store student details only; never store the plaintext password
    const student = {
        name: name.trim(),
        email: email.trim(),
        age: Number(age),
        course
    };

    submissions.push(student);

    res.render("success", { student });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
