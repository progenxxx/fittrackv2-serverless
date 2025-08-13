require("dotenv").config();
const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

const PORT = process.env.PORT || 3000;
const app = express();

// Enhanced logging
console.log("🚀 Starting FitTrack Server...");
console.log("📅", new Date().toISOString());
console.log("🔧 Node.js version:", process.version);
console.log("🌐 Environment:", process.env.NODE_ENV || "development");

// Middleware setup
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

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url} - ${req.ip} - ${new Date().toISOString()}`);
    next();
});

// MongoDB connection (keeping your existing connection code)
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

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
    console.log('🔌 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB');
});

// Environment variable validation
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

// Enhanced Google OAuth Routes (keeping your existing OAuth code)
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
        
        const userData = {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name || userInfo.email.split('@')[0],
            picture: userInfo.picture || null,
            loginMethod: 'google',
            loginTime: new Date().toISOString(),
            verified: userInfo.verified_email || false
        };
        
        const userDataEncoded = Buffer.from(JSON.stringify(userData)).toString('base64');
        console.log('✅ OAuth authentication successful for:', userData.email);
        
        res.redirect(`/login.html?success=oauth_complete&user=${userDataEncoded}`);
        
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

// API Routes
console.log("🔌 Loading API routes...");
require("./routes/api-routes")(app);

// HTML Routes - Add fallback if html-routes.js doesn't exist
console.log("🔌 Loading HTML routes...");
try {
    require("./routes/html-routes")(app);
    console.log("✅ HTML routes loaded from file");
} catch (err) {
    console.warn("⚠️ HTML routes file not found, using fallback routes");
    
    // Fallback HTML routes
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
                    <p>Your fitness tracking companion</p>
                    <br>
                    <a href="/login.html">🔐 Login</a>
                    <a href="/exercise.html">🏃‍♂️ Quick Entry</a>
                    <a href="/api/health">🏥 Status</a>
                </div>
            </body>
            </html>
        `);
    });

    app.get(["/login", "/login.html"], (req, res) => {
        console.log("🔐 Login route (fallback)");
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>FitTrack - Login</title>
                <style>
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
                    .logo { font-size: 3rem; margin-bottom: 20px; }
                    h1 { color: #333; margin-bottom: 10px; }
                    .subtitle { color: #666; margin-bottom: 30px; }
                    .btn { background: #4285f4; color: white; border: none; padding: 15px 30px; border-radius: 50px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s ease; margin: 10px 0; }
                    .btn:hover { background: #3367d6; transform: translateY(-2px); }
                    .error { background: #fee; color: #c33; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .success { background: #efe; color: #363; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">🏋️</div>
                    <h1>FitTrack</h1>
                    <p class="subtitle">Track your fitness journey</p>
                    <div id="messages"></div>
                    <a href="/auth/google" class="btn">
                        🔐 Login with Google
                    </a>
                    <br><br>
                    <a href="/api/health" style="color: #666; font-size: 14px;">Check System Status</a>
                </div>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    const error = urlParams.get('error');
                    const success = urlParams.get('success');
                    const messagesDiv = document.getElementById('messages');

                    if (error) {
                        const errorMessages = {
                            'oauth_config_missing': 'OAuth configuration missing.',
                            'oauth_failed': 'Authentication failed.',
                            'oauth_denied': 'Authentication denied.',
                            'oauth_no_code': 'No authorization code received.',
                            'oauth_expired': 'Authorization expired. Try again.',
                            'network_error': 'Network error. Check connection.',
                            'oauth_timeout': 'Authentication timed out.',
                            'oauth_invalid_state': 'Invalid security token.',
                            'auth_route_not_found': 'Auth route not found.'
                        };
                        messagesDiv.innerHTML = '<div class="error">' + (errorMessages[error] || 'Authentication error.') + '</div>';
                    }

                    if (success === 'oauth_complete') {
                        const userData = urlParams.get('user');
                        if (userData) {
                            try {
                                const user = JSON.parse(atob(userData));
                                messagesDiv.innerHTML = '<div class="success">Welcome, ' + (user.name || user.email) + '!</div>';
                                sessionStorage.setItem('fittrack_user', JSON.stringify(user));
                                setTimeout(() => window.location.href = '/exercise.html', 2000);
                            } catch (e) {
                                console.error('Error parsing user data:', e);
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `);
    });

    app.get(["/exercise", "/exercise.html"], (req, res) => {
        console.log("🏋️ Exercise route (fallback)");
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Exercise Entry - FitTrack</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #333; text-align: center; margin-bottom: 30px; }
                    .coming-soon { text-align: center; padding: 60px 20px; }
                    .coming-soon h2 { color: #667eea; margin-bottom: 20px; }
                    .coming-soon p { color: #666; font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px; }
                    a { color: #667eea; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    .nav { text-align: center; margin-bottom: 30px; }
                    .nav a { margin: 0 15px; padding: 10px 20px; background: #667eea; color: white; border-radius: 25px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🏋️ Exercise Entry</h1>
                    <div class="nav">
                        <a href="/">🏠 Home</a>
                        <a href="/login.html">🔐 Login</a>
                        <a href="/api/workouts">📊 View Workouts</a>
                        <a href="/api/health">🏥 Status</a>
                    </div>
                    <div class="coming-soon">
                        <h2>Exercise Entry Form</h2>
                        <p>
                            The exercise entry form will be displayed here once you create the exercise.html file 
                            in your public directory. This is a placeholder to ensure your routing works correctly.
                        </p>
                        <p>
                            For now, you can test your API endpoints directly:
                            <br><br>
                            <a href="/api/workouts">View All Workouts (JSON)</a><br>
                            <a href="/api/health">API Health Check</a><br>
                            <a href="/api/exercise-types">Exercise Types & Categories</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `);
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'FitTrack API Server',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing'
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

// 404 handler for unmatched routes
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

// Handle app termination
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
    console.log("\n🎉 FitTrack Server is running!");
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
    console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
    console.log(`🏋️  Exercise page: http://localhost:${PORT}/exercise.html`);
    console.log(`📊 API health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    
    if (mongoose.connection.readyState === 1) {
        console.log("✅ MongoDB is connected and ready");
    } else {
        console.log("⚠️  MongoDB connection pending - check logs above");
    }
    
    console.log("\n📝 Available endpoints:");
    console.log("   GET  /                    - Home page");
    console.log("   GET  /login.html          - Login page");
    console.log("   GET  /exercise.html       - Add exercise page");
    console.log("   GET  /api/workouts        - Get all workouts");
    console.log("   POST /api/workouts        - Create new workout");
    console.log("   GET  /api/health          - API health check");
    console.log("   GET  /auth/google         - Google OAuth login");
    console.log("\n🔧 To stop server: Ctrl+C");
});

module.exports = app;