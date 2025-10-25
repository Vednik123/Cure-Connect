import express from "express";
import multer from "multer";
import {
  getAIResponse,
  getDietFromText,
  getDietFromReport,
  summarizeReport,
} from "../controllers/aiController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🩺 Text-based health assistant
router.post("/health", getAIResponse);

// 🍎 Diet routes
router.post("/diet-text", getDietFromText);
router.post("/diet-report", upload.single("file"), getDietFromReport);

// 🧾 Summarize report
router.post("/summarize", summarizeReport); 

export default router;
