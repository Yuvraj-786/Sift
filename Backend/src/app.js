const express = require("express");
const cookieParser = require("cookie-parser")
const cors = require("cors")
const connectToDB = require("./config/database");

const app = express();

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true
}))
app.use(async (req, res, next) => {
    try {
        await connectToDB();
        next();
    } catch {
        res.status(503).json({ message: "Database is temporarily unavailable.", code: "DATABASE_UNAVAILABLE" });
    }
})

// require all the routes here
const authRouter = require("./routes/auth.routes");

// require ai routes here
const aiRouter = require("./routes/ai.routes")

// using all the routes here
app.use("/api/auth", authRouter)

// using ai routes here
app.use("/api/ai", aiRouter)



module.exports = app; 