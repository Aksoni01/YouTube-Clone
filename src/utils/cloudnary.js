import { v2 as cloudinary } from 'cloudinary';
import exp from 'constants';
import fs from "fs";
import { resourceLimits } from 'worker_threads';

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

const deleteOncloudinary = async ( public_id,resource_type="image")=>{
    try {
        if(!public_id) return null;

        //deletion file 
        const deleted=await cloudinary.uploader.destroy(public_id,{
            resource_type:`${resource_type}`
        });

    } catch (error) {
        return error;
        console.log("Deletion failed on cloudinary",error);
        
    }
} 
 
export {deleteOncloudinary,uploadOncloudinary}