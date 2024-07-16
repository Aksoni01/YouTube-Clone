//require('dotenv').config({path : './env'}) 
import dotenv from "dotenv"
import connectDB from "./db/index.js";
//import express from "express";
import { app } from "./app.js";

//const app=express();
dotenv.config({
    path : './env'
})

connectDB().then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port:${process.env.PORT}`);
    })
}).catch((err)=>{
    console.log("Mongo Db connection failed",err);
})






/* first apporoach 


import express, { application } from "express"
const app= express()

// use try catch and asyac await while interact with DB (because db may be held at other continent)

// IFFE
;( async () =>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

       app.on("error",(error) => {
        console.log("ERRR:",error);
        throw error
       })

       app.listen(process.env.PORT,() =>{
        console.log(`App is listen on ${process.env.PORT}`);
       })
    } catch (error) {
        console.log("Error",error);
    }
})()

*/