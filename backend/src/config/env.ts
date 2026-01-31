import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI as string,
  dbName: process.env.DB_NAME || "journeyhawk",
};

if (!env.mongoUri) {
  throw new Error("MONGO_URI is not defined in .env");
}
