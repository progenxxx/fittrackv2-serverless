require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

const PORT = process.env.PORT || 3000;
const app = express();

console.log("🚀 Starting Enhanced FitTrack Server...");
console.log("📅", new Date().toISOString());
console.log("🔧 Node.js version:", process.version);
console.log("🌐 Environment:", process.env.NODE_ENV || "development");
console.log("📧 Email verification:", process.env.EMAIL_VERIFICATION_ENABLED !== 'false' ? 'enabled' : 'disabled');

// Middleware
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static("public"));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} - ${req.ip} - ${new Date().toISOString()}`);
    next();
});

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/workout";

console.log("🔗 Attempting to connect to MongoDB...");
console.log("📝 Connection type:", MONGO_URI.includes("localhost") ? "Local MongoDB" : "MongoDB Atlas");
console.log("🔧 MongoDB URI (masked):", MONGO_URI.replace(/\/\/.*@/, "//***:***@"));

const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    w: 'majority'
};

mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => {
        console.log("✅ MongoDB connected successfully!");
        console.log("🗄️  Database:", mongoose.connection.name);
        console.log("🔌 Connection state:", mongoose.connection.readyState === 1 ? "Connected" : "Connecting");
        return mongoose.connection.db.admin().ping();
    })
    .then(() => {
        console.log("🏓 MongoDB ping successful - database is responsive");
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err.message);
        console.log("📱 Server will continue running but database features won't work until MongoDB is connected.");
    });

mongoose.connection.on('connected', () => {
    console.log('🔌 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB');
});

// Email configuration validation
const validateEmailConfig = () => {
    const requiredEmailVars = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
    const missing = requiredEmailVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.warn('⚠️ Missing email configuration variables:', missing);
        console.log('📧 Email verification will be disabled. To enable:');
        missing.forEach(varName => {
            console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
        });
        return false;
    }
    
    console.log('✅ Email configuration validated');
    return true;
};

// OAuth configuration validation
const validateOAuthConfig = () => {
    const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required OAuth environment variables:', missing);
        console.log('\n🔧 Please set the following environment variables:');
        missing.forEach(varName => {
            console.log(`   ${varName}=your_${varName.toLowerCase()}_here`);
        });
        return false;
    }
    return true;
};

// Validate configurations on startup
validateEmailConfig();
validateOAuthConfig();

// Google OAuth routes
app.get('/auth/google', (req, res) => {
    console.log('🔐 Google OAuth login request received');
    
    if (!validateOAuthConfig()) {
        console.error('❌ OAuth configuration incomplete');
        return res.redirect('/login.html?error=oauth_config_missing');
    }
    
    let redirectUri;
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_OAUTH_REDIRECT_URI) {
        redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    } else {
        redirectUri = `http://localhost:${PORT}/auth/callback`;
    }
    
    console.log('🔄 Using redirect URI:', redirectUri);
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=fittrack_login`;
    
    console.log('🔄 Redirecting to Google OAuth...');
    res.redirect(googleAuthUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error, state } = req.query;
    
    console.log('🔐 OAuth callback received');
    console.log('📝 Callback details:', { 
        hasCode: !!code, 
        error: error || 'none', 
        state: state || 'none' 
    });
    
    if (error) {
        console.error('❌ OAuth error from Google:', error);
        let errorMessage = 'oauth_failed';
        
        if (error === 'access_denied') {
            errorMessage = 'oauth_denied';
        } else if (error === 'invalid_request') {
            errorMessage = 'oauth_invalid';
        }
        
        return res.redirect(`/login.html?error=${errorMessage}`);
    }
    
    if (!code) {
        console.error('❌ No authorization code received');
        return res.redirect('/login.html?error=oauth_no_code');
    }
    
    if (state !== 'fittrack_login') {
        console.error('❌ Invalid state parameter');
        return res.redirect('/login.html?error=oauth_invalid_state');
    }
    
    try {
        console.log('🔄 Exchanging authorization code for access token...');
        
        let redirectUri;
        if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_OAUTH_REDIRECT_URI) {
            redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
        } else {
            redirectUri = `http://localhost:${PORT}/auth/callback`;
        }
        
        console.log('🔄 Using redirect URI for token exchange:', redirectUri);
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => null);
            console.error('❌ Token exchange failed:', tokenResponse.status, errorData);
            
            if (tokenResponse.status === 400 && errorData?.error === 'invalid_grant') {
                console.error('❌ Authorization code expired or invalid');
                return res.redirect('/login.html?error=oauth_expired');
            }
            
            throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }
        
        const tokens = await tokenResponse.json();
        console.log('✅ Token exchange successful');
        
        if (!tokens.access_token) {
            console.error('❌ No access token in response');
            throw new Error('No access token received');
        }
        
        console.log('🔄 Fetching user information from Google...');
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });
        
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error('❌ User info fetch failed:', userResponse.status, errorText);
            throw new Error(`User info fetch failed: ${userResponse.status} ${userResponse.statusText}`);
        }
        
        const userInfo = await userResponse.json();
        console.log('✅ User info retrieved for:', userInfo.email);
        
        if (!userInfo.email || !userInfo.id) {
            console.error('❌ Incomplete user info from Google');
            throw new Error('Incomplete user information received');
        }
        
        try {
            const User = require("./models/User");
            const user = await User.createGoogleUser({
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
                picture: userInfo.picture || null
            });

            await user.updateLastLogin();

            const userData = {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                loginMethod: user.loginMethod,
                isVerified: user.isVerified,
                isGoogleUser: user.isGoogleUser,
                lastLogin: user.lastLogin
            };

            const userDataEncoded = Buffer.from(JSON.stringify(userData)).toString('base64');
            console.log('✅ OAuth authentication successful for:', userData.email);

            const requiresPassword = user.isGoogleUser && !user.password;
            const redirectParam = requiresPassword ? 'password_setup_required' : 'oauth_complete';
            
            res.redirect(`/login.html?success=${redirectParam}&user=${userDataEncoded}`);
        } catch (dbError) {
            console.error('❌ Database error during Google auth:', dbError);
            throw new Error('Database error during authentication');
        }
        
    } catch (error) {
        console.error('❌ OAuth callback error:', error.message);
        console.error('❌ Full error:', error);
        
        let errorCode = 'oauth_failed';
        if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
            errorCode = 'network_error';
        } else if (error.message.includes('timeout')) {
            errorCode = 'oauth_timeout';
        } else if (error.message.includes('invalid_grant')) {
            errorCode = 'oauth_expired';
        }
        
        res.redirect(`/login.html?error=${errorCode}`);
    }
});

