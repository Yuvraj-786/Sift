    const express = require('express')
    const authMiddleware = require("../middlewares/auth.middleware")
    const aiController = require("../controllers/ai.controller")
    const upload = require("../middlewares/file.middleware")
    
    const aiRouter = express.Router()

    /**
     * @route POST /api/ai
     * @description generate new interview report on the basis of user resume, selfDescription and jobDescription.
     * @access private
     */

    aiRouter.post(
        '/',
        authMiddleware.authUser,
        (req, res, next) => upload.single("resume")(req, res, (error) => {
            if (!error) return next();
            const tooLarge = error.code === "LIMIT_FILE_SIZE";
            return res.status(tooLarge ? 413 : 400).json({
                message: tooLarge ? "Resume PDF must be 3 MB or smaller." : "Resume upload could not be processed.",
                code: tooLarge ? "RESUME_TOO_LARGE" : "INVALID_UPLOAD",
            });
        }),
        aiController.getAiReportController,
    )
    aiRouter.post("/interview-qa", authMiddleware.authUser, aiController.getInterviewAnswerController)

    module.exports = aiRouter