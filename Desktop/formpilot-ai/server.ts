import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

// Fix for __dirname in ES Modules (required for your project type)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize SQLite Database
// On Render, we use the persistent disk path if DISK_PATH is set
const dbPath = process.env.DISK_PATH 
  ? path.join(process.env.DISK_PATH, "forms.db") 
  : path.join(__dirname, "forms.db");

const db = new Database(dbPath);

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    questions TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms (id)
  );
`);

// --- API ROUTES ---

app.post("/api/forms", (req, res) => {
  try {
    const { id, title, questions } = req.body;
    const stmt = db.prepare("INSERT INTO forms (id, title, questions) VALUES (?, ?, ?)");
    stmt.run(id, title, JSON.stringify(questions));
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save form", details: error.message });
  }
});

app.get("/api/forms/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("SELECT * FROM forms WHERE id = ?");
    const form = stmt.get(id) as any;
    if (!form) return res.status(404).json({ error: "Form not found" });
    res.json({ ...form, questions: JSON.parse(form.questions) });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

app.post("/api/responses", (req, res) => {
  try {
    const { formId, answers } = req.body;
    const stmt = db.prepare("INSERT INTO responses (form_id, answers) VALUES (?, ?)");
    stmt.run(formId, JSON.stringify(answers));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to submit response" });
  }
});

app.get("/api/forms/:id/responses", (req, res) => {
  try {
    const { id } = req.params;
    const formStmt = db.prepare("SELECT * FROM forms WHERE id = ?");
    const form = formStmt.get(id) as any;
    const stmt = db.prepare("SELECT * FROM responses WHERE form_id = ? ORDER BY created_at DESC");
    const responses = stmt.all(id) as any[];
    res.json({
      form: { ...form, questions: JSON.parse(form.questions) },
      responses: responses.map(r => ({ ...r, answers: JSON.parse(r.answers) }))
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch responses" });
  }
});

// --- SERVER START & STATIC FILES ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    
    // 1. Serve built frontend files
    app.use(express.static(distPath));

    // 2. THE FIX: Catch-all route to serve index.html for any frontend route
    // This allows React Router to handle links like /forms/:id
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();