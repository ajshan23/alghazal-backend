import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { ApiError } from "./utils/apiHandlerHelpers";
import { errorHandler } from "./utils/errorHandler";
import userRouter from "./routes/userRoutes";
import estimationRouter from "./routes/estimationRoutes";
import clientRouter from "./routes/clientRoutes";
import projectRouter from "./routes/projectRoutes";
import commentRouter from "./routes/commentRoutes";
import quotationRouter from "./routes/quotationRoutes";

import { connectDb } from "./config/db";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allow all common methods
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept",
    ], // Allow all common headers
  })
);

// app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static("/var/www/kmcc-frontend/dist/"));
app.use(morgan("dev")); // Logging
app.use(helmet()); // Security
app.use("/api/user", userRouter);
app.use("/api/estimation", estimationRouter);
app.use("/api/client", clientRouter);
app.use("/api/project", projectRouter);
app.use("/api/comment", commentRouter);
app.use("/api/quotation", quotationRouter);

app.use(errorHandler as ErrorRequestHandler);
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Secure and Logged World!");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  throw new ApiError(404, "Route not found");
});

// Error-handling middleware

// app.get("*", (req, res) => {
//   res.sendFile("/var/www/kmcc-frontend/dist/index.html");
// });
connectDb().then(() => {
  app.listen(process.env.PORT || 4000, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
});
