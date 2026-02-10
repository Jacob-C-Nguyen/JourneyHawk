import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import User from "./user.model"
import { getDB } from "../../config/db"

// External Dependencies

// Global Variables
export const collections: { users?: mongoDB.Collection<User> } = {}


// Initialize Connection

export async function connectToDatabase() {
  try{
    // Pulls in the .env file so it can be accessed from process.env. No path as .env is in root, the default location
    dotenv.config();

    // Create a new MongoDB client with the connection string from .env
    const client = new mongoDB.MongoClient(process.env.MONGO_URI!);

    // Connect to the cluster
    await client.connect();

    // Connect to the database with the name specified in .env
    const db = client.db(process.env.DB_NAME);
    
    // Apply schema validation to the collection
    //await applySchemaValidation(db);

    // Connect to the collection with the specific name from .env, found in the database previously specified
    const usersCollection = db.collection<User>(process.env.USER_COLLECTION_NAME!);

    // Persist the connection to the JourneyHawk collection
    collections.users = usersCollection;

    console.log(
        `Successfully connected to database: ${db.databaseName} and collection: ${usersCollection.collectionName}`,
    );
  } catch (error) {
    console.log("FAILED TO CONNECT TO DATABASE");
    console.log(error);

  }
}

//function for getting the collection from the database
export function initUserCollection() {
  const db = getDB();
  collections.users = db.collection<User>("users");
}

//For creating restrictions on the schema


// // Update our existing collection with JSON schema validation so we know our documents will always match the shape of our Game model, even if added elsewhere.
// // For more information about schema validation, see this blog series: https://www.mongodb.com/blog/post/json-schema-validation--locking-down-your-model-the-smart-way
// async function applySchemaValidation(db: mongoDB.Db) {
//     const jsonSchema = {
//         $jsonSchema: {
//             bsonType: "object",
//             required: ["name", "price", "category"],
//             additionalProperties: false,
//             properties: {
//                 _id: {},
//                 name: {
//                     bsonType: "string",
//                     description: "'name' is required and is a string",
//                 },
//                 price: {
//                     bsonType: "number",
//                     description: "'price' is required and is a number",
//                 },
//                 category: {
//                     bsonType: "string",
//                     description: "'category' is required and is a string",
//                 },
//             },
//         },
//     };

//     // Try applying the modification to the collection, if the collection doesn't exist, create it 
//    await db.command({
//         collMod: process.env.GAMES_COLLECTION_NAME,
//         validator: jsonSchema
//     }).catch(async (error: mongoDB.MongoServerError) => {
//         if (error.codeName === 'NamespaceNotFound') {
//             await db.createCollection(process.env.GAMES_COLLECTION_NAME, {validator: jsonSchema});
//         }
//     });
// }