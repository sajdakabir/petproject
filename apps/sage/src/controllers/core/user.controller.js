import { getUserById, updateUser, updateUserOnBoarded } from "../../services/core/user.service.js";
import { UpdateUserPayload } from "../../payloads/core/user.payload.js";

const userProfileController = async (req, res, next) => {
    try {
        const user = await getUserById(req.user.id)
        res.json({
            "status": 200,
            "response": user
        })
    } catch (err) {
        next(err)
    }
};

const updateUserController = async (req, res, next) => {
    try {
        const user = req.user.id;
        const { error, value } = UpdateUserPayload.validate(req.body);

        if (error) {
            const err = error.details[0].message;
            err.statusCode = 400;
            throw err;
        }
        const { fullName, userName, avatar, hasFinishedOnboarding, onboarding, timezone } = value;

        // Sanitize user input before updating
        const sanitizedFullName = fullName.replace(/<[^>]*>/g, "");
        const sanitizedUserName = userName.replace(/<[^>]*>/g, "");
        const sanitizedAvatar = avatar.replace(/<[^>]*>/g, "");

        await updateUser(user, { fullName: sanitizedFullName, userName: sanitizedUserName, avatar: sanitizedAvatar, hasFinishedOnboarding, onboarding, timezone });

        res.json({
            "status": 200,
            "message": "Updated successfully"
        })
    } catch (err) {
        next(err)
    }
};

const updateUserOnBoardedController = async (req, res, next) => {
    try {
        const user = req.user.id;
        const { hasFinishedOnboarding } = req.body;

        // Sanitize user input before updating
        const sanitizedHasFinishedOnboarding = hasFinishedOnboarding.replace(/<[^>]*>/g, "");

        await updateUserOnBoarded(user, sanitizedHasFinishedOnboarding);

        res.json({
            "status": 200,
            "message": "User on Boarded"
        })
    } catch (err) {
        next(err)
    }
};

export {
    userProfileController,
    updateUserController,
    updateUserOnBoardedController
};