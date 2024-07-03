
import mongoose  from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB =  async () => {
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`);  // try to print on which host be connected
    } catch (error) {
        console.log("MONGODB connection eroor",error);
        process.exit(1);
    }
}

export default connectDB