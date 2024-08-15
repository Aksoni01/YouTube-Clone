import mongoose, { isValidObjectId } from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { playlist } from "../models/playlist.models";
import { APiResponse } from "../utils/ApiResponse";
import { video, video } from "../models/video.models";

const createPlaylist = asynhandle(async(req,res)=>{
    const {name, discription} = req.body;
    if( !name || !discription) {
         throw new ApiError(200,"Name and bdiscription both required");
    }
    const playlist = await playlist.create({
        name,discription,
        owner:req.User?._id
    })

    if(!playlist){ 
        throw new ApiError(500,"failed to create playlist")
    }
     return res
        .status(200)
        .json(new APiResponse(200,playlist,"playlist created sucessfully"))
});


const updatePlayList = asynhandle(async(req,res)=>{
    const {playListId} = req.params;
    const  {name, discription} = req.body;

    if( !name || !discription) {
        throw new ApiError(200,"Name and bdiscription both required");
    }

    if(!isValidObjectId(playListId)){
         throw new ApiError(400,"Inavlid playlist")
    }

    const Playlist= await playlist.findById(playListId);
    
    if(!Playlist){
        throw new ApiError(404,"Playlist not found");
    }

    if(Playlist.owner.toString() !==req.User?._id.toString() ){
        throw new ApiError(400,"Only Owner have permission")
    }

    const updatedPlaylist = await playlist.findByIdAndUpdate(
        Playlist?._id,
        {
            $set:{
                name,
                discription,
            },
        },
        {new : true}
    );
    return res
        .status(200)
        .json(new APiResponse(200,updatedPlaylist,"Playlist updated sucessfully"))
})

const deletePlaylist = asynhandle(async(req,res)=>{
    const {playListId} = req.params;
    if(!isValidObjectId(playListId)){
        throw new ApiError(200,"Invalid playlist")
    }

    const playList = await playlist.findById(playListId);
    if(!playList){
        throw new ApiError(404,"Playlist not found")
    }
    if( playList.owner.toString() !==req.User?._id.toString() ){
        throw new ApiError(400,"Only owner can delete")
    }

    await playlist.findByIdAndDelete(playList?._id);
    return res
        .status(200)
        .json(new APiResponse(200,{},"playlist deleted sucessfully"))
})

const addvideoToplaylist = asynhandle(async(req,res)=>{
    const {playListId,videoId} = req.params;

    if(!isValidObjectId(playListId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid playlist or video");
    }

    const playList = await playlist.findById(playListId)
    const video = await video.findById(videoId);

    if(!playList && !video){
        throw new ApiError(404, "Playlist and video not found")
    }
    const updatedPlaylist = await playlist.findByIdAndUpdate(
        playListId?._id,
        {
            $addToSet:{
                videos: videoId,
            },
        },{
            new:true
        }
    );
    if(!updatePlayList){
        throw new ApiError(400,"Faie To add video")
    }
    return res
        .status(200)
        .json(new APiResponse(200,updatePlayList,"Added video To playlist"))
})

const deleteVideofromPlaylist = asynhandle(async(req,res)=>{
    const {playListId,videoId} = req.params;

    if(!isValidObjectId(playListId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid playlist or video")
    }

    const playList = await playlist.findById(playListId)
    const video = await video.findById(videoId);
    if(!playList && !video){
        throw new ApiError(404, "Playlist and video not found")
    }

    if(playList.owner.toString() && video.owner.toString() !== req.User?._id){
        throw new ApiError(404,"Only owner can delete")
    }

    const updated = await playlist.findByIdAndUpdate(
        playListId,{
            $pull:{
                videos: videoId,
            }
        },
        {new: true}
    )
    return res
        .status(200)
        .json(new APiResponse(200,updated,"Removed video sucessfully"))
})

const getPlaylistById = asynhandle(async(req,res)=>{
    const {playListId} = req.params;
    if(!isValidObjectId(playListId))
    {
        throw new ApiError(400,"Invalid playist")
    }

    const playList = await playlist.findById(playListId);
    if(!playList){
        throw new ApiError(404,"Playlist not found")
    }
    
    const playlistVideos = await playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playListId)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
            }
        },{
            $match:{
                "videos.isPublished": true,
            }
        },{
            $lookup:{
                from: "users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size: "$videos"
                },
                totalViews:{
                    $sum: "$videos.views"
                },
                owner:{
                        $first: "$owner"
                }
            }
        },
        {
            $project:{
                name:1,
                description:1,
                createdAt:1,
                updateAt:1,
                totalVideos:1,
                totalViews:1,
                videos:{
                    _id:1,
                    "videosFile.url":1,
                    "thumbnail.url":1,
                    title:1,
                    description:1,
                    duration:1,
                    createdAt:1,
                    views:1,
                },
                owner:{
                    username:1,
                    fullName:1,
                    "avatar.url":1,
                }

            }
        }
    ]);
    return res
        .status(200)
        .json(new APiResponse(200,playlistVideos[0],"Playlist fetched sucessfully"))
})

const getuserPlaylist = asynhandle( async(req,res)=>{
    const { userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid UserId");
    }

    const playListUser = await playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },{
            $lookup:{
                from: "videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },{
            $addFields:{
                totalVideos:{
                    $size: "$videos"
                },
                totalViews:{
                    $sum: "$videos.views"
                }
            }
        },{
            $project:{
                _id:1,
                name:1,
                description:1,
                totalVideos:1,
                totalViews:1,
                updateAt:1,
            }
        }
    ]);
    return res
        .status(200)
        .json(new APiResponse(200,playListUser,"User playlist fetched sucessfully"))
})

export {
    createPlaylist,
    updatePlayList,
    deletePlaylist,
    addvideoToplaylist,
    deleteVideofromPlaylist,
    getPlaylistById,
    getuserPlaylist
}