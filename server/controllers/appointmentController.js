// controllers/appointmentController.js
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import DoctorProfile from "../models/DoctorProfile.js";
import mongoose from "mongoose";

/**
 * Helper: resolve patient by either PATxxxxx or Mongo _id
 */
async function resolvePatient(input) {
  if (!input) return null;
  // If looks like Mongo ObjectId
  if (mongoose.Types.ObjectId.isValid(input)) {
    const p = await Patient.findById(input);
    if (p) return p;
  }
  // else try patientId (PATxxxxx)
  return await Patient.findOne({ patientId: input });
}

/**
 * Helper: resolve doctor by either DOCxxxxx or Mongo _id
 */
async function resolveDoctor(input) {
  if (!input) return null;
  if (mongoose.Types.ObjectId.isValid(input)) {
    const d = await DoctorProfile.findById(input);
    if (d) return d;
  }
  // else try doctorId (DOCxxxxx)
  return await DoctorProfile.findOne({ doctorId: input });
}

/**
 * POST /api/appointments
 * Body: { patientId, doctorId, preferredDate, preferredTime, notes }
 */
// replace ONLY the createAppointment function in controllers/appointmentController.js
export async function createAppointment(req, res) {
  try {
    console.log("➡️  POST /api/appointments - body:", JSON.stringify(req.body));

    const { patientId, doctorId, preferredDate, preferredTime, notes } = req.body;

    if (!patientId || !doctorId || !preferredDate || !preferredTime) {
      console.warn("⚠️  Validation failed - missing fields:", {
        patientId: !!patientId,
        doctorId: !!doctorId,
        preferredDate: !!preferredDate,
        preferredTime: !!preferredTime,
      });
      return res.status(400).json({ message: "patientId, doctorId, preferredDate and preferredTime are required." });
    }

    const patient = await resolvePatient(patientId);
    console.log("🔎 Resolved patient:", patient ? { _id: patient._id.toString(), patientId: patient.patientId } : null);
    if (!patient) return res.status(404).json({ message: "Patient not found." });

    const doctor = await resolveDoctor(doctorId);
    console.log("🔎 Resolved doctor:", doctor ? { _id: doctor._id.toString(), doctorId: doctor.doctorId } : null);
    if (!doctor) return res.status(404).json({ message: "Doctor not found." });

    const appt = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      preferredDate,
      preferredTime,
      notes: notes || "",
    });

    const saved = await appt.save().catch((e) => {
      console.error("❌ save() error:", e);
      throw e;
    });

    await saved.populate([
      { path: "patient", select: "patientId name" },
      { path: "doctor", select: "doctorId name" },
    ]);

    console.log("✅ Appointment saved:", { id: saved._id.toString(), appointmentId: saved.appointmentId });
    return res.status(201).json({ message: "Appointment created.", appointment: saved });
  } catch (err) {
    console.error("💥 createAppointment error:", err);
    if (err && err.code === 11000) {
      return res.status(500).json({ message: "Duplicate appointment id, try again.", detail: err.keyValue || err });
    }
    return res.status(500).json({ message: "Server error.", detail: err.message || String(err) });
  }
}
