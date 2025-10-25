import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, required: true },
  phoneNo: { type: String, required: true },
  speciality: { type: String, required: true },
  certifications: { type: String },
  email: { type: String, required: true },
  licenceNo: { type: String, required: true },
  experience: { type: Number, required: true } // in years
}, { timestamps: true });

export default mongoose.model("DoctorProfile", doctorProfileSchema);
