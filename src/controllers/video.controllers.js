import mongoose,{ isValidObjectId } from "mongoose";
import asyncHandler from "..utils/asynHandler.js"
import  APiResponse  from "../utils/ApiResponse";
import {video} from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { user } from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import {
    uploadOnCloudinary,
    deleteOnCloudinary
} from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";

const getAllVideo= asyncHandler(async(req,res)=>{
    const {page = 1, limit=10, query,sortBy,soryType,userId}=req.query;
    console.log(userId);

    const pipeline=[];
    
    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'

    if(query){
        pipeline.push({
            $search:{
                index:'search-videos',
                text:{
                    query:query,
                    path:["title","description"]
                }
            }
        });
    }
    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400,"Invalid UserId");
        }
        pipeline.push({
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    //fetch that video that are set as isPublished as True
    pipeline.push({$match:{isPublished:true}});

    //sortBy can be views,duration,createdAt
    //sortType can be ascending or descenduing
    if(sortBy && sortType){
        pipeline.push({
            $sort:{
                [sortBy]:sortType =="asc" ?1:-1
            }
        });
    }
    else{
        pipeline.push({$sort:{createdAt:-1}})
    }
    pipeline.push({
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        username:1,
                        "avatar.url":1
                    }
                }
            ]
        }
    },
    {
        $unwind:"$ownerDetails"
    })
    const videoAgregate=video.aggregate(pipeline);
    const options={
        page:parseInt(page,10),
        limir:parseInt(limit,10)
    };
    const Video=await video.aggregatePaginate(videoAgregate,options);
    return res.status(200).
        json(new APiResponse(200,Video,'Videos fetched sucessfully'))
});

//get video,upload to cloudnary create vide
const publishVideo=asyncHandler (async(req,res)=>{
    const {title,descriptions}=  req.body;

    if([title,descriptions].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fireld are required");
    }

    const videoFileLocatpath=req.files?.videoFile[0].path;
    const thumbnailFileLocatpath=req.files?.thumbnail[0].path;
    if(!videoFileLocatpath){
        throw new ApiError(400,"videofilelocatePath is required")
    }
    if(!thumbnailFileLocatpath){
        throw new ApiError(400,"thumbnailFileLocatepath is required")
    }

    const videoFile= await uploadOnCloudinary(videoFileLocatpath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocatpath)
    if(!videoFile){
        throw new ApiError(400,"video File not found")
    }
    if(!thumbnailFile){
        throw new ApiError(400," thumbnail File not found")
    }
    const Video =await video.create({
        title,
        descriptions,
        duration:videoFile.durations,
        videoFile:{
            url:videoFile.url,
            public_id:videoFile.public_id
        },
        thumbnail:{
            url: thumbnailFile.url,
            public_id:thumbnailFile.public_id
        },
        owner: req.User?._id,
        isPublished:false
    });
    const uploadvideo= await Video.findById(video._id);
    if(!uploadvideo){
        throw new ApiError(500,"video upload failed")
    }
    return res.status(200).json(new APiResponse(200,video,"Video uploaded sucessfully"))
})

//get viudoe by id
const getVideoById=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    if(!isValidObjectId(res.User?._id)){
        throw new ApiError(400,"Invalid userId")
    }
    const Video= await video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }   
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },{
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subcriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscriberscount:{
                                $size:"$subscribers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[
                                            req.User?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then:true,
                                    else:false    
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            username:1,
                            "avatar.url":1,
                            subscriberscount:1,
                            isSubscribed:1
                        }
                    }
                ]
            }
        },{
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isliked:{
                    $cond:{
                        if:{$in:[req.User?._id,"$likes.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $project:{
                "videoFile.url":1,
                title:1,
                description:1,
                views:1,
                createdAt:1,
                duration:1,
                comments:1,
                owner:1,
                likesCount:1,
                isliked:1
            }
        }
    ]);
    if(!Video){
        throw new ApiError(500,"FAILED TO FETCH VIDEO");
    }
    await video.findByIdAndUpdate(videoId,{
        $inc:{
            views:1
        }
    });
    await user.findByIdAndUpdate(req.User?._id,{
        $addToSet:{
            watchHistory:videoId
        }
    });
    return res.status(200).json(new APiResponse(200,Video[0],"video details fetchged sucessfully"))

});
//update video details like title,descriptions,thumbnail
const updatedetails=asyncHandler(async(req,res)=>{
    const {title,description}= req.body;
    const {videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    if(!(title &&description)){
        throw new ApiError(400,"title and description are required")
    }
    const Video= video.findById(videoId);
    if(!Video){
        throw new ApiError(400,"No video found");
    }
    if(!Video?.owner.toString()!== req.User?._id.toString()){
        throw new ApiError(400,"YOu are not owner ")
    }
    //deleting old tumbnail and updating with new one
    const thumbnailToDelete= Video.thumbnail.public_id;
    const thumbnailFilePath = req.files?.path;
    if(!thumbnailFilePath){
        throw new ApiError(400,"tnumbnail is required");
    }

    const thumbnail= await uploadOnCloudinary(thumbnailFilePath);
    if(!thumbnail){
        throw new ApiError(400,"thumbnail not found");
    }

    const updatedVideo= await video.findByIdAndUpdate(
        videoId,{
            $set:{
                title,
                description,
                thumbnail:{
                    public_id:thumbnail.public_id,
                    url:thumbnail.url
                }
            }
        },{
            new:true
        }
    );
    if(!updatedVideo){
        throw new ApiError(500,"Failed to upload video");
    }
    if(updatedVideo){
        await deleteOnCloudinary(thumbnailToDelete);
    }
    return  res.status(200).json(new APiResponse(200,updatedVideo,"Video uploaded sucessfully"))
});
const deleteVideo= asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const Video=await video.findById(videoId);
    if(!Video){
        throw new ApiError(400,"No video found");
    }
    if(Video?.owner.toString()!== req.User?._id.toString()){
        throw new ApiError(400,"YOu are not owner ")
    }
    const videoDeleted= await video.findByIdAndUpdate(Video?._id);
    if(!videoDeleted){
        throw new ApiError(400,"failed to delete")
    }
    await deleteOnCloudinary(Video.thumbnail.public_id);
    await deleteOnCloudinary(Video.videoFile.public_i,"video");

    await Like.deleteMany({
        Video:videoId
    })
    await Comment.deleteMany({
        Video:videoId
    })
    return  res.status(200).json(new APiResponse(200,{},"Video deleted sucessfully"))
});

///toggle publish status of video
const tooglePublishVideo=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const Video=await video.findById(videoId);
    if(!Video){
        throw new ApiError(400,"No video found");
    }
    if(Video?.owner.toString()!== req.User?._id.toString()){
        throw new ApiError(400,"YOu are not owner ")
    }
    const toggledVideoPublish = await video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished: !Video?.isPublished
            }
        },
        {new:true}
    );
    if(!toggledVideoPublish){
        throw new ApiError(400,"No video found");
    }
    return res.status(200).json(new APiResponse(200,{isPublished:tooglePublishVideo.isPublished},"Video publish toggled sucessfully"));
});
export {
    getAllVideo,publishVideo,getVideoById,updatedetails,deleteVideo,
    tooglePublishVideo
}