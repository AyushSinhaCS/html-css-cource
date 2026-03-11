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
// Use the PORT environment variable provided by Render or default to 3000
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize SQLite Database with a path that supports Render's persistent disk
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

// API Routes

// Save Form
app.post("/api/forms", (req, res) => {
  try {
    const { id, title, questions } = req.body;
    if (!id || !title || !questions) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const stmt = db.prepare("INSERT INTO forms (id, title, questions) VALUES (?, ?, ?)");
    stmt.run(id, title, JSON.stringify(questions));

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Error saving form:", error);
    res.status(500).json({ error: "Failed to save form", details: error.message });
  }
});

// Get Form by ID
app.get("/api/forms/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("SELECT * FROM forms WHERE id = ?");
    const form = stmt.get(id) as any;

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({
      ...form,
      questions: JSON.parse(form.questions),
    });
  } catch (error: any) {
    console.error("Error fetching form:", error);
    res.status(500).json({ error: "Failed to fetch form", details: error.message });
  }
});

// Submit Response
app.post("/api/responses", (req, res) => {
  try {
    const { formId, answers } = req.body;
    if (!formId || !answers) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const stmt = db.prepare("INSERT INTO responses (form_id, answers) VALUES (?, ?)");
    stmt.run(formId, JSON.stringify(answers));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error submitting response:", error);
    res.status(500).json({ error: "Failed to submit response", details: error.message });
  }
});

// Get Responses by Form ID
app.get("/api/forms/:id/responses", (req, res) => {
  try {
    const { id } = req.params;
    
    const formStmt = db.prepare("SELECT * FROM forms WHERE id = ?");
    const form = formStmt.get(id) as any;
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const stmt = db.prepare("SELECT * FROM responses WHERE form_id = ? ORDER BY created_at DESC");
    const responses = stmt.all(id) as any[];

    res.json({
      form: {
        ...form,
        questions: JSON.parse(form.questions)
      },
      responses: responses.map(r => ({
        ...r,
        answers: JSON.parse(r.answers)
      }))
    });
  } catch (error: any) {
    console.error("Error fetching responses:", error);
    res.status(500).json({ error: "Failed to fetch responses", details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the 'dist' directory in production
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Catch-all route to serve index.html for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();