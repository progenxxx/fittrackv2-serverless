const path = require("path");

module.exports = (app) => {
    app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
    app.get("/exercise", (req, res) => res.sendFile(path.join(__dirname, "../public/excercise.html")));
    app.get("/stats", (req, res) => res.sendFile(path.join(__dirname, "../public/stats.html")));
    app.get("/history", (req, res) => res.sendFile(path.join(__dirname, "../public/history.html")));
};
