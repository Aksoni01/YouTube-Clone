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
        //console.log("File is sucessfully uploaded");
        fs.unlinkSync(localFilePath)
        return response;
    }
     catch (error) {
          //console.error('Error uploading to Cloudinary:', error.message); // Log error message
        //console.error(error.stack); // Log stack trace for more details
        fs.unlinkSync(localFilePath ) //remove locally saved temporary file as upload got failed
        return null;
    }
}
 
export {uploadOncloudinary}