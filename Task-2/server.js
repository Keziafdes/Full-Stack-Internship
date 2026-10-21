

const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Read form data
app.use(express.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Temporary storage for valid submissions
const submissions = [];

// Display the registration form
app.get("/", (req, res) => {
    res.render("index");
});

// Validate and handle form submission
app.post("/submit", (req, res) => {
    const { name, email, age, course } = req.body;

    // Server-side validation
    if (
        !name || !email || !age || !course ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 16 ||
        Number(age) > 100
    ) {
        return res.status(400).send(
            "Invalid details. Check your name, email, age and course."
        );
    }

    // Store validated data temporarily
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