app.use('/auth/*', (req, res, next) => {
    console.log(`❌ Unhandled auth route: ${req.method} ${req.url}`);
    res.redirect('/login.html?error=auth_route_not_found');
});

// Load enhanced authentication routes
console.log("🔌 Loading enhanced authentication routes...");
try {
    const authRoutes = require("./routes/auth-routes");
    app.use(authRoutes);
    console.log("✅ Enhanced authentication routes loaded successfully");
} catch (err) {
    console.warn("⚠️ Enhanced auth routes file not found, using fallback routes");
    
    const User = require("./models/User");
    
    // Fallback auth routes (basic versions of the enhanced routes)
    app.post("/api/auth/signup", async (req, res) => {
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
                    details: "An account with this email already exists",
                    shouldRedirectToLogin: true
                });
            }
            
            const newUser = new User({
                email: email.toLowerCase(),
                password,
                name: name.trim(),
                loginMethod: "email",
                isVerified: process.env.EMAIL_VERIFICATION_ENABLED !== 'true' // Auto-verify if email verification disabled
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
                requiresVerification: process.env.EMAIL_VERIFICATION_ENABLED === 'true' && !savedUser.isVerified
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
                    details: "This email address is already registered",
                    shouldRedirectToLogin: true
                });
            }
            
            res.status(500).json({
                error: "Server error during signup",
                details: "Please try again later"
            });
        }
    });

    app.post("/api/auth/login", async (req, res) => {
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
                    error: "Account not found",
                    details: "No account found with this email. Please sign up first.",
                    shouldRedirectToSignup: true
                });
            }
            
            if (!user.isVerified && process.env.EMAIL_VERIFICATION_ENABLED === 'true') {
                return res.status(401).json({
                    error: "Email not verified",
                    details: "Please verify your email before signing in.",
                    requiresVerification: true,
                    userId: user._id
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
                    details: "The password is incorrect"
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

    // Check email endpoint
    app.post("/api/auth/check-email", async (req, res) => {
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

    // Other fallback routes would go here...
}

// Load API routes
console.log("🔌 Loading API routes...");
require("./routes/api-routes")(app);

// Load HTML routes
console.log("🔌 Loading HTML routes...");
try {
    require("./routes/html-routes")(app);
    console.log("✅ HTML routes loaded from file");
} catch (err) {
    console.warn("⚠️ HTML routes file not found, using fallback routes");
    
    app.get("/", (req, res) => {
        console.log("🏠 Root route (fallback)");
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FitTrack</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                    h1 { color: #333; font-size: 2.5rem; margin-bottom: 20px; }
                    .logo { font-size: 3rem; margin-bottom: 20px; }
                    a { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; display: inline-block; margin: 10px; transition: all 0.3s ease; }
                    a:hover { background: #0056b3; transform: translateY(-2px); }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">🏋️</div>
                    <h1>FitTrack</h1>
                    <p>Your fitness tracking companion with enhanced authentication</p>
                    <br>
                    <a href="/login.html">🔐 Login</a>
                    <a href="/excercise.html">🏃‍♂️ Quick Entry</a>
                    <a href="/api/health">🏥 Status</a>
                </div>
            </body>
            </html>
        `);
    });

    app.get(["/login", "/login.html"], (req, res) => {
        console.log("🔐 Login route (fallback - should not be used if login.html exists)");
        res.sendFile(path.join(__dirname, "public", "login.html"), (err) => {
            if (err) {
                console.error("❌ login.html not found:", err.message);
                res.status(404).send("Login page not found. Please create login.html in the public directory.");
            }
        });
    });

    app.get(["/exercise", "/excercise.html"], (req, res) => {
        console.log("🏋️ Exercise route (fallback)");
        res.sendFile(path.join(__dirname, "public", "excercise.html"), (err) => {
            if (err) {
                console.error("❌ excercise.html not found:", err.message);
                res.status(404).send("Exercise page not found. Please create excercise.html in the public directory.");
            }
        });
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'Enhanced FitTrack API Server',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing',
        authentication: 'enhanced',
        emailVerification: process.env.EMAIL_VERIFICATION_ENABLED !== 'false' ? 'enabled' : 'disabled',
        features: [
            'Email/Password Authentication',
            'Google OAuth Integration',
            'Email Verification with 6-digit codes',
            'Account existence checking',
            'Enhanced security validation',
            'Password setup for Google users'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
    
    if (req.url.startsWith('/api/')) {
        res.status(404).json({
            error: 'API endpoint not found',
            message: `${req.method} ${req.url} is not a valid API endpoint`
        });
    } else {
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Page Not Found - FitTrack</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; }
                    .error-code { font-size: 4rem; color: #dc3545; margin: 20px 0; }
                    h1 { color: #333; margin: 20px 0; }
                    a { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block; }
                    a:hover { background: #0056b3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-code">404</div>
                    <h1>Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="/">🏠 Go Home</a>
                    <a href="/login.html">🔐 Login</a>
                    <a href="/api/health">🏥 Status</a>
                </div>
            </body>
            </html>
        `);
    }
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
});

// Start server
app.listen(PORT, () => {
    console.log("\n🎉 Enhanced FitTrack Server with Email Verification is running!");
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
    console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
    console.log(`🏋️  Exercise page: http://localhost:${PORT}/excercise.html`);
    console.log(`📊 API health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    
    if (mongoose.connection.readyState === 1) {
        console.log("✅ MongoDB is connected and ready");
    } else {
        console.log("⚠️  MongoDB connection pending - check logs above");
    }
    
    console.log("\n📝 Available endpoints:");
    console.log("   GET  /                            - Home page");
    console.log("   GET  /login.html                  - Enhanced login/signup with verification");
    console.log("   GET  /excercise.html              - Add exercise page");
    console.log("   GET  /api/workouts                - Get all workouts");
    console.log("   POST /api/workouts                - Create new workout");
    console.log("   POST /api/auth/signup             - Create account with email verification");
    console.log("   POST /api/auth/login              - Enhanced login with validation");
    console.log("   POST /api/auth/check-email        - Check if email exists");
    console.log("   POST /api/auth/verify-email       - Verify email with 6-digit code");
    console.log("   POST /api/auth/resend-verification - Resend verification code");
    console.log("   POST /api/auth/google             - Google authentication");
    console.log("   POST /api/auth/set-password       - Set password for Google users");
    console.log("   GET  /api/health                  - Enhanced API health check");
    console.log("   GET  /auth/google                 - Google OAuth login");
    console.log("\n🔧 To stop server: Ctrl+C");
    console.log("\n🔐 Enhanced Security Features:");
    console.log("   ✅ Email/Password Registration with Verification");
    console.log("   ✅ 6-digit Email Verification Codes");
    console.log("   ✅ Account Existence Checking");
    console.log("   ✅ Enhanced Google OAuth Integration");
    console.log("   ✅ Real-time Email Validation");
    console.log("   ✅ Password Hashing (bcrypt with 12 rounds)");
    console.log("   ✅ Secure Password Setup for Google Users");
    console.log("   ✅ Advanced Input Validation");
    console.log("   ✅ Session Management");
    console.log("   ✅ Email Delivery via Gmail SMTP");
    
    if (process.env.EMAIL_VERIFICATION_ENABLED !== 'false') {
        console.log("   ✅ Email Verification: ENABLED");
    } else {
        console.log("   ⚠️  Email Verification: DISABLED");
    }
});

module.exports = app;