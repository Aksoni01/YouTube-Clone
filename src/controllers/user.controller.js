import { asynhandle } from "../utils/asyncHandler.js";

const registerUser = asynhandle( async (req,res) => {
    res.status(200).json({
        message: "ok"
    })
})

export {registerUser}