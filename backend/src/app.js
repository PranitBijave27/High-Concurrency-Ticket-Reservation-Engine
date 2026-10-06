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

const AppError = require("./utils/AppError");

const app = express();

// Trust reverse proxies (Render, Vercel, Heroku, Cloudflare) for HTTPS detection and secure cookies
app.set("trust proxy", 1);

// Whitelisted Origins:
// Supports comma-separated CLIENT_URL values from .env, trims trailing slashes, and includes dev origins
const configuredClientUrls = (process.env.CLIENT_URL || "")
	.split(",")
	.map((url) => url.trim().replace(/\/$/, ""))
	.filter(Boolean);

const defaultOrigins = [
	"http://localhost:5173",
	"http://localhost:5174",
	"http://127.0.0.1:5173",
	"http://127.0.0.1:5174"
];

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredClientUrls])];

// Production-Grade CORS Lockdown (Defends against Arbitrary Origin Reflection + Credential Theft)
app.use(cors({
	origin: (origin, callback) => {
		// 1. Allow server-to-server, health check, curl, Postman requests (missing Origin header)
		if (!origin) return callback(null, true);

		const cleanOrigin = origin.replace(/\/$/, "");

		// 2. Allow explicitly whitelisted origins
		if (allowedOrigins.includes(cleanOrigin)) {
			return callback(null, true);
		}

		// 3. Allow localhost/127.0.0.1 on any port only in development environment
		if (process.env.NODE_ENV !== "production") {
			const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
			if (isLocalhost) {
				return callback(null, true);
			}
		}

		// 4. Strict rejection for unauthorized origins (Prevents arbitrary origin reflection with credentials)
		return callback(new AppError(`CORS blocked: Origin ${origin} is not authorized`, 403), false);
	},
	credentials: true,
	optionsSuccessStatus: 200
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
