import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // patientId or doctorId
    senderName: { type: String },
    message: { type: String, required: true },
    type: { type: String, enum: ["access", "system"], default: "system" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
