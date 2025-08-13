const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/api/auth/signup", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({
                error: "Missing required fields",
                details: "Email, password, and name are required"
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                error: "Password too short",
                details: "Password must be at least 6 characters long"
            });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: "User already exists",
                details: "An account with this email already exists"
            });
        }
        
        const newUser = new User({
            email: email.toLowerCase(),
            password,
            name: name.trim(),
            loginMethod: "email",
            isVerified: false
        });
        
        const savedUser = await newUser.save();
        
        const userResponse = {
            id: savedUser._id,
            email: savedUser.email,
            name: savedUser.name,
            picture: savedUser.picture,
            loginMethod: savedUser.loginMethod,
            isVerified: savedUser.isVerified,
            createdAt: savedUser.createdAt
        };
        
        res.status(201).json({
            message: "Account created successfully",
            user: userResponse,
            requiresPassword: true
        });
        
    } catch (error) {
        console.error("Signup error:", error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: "Validation failed",
                details: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email already registered",
                details: "This email address is already registered"
            });
        }
        
        res.status(500).json({
            error: "Server error during signup",
            details: "Please try again later"
        });
    }
});

router.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                error: "Missing credentials",
                details: "Email and password are required"
            });
        }
        
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: "Invalid credentials",
                details: "Email or password is incorrect"
            });
        }
        
        if (user.isGoogleUser && !user.password) {
            return res.status(400).json({
                error: "Google account requires password setup",
                details: "Please set a password for your Google account first",
                requiresPasswordSetup: true,
                userId: user._id
            });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: "Invalid credentials",
                details: "Email or password is incorrect"
            });
        }
        
        await user.updateLastLogin();
        
        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            loginMethod: user.loginMethod,
            isVerified: user.isVerified,
            isGoogleUser: user.isGoogleUser,
            lastLogin: user.lastLogin
        };
        
        res.json({
            message: "Login successful",
            user: userResponse,
            requiresPassword: false
        });
        
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            error: "Server error during login",
            details: "Please try again later"
        });
    }
});

router.post("/api/auth/set-password", async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        if (!userId || !password) {
            return res.status(400).json({
                error: "Missing required fields",
                details: "User ID and password are required"
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                error: "Password too short",
                details: "Password must be at least 6 characters long"
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                details: "Invalid user ID"
            });
        }
        
        user.password = password;
        await user.save();
        
        res.json({
            message: "Password set successfully",
            requiresPassword: false
        });
        
    } catch (error) {
        console.error("Set password error:", error);
        res.status(500).json({
            error: "Server error setting password",
            details: "Please try again later"
        });
    }
});

router.post("/api/auth/google", async (req, res) => {
    try {
        const { googleId, email, name, picture } = req.body;
        
        if (!googleId || !email || !name) {
            return res.status(400).json({
                error: "Missing Google user data",
                details: "Google ID, email, and name are required"
            });
        }
        
        let user = await User.findByGoogleId(googleId);
        
        if (!user) {
            user = await User.createGoogleUser({
                id: googleId,
                email,
                name,
                picture
            });
        }
        
        await user.updateLastLogin();
        
        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            loginMethod: user.loginMethod,
            isVerified: user.isVerified,
            isGoogleUser: user.isGoogleUser,
            lastLogin: user.lastLogin
        };
        
        const requiresPasswordSetup = user.isGoogleUser && !user.password;
        
        res.json({
            message: requiresPasswordSetup ? "Google signup successful - password setup required" : "Google login successful",
            user: userResponse,
            requiresPassword: requiresPasswordSetup,
            isNewUser: !user.password
        });
        
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(500).json({
            error: "Server error during Google authentication",
            details: "Please try again later"
        });
    }
});

router.get("/api/auth/user/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                details: "Invalid user ID"
            });
        }
        
        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            loginMethod: user.loginMethod,
            isVerified: user.isVerified,
            isGoogleUser: user.isGoogleUser,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };
        
        res.json(userResponse);
        
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
            error: "Server error retrieving user",
            details: "Please try again later"
        });
    }
});

router.get("/api/auth/stats", async (req, res) => {
    try {
        const stats = await User.getUserStats();
        res.json(stats);
    } catch (error) {
        console.error("Get auth stats error:", error);
        res.status(500).json({
            error: "Server error retrieving stats",
            details: "Please try again later"
        });
    }
});

module.exports = router;