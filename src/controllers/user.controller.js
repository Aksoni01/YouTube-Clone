import { asynhandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { user } from "../models/user.models.js";
import { uploadOncloudinary } from "../utils/cloudnary.js";
import { APiResponse } from "../utils/ApiResponse.js";

const registerUser = asynhandle( async (req,res) => {
    
    //Get user detail from frontend through postman data
    const {fullname,email,username,password} = req.body // raw json in body

    //validation like not empty in username , etc.

    if(
        [fullname,username,email,password].some( (field) => field?.trim()=== "")
    ) {
        throw new ApiError(400,"ALL Field are required")
    } 

    //check if user already exist: username,email

    const existedUser = user.findOne({
        $or: [{email},  {username}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist");
    }

    //check for images,avatar compulsary
    const avatarLocalPath = req.files?.avatar[0]?.path    //multer give this take first objext as .path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    // upload them to cloudinary, check avatar is uploaded or not
    const avatar = await uploadOncloudinary(avatarLocalPath)
    const coverImage = await uploadOncloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    // create user objecct (for mongodb) - create entry in DB
    const User = await user.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "" , // we not check if it found or not so use ? ||
        email,
        password,
        username : username.toLowerCase()
    })

    //const createdUser= await user.findById(User._id);

    // remove pass and refresh token from response
    const createdUser = await user.findById(User._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if (!createdUser){
        throw new ApiError(500,"Something wrong while registring user")
    }

    // return response

    return res.status(201).json(
        new APiResponse(200,createdUser,"User registered sucessfully")
    )

})

export {registerUser}