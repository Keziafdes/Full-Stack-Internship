
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Read form data
app.use(express.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.use("/style.css", express.static(path.join(__dirname, "views", "style.css")));

// Display the home page
app.get("/", (req, res) => {
    res.render("index");
});

// Handle form submission

app.post("/submit", (req, res) => {
    const name = req.body.name;
    const email = req.body.email;

    res.render("success", { name, email });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
