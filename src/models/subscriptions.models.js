import { Schema } from "mongoose";
import mongoose from "mongoose";

//document created each time when we subscribe separatelty
const subscripSchema= new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,  // one who is subscribing
        ref: "user"
    },
    channel:{
        type:Schema.Types.ObjectId, //one to whom subcribing
        ref: "user"
    }
},{timestamps:true})

export const Subscription = mongoose.models("Subscription",subscripSchemam)