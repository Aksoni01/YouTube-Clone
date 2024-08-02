import mongoose,{ Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schem({
    content:{
        type:String,
        required:true
    },
    video:{
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }

},{timestamps:true})

commentSchema.plugin(mongooseAggregatePaginate) // availabity to control to paginate

export const Comment= mongoose.model("Comment",commentSchema);

