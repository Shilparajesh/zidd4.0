// ZiDD 4.0 · DevOps Jadeja (@devops_jadeja) · github.com/jadeja-rajpal
// A tiny Express app for Task 3. Change MESSAGE and rebuild to watch the layer cache work.
const express = require("express");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const MESSAGE = "Hello from ZiDD 4.0 · DevOps Jadeja";

app.get("/", (req, res) => {
  res.send(`<h1>${MESSAGE}</h1><p>Container: ${os.hostname()} · User: ${os.userInfo().username}</p>`);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", container: os.hostname(), time: new Date().toISOString() });
});

// Stop cleanly when Docker sends SIGTERM (docker stop)
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down");
  process.exit(0);
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
