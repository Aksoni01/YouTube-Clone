import mongoose ,{Schema}from "mongoose";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema= new Schema({
    username:{
        type:String,
        required: true,
        unique:true,
        lowercase: true,
        trim:true,
        index : true // make thi field searchale
    },
    email:{
        type:String,
        required: true,
        unique:true,
        lowercase: true,
        trim:true,
    },
    fullname:{
        type:String,
        required: true,
        trim:true,
        index : true // make thi field searchale
    },
    avatar:{
        type:String, // cloudanray service url using
        required: true,
        unique:true,
    },
    coverImage:{
        type:String,
        required: true,
    },
    watchHistory:[{
        type: Schema.Types.ObjectId,
        ref: "Video"
        }
    ],
    password:{
        type: String,
        required:[true,"Password is Required"]
    },
    refreshToken:{
        type:String
    }
},
{timestamps:true}
);

//middleware 
userSchema.pre("save",async function(next){
    
    if(!this.isModified("password")){
        return next();
    }
    this.password = bcrypt.hash(this.password,10)
    next()
})

// emncrypt password 
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generatedAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET ,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}
userSchema.methods.generatedRefreshToken = function(){
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET ,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
    )
}

export const user= new mongoose.model("User",userSchema);