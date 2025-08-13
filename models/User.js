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
        default: false
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
    }
}, {
    timestamps: true
});

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

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
    return this.save();
};

userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpires;
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
                }
            }
        }
    ]);

    return stats[0] || {
        totalUsers: 0,
        googleUsers: 0,
        emailUsers: 0,
        verifiedUsers: 0,
        activeToday: 0
    };
};

const User = mongoose.model("User", userSchema);

module.exports = User;