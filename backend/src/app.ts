import express from "express";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use("/api", routes);


//error handling hopefully
app.use((req, res) => {
  console.log("404 hit:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route not found" });
});
app.use(errorMiddleware);

export default app;
