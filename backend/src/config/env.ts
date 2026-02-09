import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI as string,
  dbName: process.env.DB_NAME,
};

if (!env.mongoUri) {
  throw new Error("MONGO_URI is not defined in .env");
}
