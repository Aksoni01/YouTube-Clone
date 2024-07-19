import {Router} from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    loginUser, 
    logoutUser, 
    registerUser, 
    refreshAcessToken} from "../controllers/user.controller.js";

const router= Router()

router.route("/register").post(
    //middleware inject 
    upload.fields([
        {
            name: "avatar", // frontfield should be avatar
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secure routes 
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAcessToken)


export default router