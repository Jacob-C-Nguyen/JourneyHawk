import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initUserCollection } from "./modules/user/user.service";


async function startServer() {
  await connectDB();
  initUserCollection();   //gets the user collection from the JourneyHawk database

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

startServer();
