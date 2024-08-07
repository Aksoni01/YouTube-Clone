import mongoose,{Schema} from "mongoose";
import { asynhandle } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { APiResponse } from "../utils/ApiResponse";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

// get all comment for a video
const getVideoComments = asynhandle( async(req,res)=>{
    const {videoId}= req.params;
    const {page=1,limit=10}= req.query;

    const video = await Video.findById(videoId);
     if(!video){
        throw new ApiError(404,"Video not found")
     }
    const commentsAggregate = Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localfield:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $lookup:{
                from: "likes",
                localfield: "_id",
                foreignField: "comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isLiked:{
                    $cond:{
                        if:{ $in : [req.User?._id,"$liked.likedBy"]},
                        then:true,
                        else: false
                    }
                }
            }
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:{
                    username:1,
                    fullName:1,
                    "avatar.url":1
                },
                isLiked:1
            }
        }
    ]);  

    const options ={
        page: parseInt(page,10),
        limit:parseInt(limit,10)
    };
    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    )
    return res.
        status(200).
        json(new APiResponse(200,comments,"Comments Fetched"))



})

// add comment to video
const addComment = asynhandle(async(req,res)=>{
    const {videoId}= req.params;
    const {content} = req.body;

    if(!content){
        throw new ApiError(400,"Content is required");
        
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw ApiError(400,"Video not found");
    }
    const comment= await Comment.create({
        content,
        video:videoId,
        owner:req.User?._id
    });
    if(!comment){
        throw ApiError(500,"Failed to add comment please try again");
    }

    return res
        .status(201)
        .json(new APiResponse(201,comment,"Comment added"))
});

const updateComment = asynhandle( async(req,res)=>{
    const {commentId}  = req.params;
    const {content}  = req.body;
    if(!content){
         throw new ApiError(400,"content is required");
    }

    const comment = await Comment.findById(commentId);
    
    if(!comment){
        new ApiError(404,"Comment is not found")
    }
    
    if(comment?.owner.toString() !== req.User?._id.toString()){
        throw new ApiError(400,"Only comment owner can edit their comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(comment?._id,
        {
            $set:{
                content
            }
        },{
            new:true
        }
    );
     if(!updateComment){
        throw new ApiError(500,"Failed to edit comment try again")
     }
      return res.
        status(200).
        json (new APiResponse(200,updatedComment,"Comment added sucessfully"))
});

const deleteComment = asynhandle (async(req,res)=>{
    const {commentId} = req.params;
    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404,"Comment not found");
    }

    if(Comment?.owner.toString() !== req.User?._id.toString() ){
        throw new ApiError(400,"only owner can delete Sorry")
    }
    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({
        comment:commentId,
        likedBy:req.User
    });

    return res.
        status(200).
        json(new APiResponse(200,{commentId},"Comment deleted sucessfully"));

})



export {getVideoComments,addComment,updateComment,deleteComment};
