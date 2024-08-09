import mongoose,{Schema} from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Like } from "../models/likes.models";
import { APiResponse } from "../utils/ApiResponse";

const videolikeToggle = asynhandle(async(req,res)=>{
    const {videoId} = req.params

    if(!videoId){
         throw new ApiError(400,"Invalid videoId")
    }

    const likecheck = await Like.findOne({
        video:videoId,
        likedBy: req.User?._id,

    })
    if(likecheck){
        await Like.findByIdAndDelete(likecheck?._id);

        return res
            .status(200)
            .json(new APiResponse(200,{isLiked:false}))
    }

    await Like.create({
        video:videoId,
        likedBy:req.User?._id,
    });
    return res.
        status(200)
        .json(new APiResponse(200,{isLiked:true}));
})
const commentlikeToggle = asynhandle(async(req,res)=>{
    const {commentId} = req.params

    if(!commentId){
         throw new ApiError(400,"Invalid commentId")
    }

    const likecheck = await Like.findOne({
        comment:commentId,
        likedBy: req.User?._id,

    })
    if(likecheck){
        await Like.findByIdAndDelete(likecheck?._id);

        return res
            .status(200)
            .json(new APiResponse(200,{isLiked:false}))
    }

    await Like.create({
        comment:commentId,
        likedBy:req.User?._id,
    });
    return res.
        status(200)
        .json(new APiResponse(200,{isLiked:true}));
})

const tweetlikeToggle = asynhandle(async(req,res)=>{
    const {tweetId} = req.params

    if(!tweetId){
         throw new ApiError(400,"Invalid videoId")
    }

    const likecheck = await Like.findOne({
        tweet:tweetId,
        likedBy: req.User?._id,

    })
    if(likecheck){
        await Like.findByIdAndDelete(likecheck?._id);

        return res
            .status(200)
            .json(new APiResponse(200,{isLiked:false}))
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.User?._id,
    });
    return res.
        status(200)
        .json(new APiResponse(200,{isLiked:true}));
})

const getLikedVideos= asynhandle(async(req,res)=>{
    const likedvideosAggregate = await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.User?._id)
            },
        },{
            $lookup:{
                from:"videos.",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ],
            },
        },{
            $unwind:"$likedVideo",
        },{
            $sort:{
                createdAt:-1,
            }
        },{
            $project:{
                _id:0,
                likedvideo:{
                    _id:1,
                    "videoFile.url":1,
                    "thumbnail.url":1,
                    onwer:1,
                    title:1,
                    descriptions:1,
                    views:1,
                    duration:1,
                    createdAt:1,
                    isPublished:1,
                    ownerDetails:{
                        username:1,
                        fullName:1,
                        "avatar.url":1,
                    },
                }
            }
        }
    ]);
    return res.
        status(200)
        .json(new APiResponse(200,likedvideosAggregate,"Liked vidoes fetched successfully"))
});

export {videolikeToggle,tweetlikeToggle,commentlikeToggle,getLikedVideos};
