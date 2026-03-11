import express from "express";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 10000; // WE ARE HARD-CODING THIS TO FIX THE RENDER TIMEOUT

app.use(express.json());

const dbPath = process.env.DISK_PATH 
  ? path.join(process.env.DISK_PATH, "forms.db") 
  : path.join(__dirname, "forms.db");

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, questions TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, form_id TEXT NOT NULL, answers TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (form_id) REFERENCES forms (id)
  );
`);

app.post("/api/forms", (req, res) => {
  const { id, title, questions } = req.body;
  const stmt = db.prepare("INSERT INTO forms (id, title, questions) VALUES (?, ?, ?)");
  stmt.run(id, title, JSON.stringify(questions));
  res.json({ success: true, id });
});

app.get("/api/forms/:id", (req, res) => {
  const form = db.prepare("SELECT * FROM forms WHERE id = ?").get(req.params.id) as any;
  if (!form) return res.status(404).json({ error: "Not found" });
  res.json({ ...form, questions: JSON.parse(form.questions) });
});

// ALWAYS SERVE PRODUCTION FILES ON RENDER
const distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`--- CRITICAL: SERVER IS LIVE ON PORT ${PORT} ---`);
});