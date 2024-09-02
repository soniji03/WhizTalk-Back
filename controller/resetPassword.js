const jwt = require('jsonwebtoken');
const UserModel = require("../models/UserModel");
const bcryptjs = require('bcryptjs');

exports.resetPassword = async (request, response) => {
    try {
        const { token, newPassword } = request.body;

        // Find user with valid reset token
        const user = await UserModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return response.status(400).json({
                message: "Invalid or expired token",
                error: true
            });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(newPassword, salt);

        // Update user's password and clear reset token fields
        user.password = hashPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return response.status(200).json({
            message: "Password reset successfully",
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}
