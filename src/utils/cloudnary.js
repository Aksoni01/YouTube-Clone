import { v2 as cloudinary } from 'cloudinary';
import exp from 'constants';
import fs from "fs";

    // Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOncloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        //upload file
         const response  = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //file upload sucess
        console.log("File is sucessfully uploaded");
        return response;
    }
     catch (error) {
        fs.unlinkSync(localFilePath ) //remove locally saved temporary file as upload got failed
    }
}
 
export {uploadOncloudinary}