
const cron = require("node-cron");

let jobsProcessed = 0;

// Run a background task every minute
cron.schedule("* * * * *", () => {
    jobsProcessed++;

    console.log(
        `[Background Job] Completed job number ${jobsProcessed} at ${new Date().toLocaleString()}`
    );
});

console.log("Background job scheduler started.");

module.exports = { cron };
