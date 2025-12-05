// controllers/accessController.js
import AccessRequest from "../models/AccessRequest.js";
import Notification from "../models/Notification.js";
import Patient from "../models/Patient.js";
import DoctorProfile from "../models/DoctorProfile.js";

export const sendAccessRequest = async (req, res) => {
  try {
    const { patientId } = req.body;          // PAT code (e.g. PAT688885)
    const doctorUser = req.user;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patient = await Patient.findOne({ patientId: patientId.trim() });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const doctorProfile = await DoctorProfile.findOne({ user: doctorUser._id });
    const doctorName = doctorProfile?.name || "Unknown Doctor";

    const newRequest = await AccessRequest.create({
      doctorId: doctorUser._id,
      doctorName,
      patientId: patient.user,        // User _id of patient
    });

    await Notification.create({
      userId: patient.user,           // notify that patient user
      senderName: doctorName,
      message: `Access request from Dr. ${doctorName}`,
      type: "access",
      relatedRequestId: newRequest._id,   // ⭐ link to AccessRequest
    });

    res.json({
      message: "Access request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send access request" });
  }
};


/**
 * Patient responds to access request
 */
export const respondAccessRequest = async (req, res) => {
  try {
    const { requestId, response } = req.body;
    const patient = req.user;

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({ message: "Invalid response" });
    }

    request.status = response;
    if (response === "accepted") {
      //  request.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hr real time
      request.expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute for testing
    }
    await request.save();

    // ⭐ Mark all related notifications as read
    await Notification.updateMany(
      { relatedRequestId: requestId, userId: patient._id },
      { read: true }
    );

    await Notification.create({
      userId: request.doctorId,
      senderName: patient.name,
      message: `Your access request was ${response} by ${patient.name}`,
      type: "access",
    });

    res.json({ message: `Access ${response} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to respond to request" });
  }
};

/**
 * Middleware to verify access validity before fetching patient data
 */
export const verifyDoctorAccess = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const { patientId } = req.params;          // this is PAT code

    const patient = await Patient.findOne({ patientId: patientId.trim() });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const access = await AccessRequest.findOne({
      doctorId,
      patientId: patient.user,                 // user _id
      status: "accepted",
      expiresAt: { $gt: new Date() },
    });

    if (!access) {
      return res
        .status(403)
        .json({ message: "Access not granted or expired" });
    }

    // optionally attach resolved userId for downstream handlers
    req.resolvedPatientUserId = patient.user;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error checking access" });
  }
};

export const checkDoctorAccess = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { patientId } = req.params;          // PAT code

    const patient = await Patient.findOne({ patientId: patientId.trim() });
    if (!patient) {
      return res.status(404).json({ allowed: false, message: "Patient not found" });
    }

    const access = await AccessRequest.findOne({
      doctorId,
      patientId: patient.user,
      status: "accepted",
      expiresAt: { $gt: new Date() },
    });

    res.json({ allowed: !!access });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error verifying access" });
  }
};