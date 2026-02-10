// External Dependencies

import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { collections } from "./user.service";

// Global Config

export const userRouter = express.Router();

userRouter.use(express.json());

// GET

userRouter.get("/", async (_req: Request, res: Response) => {
    try {
       const users = (await collections.users!.find({}).toArray());

        res.status(200).send(users);
    } catch (error) {
        if(error instanceof Error){
            res.status(500).send(error.message);
        } else {
            res.status(400).send("I genuinely have no idea what went wrong. GL buddy.");
        }
    }
});

userRouter.get("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        
        const query = { _id: new ObjectId(id) };
        const user = await collections.users!.findOne(query);

        if (user) {
            res.status(200).send(user);
        }
    } catch (error) {
        res.status(404).send(`Unable to find matching document with id: ${req.params.id}`);
    }
});

// POST

userRouter.post("/", async (req: Request, res: Response) => {
    try {
        const newUser = req.body;

        // Use insertMany for multiple docs
        const result = await collections.users!.insertOne(newUser);

        result
            ? res.status(201).send(`Successfully created a new user with id ${result.insertedId}`)
            : res.status(500).send("Failed to create a new user.");
    } catch (error) {
        if(error instanceof Error){
            res.status(400).send(error.message);
        }
    }
});

// PUT (POST but for already existing documents)

userRouter.put("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const updatedGame = req.body;
        const query = { _id: new ObjectId(id) };
        // $set adds or updates all fields
        const result = await collections.users!.updateOne(query, { $set: updatedGame });

        result
            ? res.status(200).send(`Successfully updated user with id ${id}`)
            : res.status(304).send(`Game with id: ${id} not updated`);
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message);
            res.status(400).send(error.message);
        }
    }
});

// DELETE
userRouter.delete("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const query = { _id: new ObjectId(id) };
        const result = await collections.users!.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Successfully removed user with id ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove user with id ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`User with id ${id} does not exist`);
        }
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message);
            res.status(400).send(error.message);
        } else {
            res.status(504).send("An unknown error occured");
        }
    }
});
