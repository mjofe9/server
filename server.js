// server.js — نسخة بدون تسجيل دخول. كل المسارات مفتوحة.

import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import Database from "better-sqlite3";
import { Luraph } from "luraph";

// ==================== DB SETUP ====================
const db = new Database("auth.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  enabled INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  script_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  max_uses INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  revoked INTEGER DEFAULT 0,
  FOREIGN KEY(script_id) REFERENCES scripts(id) ON DELETE CASCADE
);
`);

// ==================== APP ====================
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(process.cwd()));

// --- SCRIPTS ---
app.post("/api/scripts/upload", (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: "name+content required" });
  const existing = db.prepare("SELECT * FROM scripts WHERE name = ?").get(name);
  const now = Date.now();
  if (existing) {
    db.prepare("UPDATE scripts SET content=?, version=version+1, updated_at=? WHERE id=?").run(content, now, existing.id);
    res.json({ ok: true, script: db.prepare("SELECT id, name, version, enabled FROM scripts WHERE id=?").get(existing.id) });
  } else {
    db.prepare("INSERT INTO scripts (name, version, enabled, content, updated_at) VALUES (?,1,0,?,?)").run(name, content, now);
    res.json({ ok: true, script: db.prepare("SELECT id, name, version, enabled FROM scripts WHERE name=?").get(name) });
  }
});

app.get("/api/scripts", (req, res) => 
  res.json(db.prepare("SELECT id, name, version, enabled, updated_at FROM scripts ORDER BY id DESC").all())
);

app.post("/api/scripts/toggle", (req, res) => {
  const row = db.prepare("SELECT * FROM scripts WHERE name = ?").get(req.body.name);
  if (!row) return res.status(404).json({ error: "not found" });
  db.prepare("UPDATE scripts SET enabled = ? WHERE id = ?").run(req.body.enabled ? 1 : 0, row.id);
  res.json({ ok: true });
});

// --- KEYS ---
app.post("/api/keys/generate", (req, res) => {
  const { script_name, expiresInHours = 0, maxUses = 0 } = req.body;
  const s = db.prepare("SELECT * FROM scripts WHERE name = ?").get(script_name);
  if (!s) return res.status(404).json({ error: "script not found" });
  const key = "LF-" + crypto.randomBytes(4).toString("hex").toUpperCase() + "-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const expires = expiresInHours > 0 ? Date.now() + expiresInHours * 3600_000 : null;
  db.prepare("INSERT INTO keys (key, script_id, created_at, expires_at, max_uses) VALUES (?,?,?,?,?)")
    .run(key, s.id, Date.now(), expires, maxUses);
  res.json({ ok: true, key });
});

app.get("/api/keys", (req, res) => {
  const rows = db.prepare("SELECT k.*, s.name as script_name FROM keys k JOIN scripts s ON s.id=k.script_id ORDER BY k.id DESC").all();
  res.json(rows);
});

app.post("/api/keys/revoke", (req, res) => {
  db.prepare("UPDATE keys SET revoked=1 WHERE key=?").run(req.body.key);
  res.json({ ok: true });
});

app.post("/api/keys/enable", (req, res) => {
  db.prepare("UPDATE keys SET revoked=0 WHERE key=?").run(req.body.key);
  res.json({ ok: true });
});

// --- LOADER (Lua) ---
app.post("/api/loader/handshake", (req, res) => {
  const { key, script_name, client_version } = req.body;
  const k = db.prepare("SELECT * FROM keys WHERE key = ?").get(key);
  if (!k) return res.json({ ok: false, reason: "not_found" });
  if (k.revoked) return res.json({ ok: false, reason: "revoked" });
  if (k.expires_at && Date.now() > k.expires_at) return res.json({ ok: false, reason: "expired" });
  
  const s = db.prepare("SELECT * FROM scripts WHERE name = ?").get(script_name);
  if (!s) return res.json({ ok: false, reason: "script_not_found" });
  if (k.script_id !== s.id) return res.json({ ok: false, reason: "wrong_script" });
  if (!s.enabled) return res.json({ ok: false, reason: "script_disabled" });
  if (k.max_uses > 0 && k.uses >= k.max_uses) return res.json({ ok: false, reason: "used_up" });

  if (client_version !== s.version) db.prepare("UPDATE keys SET uses = uses + 1 WHERE id = ?").run(k.id);

  res.json({ ok: true, script: { name: s.name, version: s.version, url: `/api/loader/script/${encodeURIComponent(s.name)}?key=${key}` } });
});

app.get("/api/loader/script/:name", (req, res) => {
  const k = db.prepare("SELECT * FROM keys WHERE key = ?").get(req.query.key);
  if (!k || k.revoked) return res.status(403).send("-- revoked");
  const s = db.prepare("SELECT * FROM scripts WHERE name = ?").get(req.params.name);
  if (!s || !s.enabled || k.script_id !== s.id) return res.status(404).send("-- disabled");
  res.type("text/plain").send(s.content);
});

app.post("/api/loader/check", (req, res) => {
  const { key, script_name, client_version } = req.body;
  const k = db.prepare("SELECT * FROM keys WHERE key = ?").get(key);
  if (!k || k.revoked) return res.json({ alive: false });
  const s = db.prepare("SELECT * FROM scripts WHERE name = ?").get(script_name);
  if (!s || !s.enabled || k.script_id !== s.id) return res.json({ alive: false });
  if (client_version !== s.version) return res.json({ alive: true, update: { version: s.version, url: `/api/loader/script/${encodeURIComponent(s.name)}?key=${key}` } });
  res.json({ alive: true });
});

// --- OBFUSCATE ---
app.post("/api/obfuscate", async (req, res) => {
  if (!process.env.LPH_API_KEY) return res.status(500).json({ error: "LPH_API_KEY missing" });
  try {
    const luraph = new Luraph(process.env.LPH_API_KEY);
    const nodes = await luraph.getNodes();
    const { jobId } = await luraph.createNewJob(nodes.recommendedId, req.body.source, "script.lua", {});
    const { success, error } = await luraph.getJobStatus(jobId);
    if (!success) throw new Error(error);
    const { data } = await luraph.downloadResult(jobId);
    res.json({ ok: true, obfuscated: data });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[server] listening on ${port}`));
