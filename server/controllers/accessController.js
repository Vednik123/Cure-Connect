import AccessRequest from "../models/AccessRequest.js";
import Notification from "../models/Notification.js";

/**
 * Doctor sends access request to a patient
 */
export const sendAccessRequest = async (req, res) => {
  try {
    const { patientId } = req.body;
    const doctor = req.user;

    if (!patientId)
      return res.status(400).json({ message: "Patient ID is required" });

    const newRequest = await AccessRequest.create({
      doctorId: doctor._id,
      doctorName: doctor.name,
      patientId,
    });

    await Notification.create({
      userId: patientId,
      senderName: doctor.name,
      message: `Access request from Dr. ${doctor.name}`,
      type: "access",
    });

    res.json({ message: "Access request sent successfully", request: newRequest });
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
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.patientId !== patient.patientId)
      return res.status(403).json({ message: "Unauthorized action" });

    if (!["accepted", "rejected"].includes(response))
      return res.status(400).json({ message: "Invalid response" });

    request.status = response;
    if (response === "accepted") {
      request.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // valid for 1 hour
    }
    await request.save();

    await Notification.create({
      userId: request.doctorId.toString(),
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
    const { patientId } = req.params;

    const access = await AccessRequest.findOne({
      doctorId,
      patientId,
      status: "accepted",
      expiresAt: { $gt: new Date() },
    });

    if (!access)
      return res.status(403).json({ message: "Access not granted or expired" });

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error checking access" });
  }
};

/**
 * Check if doctor has access (for frontend verification)
 */
export const checkDoctorAccess = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { patientId } = req.params;

    const access = await AccessRequest.findOne({
      doctorId,
      patientId,
      status: "accepted",
      expiresAt: { $gt: new Date() },
    });

    res.json({ allowed: !!access });
  } catch (error) {
    res.status(500).json({ message: "Error verifying access" });
  }
};
