import { Router } from "express";
import { userRouter } from "./modules/user/user.routes";

const router = Router();

//TEST PING
router.get("/_ping", (req, res) => {
  res.send("routes.ts is alive");
});

router.use("/users", userRouter);

export default router;

router.get("/health", (_, res) => {
  res.json({ status: "ok" });
});



