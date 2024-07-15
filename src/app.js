import express from "express"
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//middleware layer limit for json 
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended : true, limit:"16kb"}))
app.use(express.static("public"))  //store file n server like pdf images
app.use(cookieParser())


//routes
import userRouter from './routes/user.routes.js'

//routes declare
app.use("/api/v1/users",userRouter)      //need middleware it contorl pass to user.routes


export {app}