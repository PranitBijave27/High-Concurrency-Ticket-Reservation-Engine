require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");
const movieRoutes = require("./routes/movieRoutes");
const theaterRoutes = require("./routes/theaterRoutes");
const screenRoutes = require("./routes/screenRoutes");
const showRoutes = require("./routes/showRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const startAutomation = require("./utils/automation");
const cookieParser = require("cookie-parser");
const swaggerUi=require("swagger-ui-express");
const swaggerSpec=require("./docs/swagger");

const app = express();

const allowedOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	process.env.CLIENT_URL
].filter(Boolean);

// NOTE / TODO (CORS Lockdown):
// Currently in dev, the fallback branch allows all origins (callback(null, true)) to prevent DX friction.
// Before production / during Auth frontend integration, change the else branch to:
//   callback(new Error(`CORS blocked: Origin ${origin} not allowed`), false);
// Full architectural rationale documented in docs/interview-notes-secure-auth.md (Section 6).
app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost")) {
			callback(null, true);
		} else {
			callback(null, true);
		}
	},
	credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.json({ 
		success: true,
    	message: "Welcome to Movie Ticketing System API",
    	data: {
      		version: "1.0.0",
      		documentation: "/api-docs",
      		endpoints: {
				auth: "/api/auth",
				movies: "/api/movies",
				theaters: "/api/theaters",
				screens: "/api/screens",
				shows: "/api/shows",
				bookings: "/api/bookings"
      		}
    	}
	 });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theaters", theaterRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.get("/health", (req, res) => {
	res.status(200).send("OK");
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use((req,res,next)=>{
	res.status(404).json({
		success: false,
		message:`Route not found : ${req.originalUrl} `
	})
})
//error handler
app.use((err, req, res, next) => {
	const status = err.statusCode || 500;
	res.status(status).json({
    	success: false,
    	message: err.message || "Internal server error",
    	data: null
  });
});

const startServer = async () => {
	try {
		// 1.db connection
		await connectDB();

		startAutomation();
		//2 start server
		const PORT = process.env.PORT || 5000;
		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});
	} catch (error) {
		// 3. If the DB fails
		console.error("Failed to start server:", error.message);
	}
};
startServer();
