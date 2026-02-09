import { MongoClient, Db } from "mongodb";
import { env } from "./env";

let client: MongoClient;
let db: Db;

export async function connectDB() {
  if (db) return db;

  try 
  {
    client = new MongoClient(env.mongoUri);
    await client.connect();
    db = client.db(env.dbName);
    await db.command({ ping: 1 });
    console.log("MongoDB connected");
    return db;
  } 
  catch (error)
  {
    console.log("There was an error connecting to the database.");
    console.log(error);
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}
