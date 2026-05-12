import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Prescription from "./src/models/Prescription.ts";
import SafetyCheck from "./src/models/SafetyCheck.ts";
import User from "./src/models/User.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("CRITICAL: MONGODB_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (err: any) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  app.use(express.json());

  const JWT_SECRET = process.env.JWT_SECRET || "mediguard_secret_key";

  // Auth Middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword });
      await user.save();
      
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
      const userObj = user.toObject();
      delete userObj.password;
      res.status(201).json({ token, user: userObj });
    } catch (err: any) {
      res.status(400).json({ error: "Signup failed. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password!))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
      const userObj = user.toObject();
      delete userObj.password;
      res.json({ token, user: userObj });
    } catch (err: any) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      mode: "Production (MongoDB Atlas)",
      message: "MediGuard AI Server is running" 
    });
  });

  app.get("/api/prescriptions", authMiddleware, async (req: any, res) => {
    try {
      const results = await Prescription.find({ userId: req.userId });
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  app.post("/api/prescriptions", authMiddleware, async (req: any, res) => {
    try {
      const newPres = new Prescription({ ...req.body, userId: req.userId });
      const saved = await newPres.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({ error: "Failed to create" });
    }
  });

  app.patch("/api/prescriptions/:id/toggle", authMiddleware, async (req: any, res) => {
    try {
      const p = await Prescription.findOne({ _id: req.params.id, userId: req.userId });
      if (!p) return res.status(404).send();
      p.status = p.status === 'taken' ? 'pending' : 'taken';
      await p.save();
      res.json(p);
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });
  
  app.patch("/api/prescriptions/:id", authMiddleware, async (req: any, res) => {
    try {
      const p = await Prescription.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { $set: req.body },
        { new: true }
      );
      if (!p) return res.status(404).send();
      res.json(p);
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.delete("/api/prescriptions/:id", authMiddleware, async (req: any, res) => {
    try {
      console.log(`[Server] Deleting prescription: ${req.params.id} for user: ${req.userId}`);
      const result = await Prescription.deleteOne({ _id: req.params.id, userId: req.userId });
      console.log(`[Server] Delete result:`, result);
      if (result.deletedCount === 0) {
        console.warn(`[Server] No prescription found with ID: ${req.params.id} for user: ${req.userId}`);
        return res.status(404).send();
      }
      res.status(204).send();
    } catch (err) {
      console.error(`[Server] Delete error:`, err);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // Safety Check Routes
  app.get("/api/safety-checks", authMiddleware, async (req: any, res) => {
    try {
      const results = await SafetyCheck.find({ userId: req.userId }).sort({ date: -1 });
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch safety checks" });
    }
  });

  app.post("/api/safety-checks", authMiddleware, async (req: any, res) => {
    try {
      const newCheck = new SafetyCheck({ ...req.body, userId: req.userId });
      const saved = await newCheck.save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({ error: "Failed to save safety check" });
    }
  });

  app.delete("/api/safety-checks/:id", authMiddleware, async (req: any, res) => {
    try {
      await SafetyCheck.deleteOne({ _id: req.params.id, userId: req.userId });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // User Profiles
  app.get("/api/profile", authMiddleware, async (req: any, res) => {
    try {
      const user = await User.findById(req.userId).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", authMiddleware, async (req: any, res) => {
    try {
      const { conditions, allergies, name, bloodType, height, weight, gender, age, nextVisit, notificationsEnabled, phone } = req.body;
      const updatedUser = await User.findByIdAndUpdate(
        req.userId,
        { $set: { conditions, allergies, name, bloodType, height, weight, gender, age, nextVisit, notificationsEnabled, phone } },
        { new: true }
      ).select("-password");
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediGuard AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
