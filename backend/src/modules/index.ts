import dotenv from "dotenv";
dotenv.config();



import { connectMongo } from "./db/mongo";

async function start() {
  const db = await connectMongo();

  const users = db.collection("users");

  await users.insertOne({
    username: "jacob",
    createdAt: new Date(),
  });

  const allUsers = await users.find().toArray();
  console.log(allUsers);
}

start();
