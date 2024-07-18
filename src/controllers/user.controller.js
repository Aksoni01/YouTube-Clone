import { asynhandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { user } from "../models/user.models.js";
import { uploadOncloudinary } from "../utils/cloudnary.js";
import { APiResponse } from "../utils/ApiResponse.js";


const generateAccessandRefreshToken = async(userId) => {
    try {
      const User = await user.findById(userId)
      const accesstoken= User.generatedAccessToken()
      const refreshToken= User.generatedRefreshToken()

      //save in DB refreshToken
      User.refreshToken = refreshtToken
      await User.save({validateBeforeSave : false})

      return {accesstoken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went Wrong while generating Refresh and Acess token")
    }
}

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

    const existedUser = await user.findOne({
        $or: [{email},  {username}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist");
    }

    //console.log(req.files);

    //check for images,avatar compulsary
    const avatarLocalPath = req.files?.avatar[0]?.path    //multer give this take first objext as .path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0 ){
        coverImageLocalPath= req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

  
    // upload them to cloudinary, check avatar is uploaded or not
    const avatar = await uploadOncloudinary(avatarLocalPath);
    const coverImage = await uploadOncloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required here")
    }

    // create user objecct (for mongodb) - create entry in DB
    const User = await user.create({
        fullname,
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

const loginUser = asynhandle(async(res,req)=>{
    // req body data to get data
    const {email,username,password} = req.body

    //username / email exist or not
    if(!username || !email){
        throw new ApiError(400,"Username or Email is Required")
    }

    // find the userby username or by email
    const User =await user.findOne({
        $or : [{username},{email}]
    })
    if(!User){
        throw new ApiError(404,"User does not exist")
    }

    // check password  for creted User
    const isPasswordvalid=await User.isPasswordCorrect(password)
    if(!isPasswordvalid){
        throw new ApiError(401,"Password is incorect")
    }

    // acess and refresh token
    const {accessToken,refreshToken}=await generateAccessandRefreshToken(User._id)
    const loggedInuser= await user.findById(User._id).
    select("-password -refreshToken")

    // send as cookies 
    const Options={
        httpOnly:true,   // not modify by front end 
        secure:true
    }
    return res.
    status(200).
    cookie("accessToken",accessToken,Options).
    cookie("refreshToken",refreshToken,Options).
    json(
        new APiResponse(200,
            {User: loggedInuser,accessToken,refreshToken},"User logged in sucessfully") // date in util response
    )
})

const logoutUser = asynhandle( async(req,res) =>{
    //find user and  //reset refresh token
    await user.findByAndUpdate(
        res.User._id,{
            $set: {
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
    //clear cookies first
    const Options={
        httpOnly:true,   // not modify by front end 
        secure:true
    }
    return res.status(200).clearCookie("accessToken",Options).
    clearCookie("refreshToken",Options).
    json(new APiResponse(200,{},"User logged Out"))
})

export {loginUser,registerUser,logoutUser}