// verify user is or not present

import { user } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import { asynhandle } from "../utils/asyncHandler";
import { jwt } from "jsonwebtoken";

export const verifyJWT = asynhandle( async(req,res,next) =>{
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorised request")
        }
    
        //check token is correct or not
        const decodedtoken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const User =await user.findById(decodedtoken?._id).select("-password -refreshToken") // _id value come from jwtacessfile
        if(!User){
            // Todo : about front end 
            throw new ApiError(401,"Invalid acess token")
        }
        req.User = User;
        next();
        
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Acess Token")
    }

})