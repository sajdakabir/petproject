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

        await updateUser(user, { fullName, userName, avatar, hasFinishedOnboarding, onboarding, timezone });

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

        await updateUserOnBoarded(user, hasFinishedOnboarding);

        res.json({
            "status": 200,
            "message": "User on Boarded"
        })
    } catch (err) {
        next(err)
    }
};

// Patched code to fix XSS vulnerability
const sanitizeInput = (input) => {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

        await updateUser(user, { fullName: sanitizeInput(fullName), userName: sanitizeInput(userName), avatar: sanitizeInput(avatar), hasFinishedOnboarding, onboarding, timezone });

        res.json({
            "status": 200,
            "message": "Updated successfully"
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