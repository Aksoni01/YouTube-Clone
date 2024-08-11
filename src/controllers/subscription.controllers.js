import mongoose, { isValidObjectId } from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Subscription } from "../models/subscription.model.js";
import { APiResponse } from "../utils/ApiResponse";
import { Schema } from "mongoose";

const toggleSubscribe = asynhandle(async(req,res)=>{
    const {channelId }= req.params;
    
    if(isValidObjectId(channelId)){
        throw new ApiError(400,"invalid channel")
    }
    const isSusbcribed= await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(isSusbcribed){
        await Subscription.findByIdAndDelete(isSusbcribed?._id)

        return res.
            status(200)
            .json(new APiResponse(200),{subscribed:false},"Unsubscribe sucessfully")
    }

    await Subscription.create({
        subscriber: req.User?._id,
        channel:channelId
    })

    return res.
            status(200)
            .json(new APiResponse(200,{subscribed:true},"Subscribe sucessfully"))

})

const getUserChannelSubscribers= asynhandle(async(req,res)=>{
    let {channelId} =req.params;

    if(isValidObjectId(channelId)){
        throw new ApiError(400,"invalid channel")
    }

    channelId= new mongoose.Types.ObjectId(channelId);

    const subscribers= await Subscription.aggregate([
        {
            $match:{
                channel:channelId
            },
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribedToSubscriber"
                        }
                    },
                    {
                        $addFields:{
                            subscribedToSubscriber:{
                                $cond:{
                                    if:{$in:[channelId,"$subscribedToSubscriber.subscriber"]},
                                    then:true,
                                    else:false,
                                }
                            },
                            subscribersCount:{
                                $size: "$subscribedToSubscriber"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project:{
                _id:0,
                subscriber:{
                    _id:1,
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                    subscribedToSubscriber:1,
                    subscribersCount:1,
                }
            }
        }
    ]);
    return res
        .status(200)
        .json(new APiResponse(200,subscribers,"subscribers fetched succesfully"))
})

const getUserSubscribedchannels= asynhandle (async(req,res)=>{
    const userSubscribedId = req.params;
    const subscribedChannel =await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(userSubscribedId)
            }
        },{
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedChannel",
                pipeline:[
                    {
                        $lookup:{
                            from:"video",
                            localField:"_id",
                            foreignField:"owber",
                            as:"videos",
                        }
                    },{
                        $addFields:{
                            latestVideo:{
                                $last:"$videos"
                            }
                        }
                    }
                ]
            }
        },{
            $unwind:"$subscribedChannel"
        },{
            $project:{
                _id:0,
                subscribedChannel:{
                    _id:1,
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                    latestVideo:{
                        _id:1,
                        "videoFile.url":1,
                        "thumbnail.url":1,
                        owner:1,
                        title:1,
                        description:1,
                        duration:1,
                        createdAt:1,
                        views:1
                    },
                }
            }
        }
    ]);
    return res.
        status(200)
        .json(new APiResponse(200,subscribedChannel,"subscibed channels fetched sucessfully"))
})

export {toggleSubscribe,getUserChannelSubscribers,getUserSubscribedchannels}