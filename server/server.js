import express from "express";
import dotenv from "dotenv";
// Load env vars
dotenv.config();
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js"
import aiRoutes from "./routes/aiRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import appointmentsRouter from "./routes/appointmentRoutes.js";
import blockchainRoutes from './routes/blockchain.js';



// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS","DELETE","PUT","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  
app.use(express.json());

// app.use((req, res, next) => {
//   console.log("🌐 Incoming:", req.method, req.url);
//   next();
// });


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/ai", aiRoutes); 
app.use("/api/access", accessRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/appointments", appointmentsRouter);
app.use('/api/blockchain', blockchainRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("CureConnect Backend is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
