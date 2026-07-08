const express = require("express");
const cors = require("cors");
const helpRequestsRouter = require("./modules/helpRequests/helpRequests.routes");
const emergenciesRouter = require("./modules/emergencies/emergencies.routes");
const authRouter = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/help-requests", helpRequestsRouter);
app.use("/api/emergencies", emergenciesRouter);
app.use("/api/auth", authRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
