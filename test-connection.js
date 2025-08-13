require("dotenv").config(); // Load .env file
const mongoose = require("mongoose");

// Debug Atlas connection
async function debugAtlasConnection() {
    console.log("🔍 FitTrack MongoDB Atlas Connection Debug");
    console.log("=" .repeat(50));
    
    // Check environment variables
    console.log("📋 Environment Check:");
    console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
    console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
    
    const MONGO_URI = process.env.MONGODB_URI;
    
    if (!MONGO_URI) {
        console.error("❌ MONGODB_URI not found in environment variables!");
        console.log("\n🔧 To fix:");
        console.log("1. Ensure .env file exists in project root");
        console.log("2. Check .env file contains MONGODB_URI=...");
        console.log("3. Restart your application after making changes");
        return;
    }
    
    // Validate connection string format
    console.log("\n🔗 Connection String Analysis:");
    const isAtlas = MONGO_URI.includes("mongodb+srv://");
    const isLocal = MONGO_URI.includes("localhost") || MONGO_URI.includes("127.0.0.1");
    
    console.log("Format:", isAtlas ? "✅ Atlas SRV (+srv)" : isLocal ? "❌ Local MongoDB" : "❓ Unknown");
    console.log("Preview:", MONGO_URI.substring(0, 50) + "...");
    
    if (!isAtlas) {
        console.log("\n⚠️  Warning: Connection string doesn't appear to be for Atlas");
        console.log("Atlas connection strings should start with 'mongodb+srv://'");
    }
    
    // Extract cluster info
    try {
        const url = new URL(MONGO_URI.replace("mongodb+srv://", "https://"));
        console.log("Cluster hostname:", url.hostname);
        console.log("Database:", url.pathname.substring(1) || "default");
    } catch (e) {
        console.log("Could not parse connection string details");
    }
    
    // Test connection
    console.log("\n🧪 Testing Atlas Connection...");
    
    try {
        console.log("Connecting to MongoDB Atlas...");
        
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            connectTimeoutMS: 10000,
        });
        
        console.log("✅ Successfully connected to Atlas!");
        console.log("📊 Connection Details:");
        console.log("  Database:", mongoose.connection.db.databaseName);
        console.log("  Host:", mongoose.connection.host);
        console.log("  Ready State:", mongoose.connection.readyState); // 1 = connected
        
        // Test basic operations
        console.log("\n🔬 Testing Database Operations...");
        
        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("📚 Collections found:", collections.length);
        collections.forEach(col => console.log("  -", col.name));
        
        // Test write operation
        const testCollection = mongoose.connection.db.collection('connection_test');
        const testDoc = {
            test: true,
            timestamp: new Date(),
            message: "FitTrack Atlas connection successful!",
            app: "FitTrack"
        };
        
        const result = await testCollection.insertOne(testDoc);
        console.log("✅ Test write successful:", result.insertedId);
        
        // Test read operation
        const readTest = await testCollection.findOne({ _id: result.insertedId });
        console.log("✅ Test read successful:", !!readTest);
        
        // Clean up test document
        await testCollection.deleteOne({ _id: result.insertedId });
        console.log("🧹 Test document cleaned up");
        
        // Test Workout model operations
        console.log("\n🏋️ Testing Workout Model...");
        const Workout = require("./models/Workout");
        
        // Count existing workouts
        const workoutCount = await Workout.countDocuments();
        console.log("📊 Existing workouts:", workoutCount);
        
        // Create test workout
        const testWorkout = new Workout({
            exercises: [{
                type: "cardio",
                name: "Connection Test Run",
                duration: 5,
                distance: 1
            }]
        });
        
        const savedWorkout = await testWorkout.save();
        console.log("✅ Test workout created:", savedWorkout._id);
        
        // Read test workout
        const foundWorkout = await Workout.findById(savedWorkout._id);
        console.log("✅ Test workout found:", !!foundWorkout);
        
        // Clean up test workout
        await Workout.findByIdAndDelete(savedWorkout._id);
        console.log("🧹 Test workout cleaned up");
        
        await mongoose.disconnect();
        console.log("\n🎉 Atlas connection test completed successfully!");
        console.log("Your FitTrack app should now work with MongoDB Atlas.");
        
    } catch (error) {
        console.error("\n❌ Connection failed:", error.message);
        
        // Provide specific troubleshooting advice
        console.log("\n🔧 Troubleshooting Steps:");
        
        if (error.message.includes("authentication failed")) {
            console.log("1. ❌ Authentication Issue:");
            console.log("   - Check username and password in connection string");
            console.log("   - Verify database user exists in Atlas");
            console.log("   - Ensure password doesn't contain special characters (or URL encode them)");
        }
        
        if (error.message.includes("connection") || error.message.includes("timeout")) {
            console.log("2. ❌ Network/Connection Issue:");
            console.log("   - Check IP whitelist in Atlas (try 0.0.0.0/0 for testing)");
            console.log("   - Verify cluster is running (not paused)");
            console.log("   - Check firewall/antivirus settings");
        }
        
        if (error.message.includes("ENOTFOUND") || error.message.includes("DNS")) {
            console.log("3. ❌ DNS Issue:");
            console.log("   - Verify connection string hostname");
            console.log("   - Check internet connection");
            console.log("   - Try using Google DNS (8.8.8.8)");
        }
        
        console.log("\n📋 Atlas Checklist:");
        console.log("□ Database user created with correct credentials");
        console.log("□ IP address added to Atlas whitelist (or 0.0.0.0/0 for testing)");
        console.log("□ Cluster is active (not paused)");
        console.log("□ Connection string copied correctly from Atlas");
        console.log("□ .env file in correct location with MONGODB_URI");
        
        console.log("\n🌐 Quick Atlas Fix:");
        console.log("1. Go to https://cloud.mongodb.com");
        console.log("2. Navigate to your cluster");
        console.log("3. Click 'Connect' → 'Connect your application'");
        console.log("4. Copy the connection string");
        console.log("5. Replace <password> with your actual password");
        console.log("6. Update MONGODB_URI in .env file");
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the debug
debugAtlasConnection();