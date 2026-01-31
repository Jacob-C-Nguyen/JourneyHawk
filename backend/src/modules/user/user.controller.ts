import { Request, Response } from "express";
import * as userService from "./user.service";

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.json(users);
};
