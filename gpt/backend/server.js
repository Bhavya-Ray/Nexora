import express from "express";
import cors from "cors";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dbQuery, dbRun } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

/* -------------------------------- */
/* Multer Configuration             */
/* -------------------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname); // Save to backend folder for simplicity
  },
  filename: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    const filename = isPdf ? "current_context.pdf" : `upload_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

/* -------------------------------- */
/* Helper to spawn Python script    */
/* -------------------------------- */

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [path.join(__dirname, scriptName), ...args]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python Script ${scriptName} Error Output:`, errorOutput);
        try {
          const parsed = JSON.parse(output);
          reject(new Error(parsed.error || `Python exited with code ${code}`));
        } catch {
          reject(new Error(`Python script failed (Code ${code}). ${errorOutput}`));
        }
      } else {
        try {
          const parsed = JSON.parse(output);
          if (parsed.error) reject(new Error(parsed.error));
          else resolve(parsed);
        } catch (e) {
          reject(new Error("Failed to parse Python output: " + output));
        }
      }
    });
  });
}

// Global state tracking whether we have a PDF loaded context
let isPdfContextActive = false;

/* -------------------------------- */
/* API Routes                       */
/* -------------------------------- */

// Get all chats
app.get("/api/chats", async (req, res) => {
  try {
    const chats = await dbQuery("SELECT * FROM chats ORDER BY created_at DESC");
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new chat
app.post("/api/chats", async (req, res) => {
  const { id, title } = req.body;
  try {
    await dbRun("INSERT INTO chats (id, title) VALUES (?, ?)", [id, title]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update chat (rename or pin)
app.put("/api/chats/:id", async (req, res) => {
  const { id } = req.params;
  const { title, pinned } = req.body;
  try {
    if (title !== undefined) {
      await dbRun("UPDATE chats SET title = ? WHERE id = ?", [title, id]);
    }
    if (pinned !== undefined) {
      await dbRun("UPDATE chats SET pinned = ? WHERE id = ?", [pinned ? 1 : 0, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete chat
app.delete("/api/chats/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun("DELETE FROM chats WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a chat
app.get("/api/messages/:chatId", async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await dbQuery("SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC", [chatId]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------- */
/* Health Check Route               */
/* -------------------------------- */

app.get("/", (req, res) => {
  res.send("AI server running");
});

/* -------------------------------- */
/* PDF Upload Endpoint              */
/* -------------------------------- */

app.post("/upload-pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF uploaded" });
  }

  try {
    const filePath = path.join(__dirname, req.file.filename);

    const result = await runPythonScript("pdf_handler.py", ["--ingest", filePath]);

    isPdfContextActive = true;

    res.json({
      success: true,
      message: "PDF context successfully loaded into vector DB.",
      details: result
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF" });
  }
});

/* -------------------------------- */
/* Image Upload Endpoint            */
/* -------------------------------- */

app.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const filePath = path.join(__dirname, req.file.filename);

    const result = await runPythonScript("image_analyzer.py", [filePath]);

    res.json({
      success: true,
      message: "Image analyzed successfully.",
      filename: req.file.filename,
      reply: result.reply
    });
  } catch (error) {
    console.error("Image upload/analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to process image" });
  }
});

/* -------------------------------- */
/* Chat Endpoint                    */
/* -------------------------------- */

app.post("/chat", async (req, res) => {
  const { message, forceGeneralChat, imageFilename, chatId } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Message is required"
    });
  }

  // Save User message to DB
  if (chatId) {
    await dbRun("INSERT INTO messages (chat_id, role, text) VALUES (?, ?, ?)", [chatId, "user", message]);
  }

  let semanticMemory = "";
  try {
    const memoryResult = await runPythonScript("memory_manager.py", ["--get", message]);
    if (memoryResult.facts && memoryResult.facts.length > 0) {
      semanticMemory = "\n\nUser Stored Memory:\n" + memoryResult.facts.join("\n");
    }
  } catch (err) {
    console.error("Memory Retrieval Error:", err);
  }

  let finalReply = "";
  let contextUsed = false;

  // 1. Vision
  if (imageFilename) {
    try {
      const filePath = path.join(__dirname, imageFilename);
      const result = await runPythonScript("image_analyzer.py", [filePath, message]);
      finalReply = result.reply;
      contextUsed = true;
    } catch (error) {
      console.error("Vision AI Error:", error);
    }
  }

  // 2. PDF RAG
  if (!finalReply && isPdfContextActive && !forceGeneralChat) {
    try {
      const result = await runPythonScript("pdf_handler.py", ["--query", message]);
      finalReply = result.reply;
      contextUsed = true;
    } catch (error) {
      console.error("RAG Error:", error);
    }
  }

  // 3. General Chat with Semantic Memory
  if (!finalReply) {
    try {
      const ollamaResponse = await fetch(
        "http://127.0.0.1:11434/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama3",
            prompt: `
You are a helpful AI assistant.
${semanticMemory}

Guidelines:
- Answer clearly and naturally
- Use stored memory to personalize answers if relevant
- If memory doesn't apply, ignore it

User: ${message}

Assistant:
`,
            stream: false
          })
        }
      );

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        finalReply = data.response;
      }
    } catch (error) {
      console.error("Server error:", error);
    }
  }

  if (!finalReply) {
    return res.status(500).json({ error: "Failed to generate AI response" });
  }

  // Save AI response to DB
  if (chatId) {
    await dbRun("INSERT INTO messages (chat_id, role, text) VALUES (?, ?, ?)", [chatId, "assistant", finalReply]);
    
    // Auto-extract facts in the background
    runPythonScript("memory_manager.py", ["--extract", message]).catch(e => console.error("Extraction error:", e));
  }

  res.json({
    reply: finalReply,
    context_used: contextUsed
  });
});

/* -------------------------------- */
/* Start Server                     */
/* -------------------------------- */

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});