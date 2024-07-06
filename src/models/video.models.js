import mongoose,{ Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema({
    videoFile:{
        type:String , //cloudary url
        required:true
    },
    thumbnail:{
        type:String , //cloudary url
        required:true
    },
    title:{
        type:String ,
        required:true
    },
    description:{
        type:String , 
        required:true
    },
    duration:{
        type:Number , //cloudary url
        required:true
    },
    views:{
        type:Number , 
        required:true
    },
    isPublished:{
        type:Boolean ,
        defult:true
    },
    owner:{
        type:Schema.Types.ObjectId , //cloudary url
        ref:"User"
    } 
},{timestamps:true});

videoSchema.plugin(mongooseAggregatePaginate) // can write aggregation pipeline
export const video = mongoose.model("Video",videoSchema)


// becrypt library used to hash password & jwtwebtoken to crate token using cryptographic token