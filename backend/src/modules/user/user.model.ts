import { ObjectId } from "mongodb";

export default interface User {
  _id?: ObjectId;
  email?: string;
  username: string;
  password: string;   //ENCRYPT AND HASH LATER
  createdAt: number;
}
