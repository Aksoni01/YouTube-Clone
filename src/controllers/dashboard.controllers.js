import mongoose from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { Subscription } from "../models/subscriptions.models";
import { video } from "../models/video.models";
import { APiResponse } from "../utils/ApiResponse";

const getchannelStats = asynhandle(async(req,res)=>{
    const userId = req.User?._id;
    const totalSubscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(userId),
            }
        },{
            $group:{
                _id:null,
                subscriberscount:{
                    $sum:1
                }
            }
        }
    ]);
    const video= await video.aggregate([
        {
            $match:{
               owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localFiels:"_id",
                foreignField:"video",
                as:"likes",
            }
        },{
            $project:{
                totallikes:{
                    $size:"$likes"
                },
                totalviews:"$view",
                totalVideos:1
            }
        },{
            $group:{
                _id:null,
                totallikes:{
                    $sum:"$totallikes"
                },  
                totalviews:{
                    $sum:"$totalviews"
                },
                totalVideos:{
                    $sum:1,
                }
            }
        }
    ]);
    const channelStats= {
        totalSubscribers: totalSubscribers[0]?.subscriberscount ||0,
        totallikes: video[0]?.totallikes ||0,
        totalviews: video[0]?.totalviews || 0,
        totalVideos : video[0]?.totalVideos || 0
    }

    return res.
        status(200)
        .json( new APiResponse(200,channelStats,"channel stats sucessfully"))
})

const getchannelVideos = asynhandle(async(req,res)=>{
   const userId = req.User?._id;
   
   const videos = await video.aggregate([ 
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
            }
        },
        {
            $addFields:{
                createdAt:{
                    $dateToParts:{ date: "$createdAt"}
                },
                likesCount:{
                    $size:"$likes"
                }
            }
        },{
            $sort:{
                createdAt:-1,
            }
        },{
            $project:{
                _id:1,
                "videoFile.url":1,
                "thumbnail.url":1,
                title:1,
                description:1,
                createdAt:{
                    year:1,
                    month:1,
                    day:1
                },
                isPublished:1,
                likesCount: 1
            }
        }
    ]);
    return res.
        status(200)
        .json(new APiResponse(200,videos,"channel stats fetched sucessfully"))
})

export {getchannelVideos,getchannelStats}