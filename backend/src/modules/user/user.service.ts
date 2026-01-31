import { User } from "./user.model";

export const getAllUsers = async () => {
  return User.find().select("-password");
};
