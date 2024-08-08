import mongoose,{isValidObjectId, Schema} from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { APiResponse } from "../utils/ApiResponse";
import { Tweet } from "../models/tweet.models";

const createTweet = asynhandle(async(req,res)=>{
    const {content} = req.body;
    if(!content){
        throw new ApiError(400,"Content not found")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.User?._id,
    });

    if(!tweet){
        throw ApiError(500,"Failed to create tweet");
    }

    return res
        .status(200)
        .json(new APiResponse(200,tweet,"Tweet created sucessfully"))
});

const updateTweet = asynhandle(async(req,res)=>{
    const {content}= req.body;
    const {tweetId} = req.params;

    if(!content){
        throw new ApiError(400,"content not found")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }

    const tweet= await Tweet.findById(tweetId)


    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet?.owner.toString() !== req.User?._id.toString()){
        throw new ApiError(400,"only owner can edit")
    }

    const newTweet= await Tweet.findByIdAndUpdate(
        tweetId,{
            $set:{
                content,
            }
        },{new:true}
    )

    if(!newTweet){
         throw new ApiError(500,"Failed to edit tweet");
    }
    return res
        .status(200)
        .json(new APiResponse(200,newTweet,"Tweet updated sucessfully"))
})

const deleteTweet = asynhandle(async(req,res)=>{
    const {tweetId} = req.params;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }
    if(tweet?.owner.toString() !== req.User?._id.toString()){
        throw new ApiError(400,"only owner can delete tweet")
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.
        status(200)
        .json(new APiResponse(200,{tweetId},"Tweet deleted sucessfully"))
});

const getUserTweet = asynhandle(async(req,res)=>{
    const {userId} = req.params;
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user")
    }

    const tweets = await Tweet.aggregate([
       { $match:{
            owner: new mongoose.Types.ObjectId(userId)
            },
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerdetails",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            "avatar.url":1
                        },
                    },
                ],
            },
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likeDetails",
                pipeline:[
                    {
                        $project:{
                            likedBy:1,
                        }
                    }
                ]
            }
        },{
            $addFields:{
                likesCount:{
                    $size:"$likeDetails"
                },
                ownerDetails:{
                    $first:"$ownerdetails"
                },
                isLiked:{
                    $cond:{
                        if:{$in:[req.User?._id,"$likeDetails.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $sort:{
                createdAt:1,
            }
        },{
            $project:{
                content:1,
                ownerDetails:1,
                likesCount:1,
                createdAt:1,
                isLiked:1
            }
        }
    ]);
    return res
        .status(200)
        .json(new APiResponse(200,tweets,"Tweets fetched sucessfully"))
})

export {createTweet,updateTweet,deleteTweet,getUserTweet};