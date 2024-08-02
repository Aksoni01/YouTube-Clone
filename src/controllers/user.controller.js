import { asynhandle } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { user } from "../models/user.models.js";
import { uploadOncloudinary } from "../utils/cloudnary.js";
import { APiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscriptions.models.js";
import mongoose from "mongoose";

//access token(15-20 min ...) and refreshtoken(saved in DB) is use so that we not give username?pass in every time to user


const generateAccessandRefreshToken = async(userId) => {
    try {
      const User = await user.findById(userId)
      const accessToken= User.generatedAccessToken()
      const refreshToken= User.generatedRefreshToken()

      //save in DB refreshToken
      User.refreshToken = refreshToken
      await User.save({validateBeforeSave : false})

      return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went Wrong while generating Refresh and Acess token")
    }
}

const registerUser = asynhandle( async (req,res) => {
    
    //console.log(req.files);

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

    //console.log(req.body);
    //check for images,avatar compulsary
    const avatarLocalPath = req.files?.avatar[0]?.path    //multer give this take first objext as .path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    // let avatarLocalPath;
    // if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
    //     avatarLocalPath = req.files.avatar[0].path;
    // }

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

const loginUser = asynhandle(async(req,res)=>{
    // req body data to get data
    const {email,username,password} = req.body

    //username / email exist or not
    // if(!(username || email)){
    //     throw new ApiError(400,"Username or Email is Required")
    // }
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // find the userby username or by email
    const User = await user.findOne({
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
    await user.findByIdAndUpdate(
        req.User._id,{
            $unset: {
                refreshToken: 1 //flag pass remove the field from document
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

const refreshAcessToken = asynhandle( async(req,res) => {
    //acess refresh token from cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorised Request")
    }

    try {
        // verify token by jwt
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        const User = await user.findById(decodedToken?._id)
        if(!User){
            throw new ApiError(401,"Invalid Refresh token")
        }
        //match encoded with incomingtoken
        if(incomingRefreshToken !==  User?.refreshToken ){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        // now generted new token
        const Options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newrefreshToken}=await generateAccessandRefreshToken(User._id);
    
        return res.
        status(200).
        cookie("accessToken",accessToken.Options).
        cookie("refreshToken",newrefreshTokenrefreshToken,Options).
        json(
            new APiResponse(200,
                {accessToken,refreshToken: newrefreshToken},
                "Access Token refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401,error?.message|| "Invalid Refresh Token");
    }

})


const changeCurrentPassword = asynhandle (async (req,res) =>{
    const {oldPassword,newPassword} =req.body
    // const {oldPassword,newPassword,confirmPassword} =req.body
    // if(!(newPassword===confirmPassword)){
      //   throw new apierror
    // }
    const User=await user.findById(req.User?._id)
    const isPasswordCorrect = await User.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid password");
    }
    User.password= newPassword;
    await User.save({validateBeforeSave:false})
    
    return res.status(200)
    .json(new APiResponse(200,{},"Password changed sucessfully"))

} )

const getCurrentUser= asynhandle ( async(req,res)=>{
    //middleware already run in our req
    return res.status(200).json(200,req.User,"current user fetched sucessfully")
})

//text based data updation
const updateAccountDetails= asynhandle(async(req,res)=>{
    const {fullname,email} = req.body
    if(!fullname || !email){
        throw new ApiError(400,"All field are required")
    }

    const User=user.findByIdAndUpdate(req.User?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },{new:true}
    ).select("-password")


    return res.status(200).
    json(new APiResponse(200,User,"Account details updated sucessfully"))

})

//files based data updation need two middleware
const updateUserAvatar = asynhandle(async(req,res)=>{
    const avatarLocalPath= req.file?.path // multer middleware give file
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is missing")
    }

    // Todo  delete old image 
    const avatar =await uploadOncloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while loading avatar")
    }

    const User= await user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).
    json(new APiResponse(200,User,"Avatar  is updated sucessfully"))

})
const updateUserCoverImage = asynhandle(async(req,res)=>{
    const coverImageLocalPath = req.file?.path // multer middleware give file
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage is missing")
    }

    const coverImage =await uploadOncloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while loading cover image")
    }

    const User = await user.findByIdAndUpdate(
        req.User?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).
    json(new APiResponse(200,User,"CoverImage is updated sucessfully"))

})

const getUserChannelProfile= asynhandle( async(req,res)=>{
    const {username}= req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is not found")
    }
    const channel = await user.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        //check subcriber from a user profile to count its channel subscribers
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        // to count subscribers of a user that he subscribed
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // now to add additional field to original user
        {
            $addFields:{
                // count subcribers from fiekld
                subscriptionCount:{
                    $size:"$subscribers" // field so use $
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.User?._id,"$subscribers.subscriber"]},
                        then:true,
                        else: false
                    }
                }
            }
        },
        // projection only selecteed value
        {
            $project:{
                fullname:1,
                username:1,
                subscriptionCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email: 1
            }
        }
    ])
    //check console log aggregate 
    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }
    return res.status(200).
    json(new APiResponse(200,channel[0],"user channel fetched sucessfully"))

})  

const getWatchHistory = asynhandle( async(req,res)=>{
    const User = await user.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.User._id)
            }
        },
        {
            $lookup:{
                from :"Video",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                            
                        }
                    },
                    // for better lookup from array
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).
    json(new APiResponse(200,User[0].watchHistory,"Watch History fetched sucessfully"))
})

export {loginUser,registerUser,logoutUser,refreshAcessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}