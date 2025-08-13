const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Email configuration
const createEmailTransporter = () => {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });
};

// Generate verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// Send verification email
const sendVerificationEmail = async (email, code, name) => {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'FitTrack - Email Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                    .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏋️ FitTrack</h1>
                        <p>Email Verification</p>
                    </div>
                    <div class="content">
                        <h2>Hi ${name}!</h2>
                        <p>Thank you for signing up with FitTrack! To complete your registration, please use the verification code below:</p>
                        
                        <div class="code-box">
                            <div class="code">${code}</div>
                        </div>
                        
                        <p>This verification code will expire in <strong>10 minutes</strong>.</p>
                        <p>If you didn't request this verification, please ignore this email.</p>
                        
                        <div class="footer">
                            <p>© 2025 FitTrack. Your fitness journey starts here!</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    await transporter.sendMail(mailOptions);
};

// Check if email exists endpoint
router.post("/api/auth/check-email", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                error: "Missing email",
                details: "Email is required"
            });
        }

        const existingUser = await User.findByEmail(email);
        
        res.json({
            exists: !!existingUser,
            email: email.toLowerCase(),
            message: existingUser ? "Email is already registered" : "Email is available"
        });
        
    } catch (error) {
        console.error("Check email error:", error);
        res.status(500).json({
            error: "Server error checking email",
            details: "Please try again later"
        });
    }
});

// Enhanced signup with email verification
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
        
        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(409).json({
                    error: "Email already registered",
                    details: "This email is already registered. Please sign in instead.",
                    shouldRedirectToLogin: true
                });
            } else {
                // User exists but not verified, resend verification
                const verificationCode = generateVerificationCode();
                const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
                
                existingUser.verificationCode = verificationCode;
                existingUser.verificationExpires = verificationExpires;
                await existingUser.save();
                
                await sendVerificationEmail(email, verificationCode, existingUser.name);
                
                return res.json({
                    message: "Verification code resent",
                    details: "A new verification code has been sent to your email",
                    userId: existingUser._id,
                    requiresVerification: true
                });
            }
        }
        
        // Create new user with verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        const newUser = new User({
            email: email.toLowerCase(),
            password,
            name: name.trim(),
            loginMethod: "email",
            isVerified: false,
            verificationCode,
            verificationExpires
        });
        
        const savedUser = await newUser.save();
        
        // Send verification email
        try {
            await sendVerificationEmail(email, verificationCode, name);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Don't fail the signup if email fails
        }
        
        const userResponse = {
            id: savedUser._id,
            email: savedUser.email,
            name: savedUser.name,
            loginMethod: savedUser.loginMethod,
            isVerified: savedUser.isVerified,
            createdAt: savedUser.createdAt
        };
        
        res.status(201).json({
            message: "Account created successfully",
            details: "Please check your email for the verification code",
            user: userResponse,
            requiresVerification: true
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
                details: "This email address is already registered. Please sign in instead.",
                shouldRedirectToLogin: true
            });
        }
        
        res.status(500).json({
            error: "Server error during signup",
            details: "Please try again later"
        });
    }
});

// Verify email endpoint
router.post("/api/auth/verify-email", async (req, res) => {
    try {
        const { userId, verificationCode } = req.body;
        
        if (!userId || !verificationCode) {
            return res.status(400).json({
                error: "Missing required fields",
                details: "User ID and verification code are required"
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                details: "Invalid user ID"
            });
        }
        
        if (user.isVerified) {
            return res.status(400).json({
                error: "Already verified",
                details: "This account is already verified"
            });
        }
        
        if (!user.verificationCode || !user.verificationExpires) {
            return res.status(400).json({
                error: "No verification code",
                details: "No verification code found. Please request a new one."
            });
        }
        
        if (new Date() > user.verificationExpires) {
            return res.status(400).json({
                error: "Verification code expired",
                details: "Verification code has expired. Please request a new one.",
                expired: true
            });
        }
        
        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({
                error: "Invalid verification code",
                details: "The verification code is incorrect"
            });
        }
        
        // Verify the user
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();
        
        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            loginMethod: user.loginMethod,
            isVerified: user.isVerified,
            createdAt: user.createdAt
        };
        
        res.json({
            message: "Email verified successfully",
            details: "Your account has been verified. You can now sign in.",
            user: userResponse,
            verified: true
        });
        
    } catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({
            error: "Server error during verification",
            details: "Please try again later"
        });
    }
});

// Resend verification code
router.post("/api/auth/resend-verification", async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                error: "Missing user ID",
                details: "User ID is required"
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found",
                details: "Invalid user ID"
            });
        }
        
        if (user.isVerified) {
            return res.status(400).json({
                error: "Already verified",
                details: "This account is already verified"
            });
        }
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        user.verificationCode = verificationCode;
        user.verificationExpires = verificationExpires;
        await user.save();
        
        // Send verification email
        try {
            await sendVerificationEmail(user.email, verificationCode, user.name);
        } catch (emailError) {
            console.error("Failed to resend verification email:", emailError);
            return res.status(500).json({
                error: "Failed to send email",
                details: "Could not send verification email. Please try again."
            });
        }
        
        res.json({
            message: "Verification code resent",
            details: "A new verification code has been sent to your email"
        });
        
    } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({
            error: "Server error resending verification",
            details: "Please try again later"
        });
    }
});

// Enhanced login with proper user checks
router.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                error: "Missing credentials",
                details: "Email and password are required"
            });
        }
        
        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: "Account not found",
                details: "No account found with this email. Please sign up first.",
                shouldRedirectToSignup: true
            });
        }
        
        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                error: "Email not verified",
                details: "Please verify your email before signing in.",
                requiresVerification: true,
                userId: user._id
            });
        }
        
        // Check if it's a Google user trying to login with password
        if (user.isGoogleUser && !user.password) {
            return res.status(400).json({
                error: "Google account requires password setup",
                details: "Please set a password for your Google account first",
                requiresPasswordSetup: true,
                userId: user._id
            });
        }
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: "Invalid credentials",
                details: "The password is incorrect"
            });
        }
        
        // Update last login
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

// Set password for Google users
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

// Enhanced Google authentication
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
            // Check if email exists with different login method
            const existingEmailUser = await User.findByEmail(email);
            if (existingEmailUser && !existingEmailUser.googleId) {
                // Email exists but not linked to Google
                return res.status(409).json({
                    error: "Email already registered",
                    details: "This email is already registered with email/password. Please sign in with your password or link your Google account.",
                    shouldRedirectToLogin: true,
                    emailExists: true
                });
            }
            
            // Create new Google user (automatically verified)
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

// Get user info
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

// Get authentication stats
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