const asynhandle= (requestHandler)=>{
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).
        catch((err)=>next(err))
    }
}

export {asynhandle}

// const asynhandler = ()=> {}
// const asynhandler = (func) => () =>{}
// const asynhandler= (func) => async () => {}

// const asynhandler = (fn)=> async (req,res,next) => {
//     try {
//         await fn(req,res,next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             sucess:false,
//             message : error.message
            
//         })
//     }
// }