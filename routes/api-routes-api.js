// routes/api-routes.js
const mongoose = require("mongoose");

// Import your Workout model (you'll need to create this if it doesn't exist)
// If you don't have a model file, I'll include a basic one below
const Workout = require("../models/api/workout");

module.exports = function(app) {
    console.log("🔌 Loading API routes...");

    // ===== HEALTH CHECK ENDPOINT =====
    app.get("/api/health", async (req, res) => {
        try {
            console.log("🔄 Health check requested");
            
            // Check MongoDB connection state
            let mongoStatus = 'disconnected';
            let workoutCount = 0;
            let connectionState = mongoose.connection.readyState;
            
            if (connectionState === 1) {
                mongoStatus = 'connected';
                try {
                    // Test MongoDB with a simple query with timeout
                    workoutCount = await Workout.countDocuments({}).maxTimeMS(5000);
                } catch (dbError) {
                    console.warn('⚠️ Database query failed during health check:', dbError.message);
                    mongoStatus = 'connected_but_query_failed';
                }
            }
            
            const healthData = {
                status: mongoStatus === 'connected' ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                server: 'FitTracker API Server',
                mongodb: mongoStatus,
                environment: process.env.NODE_ENV || 'development',
                database: mongoose.connection.name || 'unknown',
                workoutCount: workoutCount,
                connectionState: connectionState,
                version: '2.1.4-vercel-complete',
                deployment: 'vercel-serverless'
            };

            // Set status code based on MongoDB connection
            const statusCode = (mongoStatus === 'connected') ? 200 : 503;
            
            console.log(`✅ Health check completed - Status: ${healthData.status}`);
            res.status(statusCode).json(healthData);
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
            res.status(503).json({
                status: 'unhealthy',
                mongodb: 'error',
                error: error.message,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                version: '2.1.4-vercel-complete'
            });
        }
    });

    // ===== GET ALL WORKOUTS =====
    app.get("/api/workouts", async (req, res) => {
        try {
            console.log("🔄 GET /api/workouts - Fetching all workouts");
            
            const workouts = await Workout.find({})
                .sort({ day: -1 }) // Sort by most recent first
                .maxTimeMS(10000); // 10 second timeout
            
            console.log(`✅ Found ${workouts.length} workouts`);
            res.json(workouts);
            
        } catch (error) {
            console.error("❌ Error fetching workouts:", error);
            res.status(500).json({ 
                error: "Failed to fetch workouts", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== CREATE NEW WORKOUT =====
    app.post("/api/workouts", async (req, res) => {
        try {
            console.log("🔄 POST /api/workouts - Creating new workout");
            console.log("📝 Workout data:", req.body);
            
            const workoutData = {
                day: req.body.day || new Date().toISOString(),
                exercises: req.body.exercises || [],
                ...req.body
            };
            
            const workout = new Workout(workoutData);
            const savedWorkout = await workout.save();
            
            console.log(`✅ Workout created with ID: ${savedWorkout._id}`);
            res.status(201).json(savedWorkout);
            
        } catch (error) {
            console.error("❌ Error creating workout:", error);
            res.status(500).json({ 
                error: "Failed to create workout", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== GET SPECIFIC WORKOUT =====
    app.get("/api/workouts/:id", async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🔄 GET /api/workouts/${id} - Fetching specific workout`);
            
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    error: "Invalid workout ID format",
                    timestamp: new Date().toISOString()
                });
            }
            
            const workout = await Workout.findById(id).maxTimeMS(10000);
            
            if (!workout) {
                console.log(`❌ Workout not found: ${id}`);
                return res.status(404).json({ 
                    error: `Workout with ID ${id} not found`,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log(`✅ Found workout: ${id}`);
            res.json(workout);
            
        } catch (error) {
            console.error(`❌ Error fetching workout ${req.params.id}:`, error);
            res.status(500).json({ 
                error: "Failed to fetch workout", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== ADD EXERCISE TO WORKOUT =====
    app.post("/api/workouts/:id/exercises", async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🔄 POST /api/workouts/${id}/exercises - Adding exercise`);
            console.log("📝 Exercise data:", req.body);
            
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    error: "Invalid workout ID format",
                    timestamp: new Date().toISOString()
                });
            }
            
            const workout = await Workout.findById(id);
            
            if (!workout) {
                console.log(`❌ Workout not found: ${id}`);
                return res.status(404).json({ 
                    error: `Workout with ID ${id} not found`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Add the exercise to the workout
            const exerciseData = {
                ...req.body,
                timestamp: new Date().toISOString()
            };
            
            workout.exercises.push(exerciseData);
            const updatedWorkout = await workout.save();
            
            console.log(`✅ Exercise added to workout: ${id}`);
            res.json(updatedWorkout);
            
        } catch (error) {
            console.error(`❌ Error adding exercise to workout ${req.params.id}:`, error);
            res.status(500).json({ 
                error: "Failed to add exercise", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== UPDATE WORKOUT =====
    app.put("/api/workouts/:id", async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🔄 PUT /api/workouts/${id} - Updating workout`);
            
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    error: "Invalid workout ID format",
                    timestamp: new Date().toISOString()
                });
            }
            
            const updatedWorkout = await Workout.findByIdAndUpdate(
                id, 
                { 
                    ...req.body,
                    updatedAt: new Date().toISOString()
                }, 
                { 
                    new: true, // Return the updated document
                    runValidators: true // Run schema validators
                }
            );
            
            if (!updatedWorkout) {
                console.log(`❌ Workout not found for update: ${id}`);
                return res.status(404).json({ 
                    error: `Workout with ID ${id} not found`,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log(`✅ Workout updated: ${id}`);
            res.json(updatedWorkout);
            
        } catch (error) {
            console.error(`❌ Error updating workout ${req.params.id}:`, error);
            res.status(500).json({ 
                error: "Failed to update workout", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== DELETE WORKOUT =====
    app.delete("/api/workouts/:id", async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🔄 DELETE /api/workouts/${id} - Deleting workout`);
            
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    error: "Invalid workout ID format",
                    timestamp: new Date().toISOString()
                });
            }
            
            const deletedWorkout = await Workout.findByIdAndDelete(id);
            
            if (!deletedWorkout) {
                console.log(`❌ Workout not found for deletion: ${id}`);
                return res.status(404).json({ 
                    error: `Workout with ID ${id} not found`,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log(`✅ Workout deleted: ${id}`);
            res.json({ 
                message: "Workout deleted successfully", 
                deletedWorkout: deletedWorkout,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`❌ Error deleting workout ${req.params.id}:`, error);
            res.status(500).json({ 
                error: "Failed to delete workout", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== WORKOUT STATISTICS ENDPOINT =====
    app.get("/api/workouts/stats/summary", async (req, res) => {
        try {
            console.log("🔄 GET /api/workouts/stats/summary - Calculating workout stats");
            
            const workouts = await Workout.find({}).maxTimeMS(10000);
            
            const stats = {
                totalWorkouts: workouts.length,
                totalExercises: 0,
                totalDuration: 0,
                totalWeight: 0,
                averageDuration: 0,
                calculatedAt: new Date().toISOString()
            };

            workouts.forEach(workout => {
                if (workout.exercises && workout.exercises.length > 0) {
                    stats.totalExercises += workout.exercises.length;
                    
                    workout.exercises.forEach(exercise => {
                        stats.totalDuration += exercise.duration || 0;
                        if (exercise.type === 'resistance') {
                            const weight = exercise.weight || 0;
                            const reps = exercise.reps || 0;
                            const sets = exercise.sets || 1;
                            stats.totalWeight += weight * reps * sets;
                        }
                    });
                }
            });

            stats.averageDuration = stats.totalWorkouts > 0 ? 
                Math.round(stats.totalDuration / stats.totalWorkouts) : 0;

            console.log("✅ Workout stats calculated");
            res.json(stats);
            
        } catch (error) {
            console.error("❌ Error calculating workout stats:", error);
            res.status(500).json({ 
                error: "Failed to calculate workout statistics", 
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    // ===== CATCH-ALL FOR UNMATCHED API ROUTES =====
    app.use("/api/*", (req, res) => {
        console.log(`❌ API route not found: ${req.method} ${req.originalUrl}`);
        res.status(404).json({
            error: "API endpoint not found",
            message: `${req.method} ${req.originalUrl} is not a valid API endpoint`,
            timestamp: new Date().toISOString(),
            availableEndpoints: [
                "GET /api/health",
                "GET /api/workouts",
                "POST /api/workouts", 
                "GET /api/workouts/:id",
                "PUT /api/workouts/:id",
                "DELETE /api/workouts/:id",
                "POST /api/workouts/:id/exercises",
                "GET /api/workouts/stats/summary"
            ]
        });
    });

    console.log("✅ API routes loaded successfully");
    console.log("📝 Available endpoints:");
    console.log("   GET  /api/health                    - API health check");
    console.log("   GET  /api/workouts                  - Get all workouts");
    console.log("   POST /api/workouts                  - Create new workout");
    console.log("   GET  /api/workouts/:id              - Get specific workout");
    console.log("   PUT  /api/workouts/:id              - Update workout");
    console.log("   DELETE /api/workouts/:id            - Delete workout");
    console.log("   POST /api/workouts/:id/exercises    - Add exercise to workout");
    console.log("   GET  /api/workouts/stats/summary    - Get workout statistics");
};