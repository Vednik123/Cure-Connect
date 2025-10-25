import express from "express";
import multer from "multer";
import { protect } from "../middlewares/auth.js"; // make sure this path matches your project
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";
import Report from "../models/Report.js";
import Patient from "../models/Patient.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/report/upload
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    const { patientId, type } = req.body;

    if (!req.file || !patientId || !type) {
      return res.status(400).json({ message: "Patient ID, type, and file are required." });
    }

    // ✅ Step 1: Check if patient exists
    const patient = await Patient.findOne({patientId }) // or { patientId } depending on your schema
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Debug log
    console.log("Report upload request:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      patientId,
      type,
      uploader: req.user ? (req.user._id || req.user.id) : null,
    });

    // ✅ Step 2: Upload to Cloudinary
    const uploaded = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // ✅ Step 3: Save report
    const report = new Report({
      patientId,
      type,
      url: uploaded.secure_url,
      filename: req.file.originalname,
      uploadedBy: req.user?._id || req.user?.id,
    });

    await report.save();

    res.status(200).json({ message: "Report uploaded successfully", report });
  } catch (err) {
    console.error("Report upload error:", err);
    res.status(500).json({ message: "Something went wrong while uploading the report." });
  }
});


router.get("/patient/:patientId", protect, async (req, res) => {
  try {
    const { patientId } = req.params
    const reports = await Report.find({ patientId }).sort({ createdAt: -1 })
    if (!reports.length) return res.status(404).json({ message: "No reports found" })
    res.status(200).json(reports)
  } catch (err) {
    console.error("Fetch reports error:", err)
    res.status(500).json({ message: "Server error" })
  }
})

router.delete("/:reportId", protect, async (req, res) => {
  try {
    const { reportId } = req.params
    const report = await Report.findById(reportId)
    if (!report) return res.status(404).json({ message: "Report not found" })

    await report.deleteOne()
    res.status(200).json({ message: "Report deleted successfully" })
  } catch (err) {
    console.error("Delete report error:", err)
    res.status(500).json({ message: "Failed to delete report" })
  }
})

export default router;
