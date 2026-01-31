import { MongoClient, Db } from "mongodb";
import { env } from "./env";

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.mongoUri);
  await client.connect();

  db = client.db(env.dbName);
  console.log("MongoDB connected");

  return db;
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}
