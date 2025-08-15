const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId;
        },
        minlength: [6, "Password must be at least 6 characters long"]
    },
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        maxlength: [100, "Name cannot exceed 100 characters"]
    },
    picture: {
        type: String,
        default: null
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: function() {
            return this.isGoogleUser;
        }
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationExpires: {
        type: Date,
        default: null
    },
    loginMethod: {
        type: String,
        enum: ["email", "google"],
        required: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ verificationCode: 1 });
userSchema.index({ verificationExpires: 1 });

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    
    if (this.password) {
        try {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        throw new Error("Password not set for this user");
    }
    
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error("Password comparison failed");
    }
};

userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    return this.save();
};

userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: {
                loginAttempts: 1
            },
            $unset: {
                lockUntil: 1
            }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; 
    
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }
    
    return this.update(updates);
};

userSchema.methods.incVerificationAttempts = function() {
    this.verificationAttempts += 1;
    this.lastVerificationAttempt = new Date();
    return this.save();
};

userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpires;
    delete userObject.verificationCode;
    delete userObject.verificationExpires;
    delete userObject.loginAttempts;
    delete userObject.lockUntil;
    delete userObject.verificationAttempts;
    delete userObject.lastVerificationAttempt;
    delete userObject.__v;
    return userObject;
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByGoogleId = function(googleId) {
    return this.findOne({ googleId: googleId });
};

userSchema.statics.createGoogleUser = async function(googleProfile) {
    const existingUser = await this.findByEmail(googleProfile.email);
    
    if (existingUser) {
        if (!existingUser.googleId) {
            existingUser.googleId = googleProfile.id;
            existingUser.isGoogleUser = true;
            existingUser.picture = googleProfile.picture || existingUser.picture;
            existingUser.isVerified = true; 
            await existingUser.save();
        }
        return existingUser;
    }
    
    const newUser = new this({
        email: googleProfile.email,
        name: googleProfile.name,
        picture: googleProfile.picture,
        googleId: googleProfile.id,
        isGoogleUser: true,
        isVerified: true, 
        loginMethod: "google"
    });
    
    return await newUser.save();
};

userSchema.statics.getUserStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                googleUsers: { 
                    $sum: { $cond: ["$isGoogleUser", 1, 0] } 
                },
                emailUsers: { 
                    $sum: { $cond: ["$isGoogleUser", 0, 1] } 
                },
                verifiedUsers: { 
                    $sum: { $cond: ["$isVerified", 1, 0] } 
                },
                unverifiedUsers: {
                    $sum: { $cond: ["$isVerified", 0, 1] }
                },
                activeToday: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    "$lastLogin",
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                activeThisWeek: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    "$lastLogin",
                                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalUsers: 0,
        googleUsers: 0,
        emailUsers: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0,
        activeToday: 0,
        activeThisWeek: 0
    };
};

userSchema.statics.cleanupExpiredVerifications = async function() {
    const result = await this.updateMany(
        { 
            verificationExpires: { $lt: new Date() },
            isVerified: false
        },
        {
            $unset: {
                verificationCode: 1,
                verificationExpires: 1
            }
        }
    );
    
    console.log(`Cleaned up ${result.nModified} expired verification codes`);
    return result;
};

userSchema.statics.findPendingVerification = function() {
    return this.find({
        isVerified: false,
        verificationCode: { $exists: true },
        verificationExpires: { $gt: new Date() }
    }).select('email name createdAt verificationExpires');
};

userSchema.statics.isValidEmail = function(email) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

const User = mongoose.model("User", userSchema);

module.exports = User;