const path = require("path");

module.exports = function(app) {
    console.log("Setting up HTML routes...");

    console.log("Static files served from:", path.join(__dirname, "..", "public"));

    app.get("/", (req, res) => {
        console.log("Root route accessed");
        res.sendFile(path.join(__dirname, "..", "public", "index.html"), (err) => {
            if (err) {
                console.log("index.html not found, redirecting to login");
                res.redirect("/login.html");
            }
        });
    });

    app.get("/login", (req, res) => {
        console.log("Login route (without .html) accessed");
        res.sendFile(path.join(__dirname, "..", "public", "login.html"), (err) => {
            if (err) {
                console.error("login.html not found:", err.message);
                res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>FitTrack - Login</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
                            .container { max-width: 500px; margin: 0 auto; }
                            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; }
                            .info { color: #0c5460; background: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; }
                            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
                            button:hover { background: #0056b3; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>FitTrack</h1>
                            <div class="error">
                                <h2>Login page not found</h2>
                                <p>The login.html file is missing from the public directory.</p>
                            </div>
                            <div class="info">
                                <h3>Quick Setup</h3>
                                <p>Create a login.html file in your public directory with Google OAuth integration.</p>
                                <button onclick="window.location.href='/auth/google'">
                                    Login with Google
                                </button>
                            </div>
                            <p><a href="/api/health">Check API Status</a></p>
                        </div>
                    </body>
                    </html>
                `);
            }
        });
    });

    app.get("/login.html", (req, res) => {
        console.log("Login.html route accessed");
        res.sendFile(path.join(__dirname, "..", "public", "login.html"), (err) => {
            if (err) {
                console.error("login.html not found:", err.message);
                res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>FitTrack - Login</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .login-container {
                                background: white;
                                padding: 40px;
                                border-radius: 15px;
                                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                                text-align: center;
                                max-width: 400px;
                                width: 100%;
                                margin: 20px;
                            }
                            .logo {
                                font-size: 3rem;
                                margin-bottom: 10px;
                            }
                            h1 {
                                color: #333;
                                margin-bottom: 10px;
                                font-size: 2rem;
                            }
                            .subtitle {
                                color: #666;
                                margin-bottom: 30px;
                                font-size: 1.1rem;
                            }
                            .google-btn {
                                background: #4285f4;
                                color: white;
                                border: none;
                                padding: 15px 30px;
                                border-radius: 50px;
                                font-size: 16px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                display: inline-flex;
                                align-items: center;
                                gap: 10px;
                                text-decoration: none;
                                margin-bottom: 20px;
                            }
                            .google-btn:hover {
                                background: #3367d6;
                                transform: translateY(-2px);
                                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                            }
                            .status-link {
                                color: #666;
                                text-decoration: none;
                                font-size: 14px;
                            }
                            .status-link:hover {
                                color: #4285f4;
                            }
                            .error-message {
                                background: #fee;
                                color: #c33;
                                padding: 15px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                                border-left: 4px solid #c33;
                            }
                            .success-message {
                                background: #efe;
                                color: #363;
                                padding: 15px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                                border-left: 4px solid #363;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="login-container">
                            <div class="logo"></div>
                            <h1>FitTrack</h1>
                            <p class="subtitle">Track your fitness journey</p>
                            
                            <div id="messages"></div>
                            
                            <a href="/auth/google" class="google-btn">
                                <span></span>
                                Login with Google
                            </a>
                            
                            <br>
                            <a href="/api/health" class="status-link">Check System Status</a>
                        </div>

                        <script>
                            // Handle URL parameters for error/success messages
                            const urlParams = new URLSearchParams(window.location.search);
                            const error = urlParams.get('error');
                            const success = urlParams.get('success');
                            const messagesDiv = document.getElementById('messages');

                            if (error) {
                                const errorMessages = {
                                    'oauth_config_missing': 'OAuth configuration is incomplete. Please check environment variables.',
                                    'oauth_failed': 'Authentication failed. Please try again.',
                                    'oauth_denied': 'Authentication was denied. Please allow access to continue.',
                                    'oauth_no_code': 'No authorization code received from Google.',
                                    'oauth_expired': 'Authorization code expired. Please try logging in again.',
                                    'network_error': 'Network error occurred. Please check your connection.',
                                    'oauth_timeout': 'Authentication timed out. Please try again.',
                                    'oauth_invalid_state': 'Invalid security token. Please try again.',
                                    'auth_route_not_found': 'Authentication route not found.'
                                };
                                
                                const errorMessage = errorMessages[error] || 'An unknown error occurred during authentication.';
                                messagesDiv.innerHTML = '<div class="error-message">' + errorMessage + '</div>';
                            }

                            if (success === 'oauth_complete') {
                                const userData = urlParams.get('user');
                                if (userData) {
                                    try {
                                        const user = JSON.parse(atob(userData));
                                        messagesDiv.innerHTML = '<div class="success-message">Welcome back, ' + (user.name || user.email) + '!</div>';
                                        
                                        // Store user data (in real app, use secure session management)
                                        sessionStorage.setItem('fittrack_user', JSON.stringify(user));
                                        
                                        // Redirect to main app after 2 seconds
                                        setTimeout(() => {
                                            window.location.href = '/excercise.html';
                                        }, 2000);
                                    } catch (e) {
                                        console.error('Error parsing user data:', e);
                                    }
                                }
                            }
                        </script>
                    </body>
                    </html>
                `);
            }
        });
    });

    app.get("/exercise", (req, res) => {
        console.log("Exercise route (without .html) accessed");
        res.sendFile(path.join(__dirname, "..", "public", "excercise.html"), (err) => {
            if (err) {
                console.error("excercise.html not found:", err.message);
                res.status(404).send("Exercise page not found. Please create excercise.html in the public directory.");
            }
        });
    });

    app.get("/excercise.html", (req, res) => {
        console.log("excercise.html route accessed");
        res.sendFile(path.join(__dirname, "..", "public", "excercise.html"), (err) => {
            if (err) {
                console.error("excercise.html not found:", err.message);
                res.status(404).send("Exercise page not found. Please create excercise.html in the public directory.");
            }
        });
    });

    app.get(["/dashboard", "/dashboard.html"], (req, res) => {
        console.log("Dashboard route accessed");
        res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"), (err) => {
            if (err) {
                console.log("dashboard.html not found, redirecting to exercise page");
                res.redirect("/excercise.html");
            }
        });
    });

    app.get(["/workouts", "/workouts.html"], (req, res) => {
        console.log("Workouts route accessed");
        res.sendFile(path.join(__dirname, "..", "public", "workouts.html"), (err) => {
            if (err) {
                console.log("workouts.html not found, redirecting to exercise page");
                res.redirect("/excercise.html");
            }
        });
    });

    app.get("/404.html", (req, res) => {
        res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"), (err) => {
            if (err) {
                res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Page Not Found - FitTrack</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
                            .container { max-width: 600px; margin: 0 auto; }
                            .error-code { font-size: 4rem; color: #dc3545; margin: 20px 0; }
                            .error-message { font-size: 1.5rem; color: #333; margin: 20px 0; }
                            .back-link { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                            .back-link:hover { background: #0056b3; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="error-code">404</div>
                            <div class="error-message">Page Not Found</div>
                            <p>The page you're looking for doesn't exist.</p>
                            <a href="/" class="back-link">← Go to Home</a>
                            <br><br>
                            <a href="/api/health">Check System Status</a>
                        </div>
                    </body>
                    </html>
                `);
            }
        });
    });

    console.log("HTML routes initialized");
    console.log("Available HTML routes:");
    console.log("   GET  /              - Home page (redirects to login if no index.html)");
    console.log("   GET  /login         - Login page (without extension)");
    console.log("   GET  /login.html    - Login page (with extension)");
    console.log("   GET  /exercise      - Exercise page (without extension)");
    console.log("   GET  /excercise.html - Exercise page (with extension)");
    console.log("   GET  /dashboard     - Dashboard page");
    console.log("   GET  /workouts      - Workouts page");
    console.log("   GET  /404.html      - 404 error page");
};