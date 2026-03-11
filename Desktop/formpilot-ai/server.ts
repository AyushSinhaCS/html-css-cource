import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Use the PORT provided by Render
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent database path for Render
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

// API Routes
app.post("/api/forms", (req, res) => {
  try {
    const { id, title, questions } = req.body;
    const stmt = db.prepare("INSERT INTO forms (id, title, questions) VALUES (?, ?, ?)");
    stmt.run(id, title, JSON.stringify(questions));
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save form" });
  }
});

app.get("/api/forms/:id", (req, res) => {
  try {
    const form = db.prepare("SELECT * FROM forms WHERE id = ?").get(req.params.id) as any;
    if (!form) return res.status(404).json({ error: "Form not found" });
    res.json({ ...form, questions: JSON.parse(form.questions) });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch form" });
  }
});
const PORT = 10000; // Force it to 10000, no fallback

async function startServer() {
  // Always serve the production files on Render
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  
  // Handle the /form/:id links
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  // Start the server on port 10000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`--- CRITICAL: SERVER IS LIVE ON PORT ${PORT} ---`);
  });
}

startServer();