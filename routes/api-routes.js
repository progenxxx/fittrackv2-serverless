const router = require("express").Router();
const Workout = require("../models/Workout");
const User = require("../models/User");
const mongoose = require("mongoose");

// Updated exercise type validation lists
const VALID_CATEGORIES = ["cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery"];
const VALID_TYPES = [
    "cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery",
    "low_intensity_cardio", "moderate_intensity_cardio", "high_intensity_cardio", "hiit",
    "bodyweight", "free_weights", "machines", "resistance_bands", "powerlifting", "olympic_lifting",
    "static_stretching", "dynamic_stretching", "yoga", "pilates",
    "balance_training", "functional_movement", "tai_chi",
    "plyometrics", "agility", "endurance", "crossfit",
    "active_recovery", "mobility_work", "meditation"
];

// FIXED: Enhanced middleware to extract user information from request
const extractUserInfo = async (req, res, next) => {
    try {
        let userId = null;
        let userEmail = null;
        let user = null;
        
        // Method 1: From request body (when creating/updating workouts)
        if (req.body && req.body.userEmail) {
            userEmail = req.body.userEmail;
        }
        
        // Method 2: From query parameters
        if (!userEmail && req.query && req.query.userEmail) {
            userEmail = req.query.userEmail;
        }
        
        // Method 3: From headers (for frontend API calls) - MOST COMMON
        if (!userEmail && req.headers) {
            userEmail = req.headers['x-user-email'];
            // IMPORTANT: NEVER use x-user-id directly as it might be Google ID
        }
        
        // If we have email, get the user from database to get correct MongoDB ObjectId
        if (userEmail) {
            try {
                user = await User.findByEmail(userEmail);
                if (user) {
                    userId = user._id; // This is the correct MongoDB ObjectId
                    userEmail = user.email.toLowerCase();
                    console.log(`✅ User lookup successful: ${userEmail} -> MongoDB ObjectId: ${userId}`);
                } else {
                    console.warn(`❌ User not found for email: ${userEmail}`);
                }
            } catch (dbError) {
                console.error('❌ Database error during user lookup:', dbError);
            }
        }
        
        // Attach user info to request for use in route handlers
        req.userInfo = {
            userId: userId, // MongoDB ObjectId (never Google ID)
            userEmail: userEmail,
            user: user // Full user object if needed
        };
        
        if (userId) {
            console.log(`👤 User info extracted: ${req.userInfo.userEmail} (MongoDB ObjectId: ${req.userInfo.userId})`);
        } else {
            console.log(`👤 No valid user info extracted from request`);
        }
        
        next();
    } catch (error) {
        console.error("❌ Error extracting user info:", error);
        // Continue without user info - let requireAuth handle authentication
        req.userInfo = { userId: null, userEmail: null, user: null };
        next();
    }
};

// Apply user extraction middleware to all routes
router.use(extractUserInfo);

// Helper function to validate user authentication for protected routes
const requireAuth = (req, res, next) => {
    if (!req.userInfo.userId || !req.userInfo.userEmail) {
        return res.status(401).json({
            error: "Authentication required",
            details: "Please log in to access this resource. User ID and email are required.",
            code: "AUTH_REQUIRED"
        });
    }
    
    // Additional validation: ensure userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.userInfo.userId)) {
        console.error(`❌ Invalid MongoDB ObjectId: ${req.userInfo.userId}`);
        return res.status(400).json({
            error: "Invalid user ID format",
            details: "User ID must be a valid MongoDB ObjectId",
            code: "INVALID_USER_ID"
        });
    }
    
    next();
};

// GET all workouts for authenticated user
router.get("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📋 Fetching workouts for user: ${userEmail} (ObjectId: ${userId})`);
        
        // Support filtering by category, type, or date range (user-specific)
        const { category, type, startDate, endDate, limit } = req.query;
        let query = { userId: userId }; // Always filter by user - userId is MongoDB ObjectId
        
        if (category) {
            query['exercises.category'] = category;
        }
        
        if (type) {
            query['exercises.type'] = type;
        }
        
        if (startDate || endDate) {
            query.day = {};
            if (startDate) query.day.$gte = new Date(startDate);
            if (endDate) query.day.$lte = new Date(endDate);
        }
        
        const workouts = await Workout.find(query)
            .sort({ day: -1 })
            .limit(limit ? parseInt(limit) : 0);
            
        console.log(`✅ Found ${workouts.length} workouts for user ${userEmail}`);
        
        // Include virtual fields in response
        const workoutsWithVirtuals = workouts.map(workout => ({
            _id: workout._id,
            userId: workout.userId,
            userEmail: workout.userEmail,
            day: workout.day,
            exercises: workout.exercises || [],
            title: workout.title,
            description: workout.description,
            location: workout.location,
            workoutType: workout.workoutType,
            difficulty: workout.difficulty,
            overallRating: workout.overallRating,
            mood: workout.mood,
            notes: workout.notes,
            goals: workout.goals,
            achievements: workout.achievements,
            personalRecords: workout.personalRecords,
            createdAt: workout.createdAt,
            updatedAt: workout.updatedAt,
            // Virtual fields
            totalDuration: workout.totalDuration,
            exerciseCount: workout.exerciseCount,
            totalCalories: workout.totalCalories,
            totalVolume: workout.totalVolume,
            totalDistance: workout.totalDistance,
            categoryBreakdown: workout.categoryBreakdown,
            intensityBreakdown: workout.intensityBreakdown,
            averageIntensity: workout.averageIntensity
        }));
        
        res.json(workoutsWithVirtuals);
    } catch (err) {
        console.error("❌ Error fetching user workouts:", err);
        res.status(500).json({ 
            error: "Failed to fetch workouts", 
            details: err.message 
        });
    }
});

// POST new workout for authenticated user
router.post("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📝 Creating new workout for user: ${userEmail} (ObjectId: ${userId})`);
        console.log("Workout data:", JSON.stringify(req.body, null, 2));
        
        // Validate and prepare workout data
        const workoutData = {
            userId: userId, // MongoDB ObjectId
            userEmail: userEmail, // Store email for quick queries
            day: req.body.day || new Date().toISOString(),
            exercises: Array.isArray(req.body.exercises) ? req.body.exercises : [],
            title: req.body.title || undefined,
            description: req.body.description || undefined,
            location: req.body.location || "gym",
            workoutType: req.body.workoutType || "mixed",
            difficulty: req.body.difficulty || "intermediate",
            overallRating: req.body.overallRating || undefined,
            mood: req.body.mood || undefined,
            notes: req.body.notes || undefined,
            goals: req.body.goals || [],
            achievements: req.body.achievements || [],
            personalRecords: req.body.personalRecords || []
        };
        
        // Validate exercises if provided
        if (workoutData.exercises.length > 0) {
            const validationErrors = [];
            workoutData.exercises.forEach((exercise, index) => {
                const errors = validateExerciseData(exercise);
                if (errors.length > 0) {
                    validationErrors.push(`Exercise ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                console.error("❌ Workout validation failed:", validationErrors);
                return res.status(400).json({
                    error: "Exercise validation failed",
                    details: validationErrors.join('; ')
                });
            }
        }
        
        const workout = await Workout.create(workoutData);
        console.log(`✅ Workout created successfully for user ${userEmail}:`, workout._id);
        
        // Return workout with virtual fields
        const responseWorkout = {
            _id: workout._id,
            userId: workout.userId,
            userEmail: workout.userEmail,
            day: workout.day,
            exercises: workout.exercises,
            title: workout.title,
            description: workout.description,
            location: workout.location,
            workoutType: workout.workoutType,
            difficulty: workout.difficulty,
            overallRating: workout.overallRating,
            mood: workout.mood,
            notes: workout.notes,
            goals: workout.goals,
            achievements: workout.achievements,
            personalRecords: workout.personalRecords,
            createdAt: workout.createdAt,
            updatedAt: workout.updatedAt,
            totalDuration: workout.totalDuration,
            exerciseCount: workout.exerciseCount,
            categoryBreakdown: workout.categoryBreakdown
        };
        
        res.status(201).json(responseWorkout);
    } catch (err) {
        console.error("❌ Error creating workout:", err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: "Failed to create workout", 
            details: err.message 
        });
    }
});

// GET single workout by ID (with user ownership verification)
router.get("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📋 Fetching workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        // Validate ObjectId format for workout ID
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Find workout and verify ownership
        const workout = await Workout.findOne({
            _id: req.params.id,
            userId: userId // Ensure user owns this workout - userId is MongoDB ObjectId
        });
        
        if (!workout) {
            console.log(`❌ Workout not found or not owned by user: ${req.params.id}`);
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`✅ Workout found for user ${userEmail}:`, workout._id);
        res.json({
            _id: workout._id,
            userId: workout.userId,
            userEmail: workout.userEmail,
            day: workout.day,
            exercises: workout.exercises || [],
            title: workout.title,
            description: workout.description,
            location: workout.location,
            workoutType: workout.workoutType,
            difficulty: workout.difficulty,
            overallRating: workout.overallRating,
            mood: workout.mood,
            notes: workout.notes,
            goals: workout.goals,
            achievements: workout.achievements,
            personalRecords: workout.personalRecords,
            createdAt: workout.createdAt,
            updatedAt: workout.updatedAt,
            // Virtual fields
            totalDuration: workout.totalDuration,
            exerciseCount: workout.exerciseCount,
            totalCalories: workout.totalCalories,
            totalVolume: workout.totalVolume,
            totalDistance: workout.totalDistance,
            categoryBreakdown: workout.categoryBreakdown,
            intensityBreakdown: workout.intensityBreakdown,
            averageIntensity: workout.averageIntensity
        });
    } catch (err) {
        console.error("❌ Error fetching workout:", err);
        res.status(500).json({ 
            error: "Server error while fetching workout", 
            details: err.message 
        });
    }
});

// PUT update workout by ID
router.put("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`🔄 Updating workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Prepare update data (remove sensitive fields)
        const updateData = { ...req.body };
        delete updateData.userId; // Don't allow changing userId
        delete updateData.userEmail; // Don't allow changing userEmail
        updateData.updatedAt = new Date();
        
        // Validate exercises if provided
        if (updateData.exercises && Array.isArray(updateData.exercises)) {
            const validationErrors = [];
            updateData.exercises.forEach((exercise, index) => {
                const errors = validateExerciseData(exercise);
                if (errors.length > 0) {
                    validationErrors.push(`Exercise ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                console.error("❌ Exercise validation failed:", validationErrors);
                return res.status(400).json({
                    error: "Exercise validation failed",
                    details: validationErrors.join('; ')
                });
            }
        }
        
        // Update workout and verify ownership
        const workout = await Workout.findOneAndUpdate(
            { 
                _id: req.params.id,
                userId: userId // Verify ownership
            },
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`✅ Workout updated successfully for user ${userEmail}:`, workout._id);
        
        // Return updated workout with virtual fields
        res.json({
            _id: workout._id,
            userId: workout.userId,
            userEmail: workout.userEmail,
            day: workout.day,
            exercises: workout.exercises,
            title: workout.title,
            description: workout.description,
            location: workout.location,
            workoutType: workout.workoutType,
            difficulty: workout.difficulty,
            overallRating: workout.overallRating,
            mood: workout.mood,
            notes: workout.notes,
            goals: workout.goals,
            achievements: workout.achievements,
            personalRecords: workout.personalRecords,
            createdAt: workout.createdAt,
            updatedAt: workout.updatedAt,
            totalDuration: workout.totalDuration,
            exerciseCount: workout.exerciseCount,
            categoryBreakdown: workout.categoryBreakdown
        });
    } catch (err) {
        console.error("❌ Error updating workout:", err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: "Failed to update workout", 
            details: err.message 
        });
    }
});

// DELETE workout by ID
router.delete("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`🗑️ Deleting workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Delete workout and verify ownership
        const workout = await Workout.findOneAndDelete({
            _id: req.params.id,
            userId: userId // Verify ownership
        });
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`✅ Workout deleted successfully for user ${userEmail}:`, workout._id);
        res.json({ 
            message: "Workout deleted successfully",
            deletedWorkout: {
                _id: workout._id,
                title: workout.title,
                day: workout.day
            }
        });
    } catch (err) {
        console.error("❌ Error deleting workout:", err);
        res.status(500).json({ 
            error: "Failed to delete workout", 
            details: err.message 
        });
    }
});

// POST add exercise to user's workout
router.post("/api/workouts/:id/exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`🏋️ Adding exercise to workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        console.log("Exercise data received:", JSON.stringify(req.body, null, 2));
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Check if workout exists and user owns it
        const existingWorkout = await Workout.findOne({
            _id: req.params.id,
            userId: userId // Verify ownership
        });
        
        if (!existingWorkout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        // Validate exercise data
        const exerciseData = { ...req.body };
        console.log("Validating exercise data:", exerciseData);
        
        const validationErrors = validateExerciseData(exerciseData);
        
        if (validationErrors.length > 0) {
            console.error("❌ Exercise validation failed:", validationErrors);
            return res.status(400).json({
                error: "Exercise validation failed",
                details: validationErrors.join(', '),
                receivedData: exerciseData
            });
        }
        
        // Clean and prepare exercise data
        const cleanExercise = {
            name: exerciseData.name.trim(),
            type: exerciseData.type,
            category: exerciseData.category,
            duration: parseInt(exerciseData.duration),
            intensity: exerciseData.intensity || 'moderate',
            equipment: exerciseData.equipment || 'none',
            notes: exerciseData.notes ? exerciseData.notes.trim() : undefined,
            perceivedExertion: exerciseData.perceivedExertion ? parseInt(exerciseData.perceivedExertion) : undefined,
            performanceRating: exerciseData.performanceRating ? parseInt(exerciseData.performanceRating) : undefined
        };
        
        // Add category-specific fields
        if (exerciseData.category === 'cardio') {
            if (exerciseData.distance !== undefined) cleanExercise.distance = parseFloat(exerciseData.distance);
            if (exerciseData.caloriesBurned) cleanExercise.caloriesBurned = parseInt(exerciseData.caloriesBurned);
            if (exerciseData.averageHeartRate) cleanExercise.averageHeartRate = parseInt(exerciseData.averageHeartRate);
            if (exerciseData.maxHeartRate) cleanExercise.maxHeartRate = parseInt(exerciseData.maxHeartRate);
        } else if (exerciseData.category === 'resistance') {
            if (exerciseData.weight !== undefined) cleanExercise.weight = parseFloat(exerciseData.weight);
            if (exerciseData.sets) cleanExercise.sets = parseInt(exerciseData.sets);
            if (exerciseData.reps) cleanExercise.reps = parseInt(exerciseData.reps);
            if (exerciseData.restBetweenSets) cleanExercise.restBetweenSets = parseInt(exerciseData.restBetweenSets);
        } else if (exerciseData.category === 'flexibility') {
            if (exerciseData.stretchHoldTime) cleanExercise.stretchHoldTime = parseInt(exerciseData.stretchHoldTime);
            if (exerciseData.rangeOfMotionImprovement) cleanExercise.rangeOfMotionImprovement = exerciseData.rangeOfMotionImprovement;
        }
        
        console.log("Clean exercise data to save:", JSON.stringify(cleanExercise, null, 2));
        
        // Add exercise to workout (ensuring user ownership)
        const workout = await Workout.findOneAndUpdate(
            { 
                _id: req.params.id,
                userId: userId // Double-check ownership
            },
            { 
                $push: { exercises: cleanExercise },
                $set: { updatedAt: new Date() }
            },
            { new: true, runValidators: true }
        );
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found during update",
                details: "The workout may have been deleted or you don't have permission to modify it"
            });
        }
        
        console.log(`✅ Exercise added successfully to workout for user ${userEmail}:`, workout._id);
        console.log(`Total exercises: ${workout.exercises.length}, Total duration: ${workout.totalDuration || 0}`);
        
        // Return updated workout with virtual fields
        res.json({
            _id: workout._id,
            userId: workout.userId,
            userEmail: workout.userEmail,
            day: workout.day,
            exercises: workout.exercises,
            title: workout.title,
            description: workout.description,
            location: workout.location,
            workoutType: workout.workoutType,
            difficulty: workout.difficulty,
            overallRating: workout.overallRating,
            mood: workout.mood,
            notes: workout.notes,
            goals: workout.goals,
            achievements: workout.achievements,
            personalRecords: workout.personalRecords,
            createdAt: workout.createdAt,
            updatedAt: workout.updatedAt,
            totalDuration: workout.totalDuration,
            exerciseCount: workout.exerciseCount,
            categoryBreakdown: workout.categoryBreakdown,
            intensityBreakdown: workout.intensityBreakdown
        });
    } catch (err) {
        console.error("❌ Error adding exercise:", err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: "Exercise validation failed", 
                details: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                error: "Invalid workout ID", 
                details: "The provided workout ID is not valid"
            });
        }
        
        res.status(500).json({ 
            error: "Failed to add exercise", 
            details: err.message 
        });
    }
});

// GET workout statistics for user
router.get("/api/workouts/stats/summary", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📊 Fetching workout stats for user: ${userEmail} (ObjectId: ${userId})`);
        
        const stats = await Workout.getUserWorkoutStats(userId);
        const categoryStats = await Workout.getUserCategoryStats(userId);
        
        console.log(`✅ Stats fetched for user ${userEmail}`);
        res.json({
            summary: stats,
            categoryBreakdown: categoryStats,
            userId: userId,
            userEmail: userEmail
        });
    } catch (err) {
        console.error("❌ Error fetching workout stats:", err);
        res.status(500).json({ 
            error: "Failed to fetch workout statistics", 
            details: err.message 
        });
    }
});

// GET popular exercises for user
router.get("/api/workouts/stats/popular-exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        const { limit = 10, category, type } = req.query;
        
        console.log(`🏆 Fetching popular exercises for user: ${userEmail} (ObjectId: ${userId})`);
        
        let matchStage = { userId: userId };
        if (category) matchStage['exercises.category'] = category;
        if (type) matchStage['exercises.type'] = type;
        
        const popularExercises = await Workout.aggregate([
            { $match: matchStage },
            { $unwind: '$exercises' },
            {
                $group: {
                    _id: {
                        name: '$exercises.name',
                        type: '$exercises.type',
                        category: '$exercises.category'
                    },
                    count: { $sum: 1 },
                    totalDuration: { $sum: '$exercises.duration' },
                    averageDuration: { $avg: '$exercises.duration' },
                    totalCalories: { $sum: '$exercises.caloriesBurned' },
                    totalVolume: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$exercises.weight', 0] },
                                { $ifNull: ['$exercises.reps', 0] },
                                { $ifNull: ['$exercises.sets', 0] }
                            ]
                        }
                    },
                    totalDistance: { $sum: '$exercises.distance' },
                    lastPerformed: { $max: '$day' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: 0,
                    name: '$_id.name',
                    type: '$_id.type',
                    category: '$_id.category',
                    count: 1,
                    totalDuration: 1,
                    averageDuration: { $round: ['$averageDuration', 1] },
                    totalCalories: 1,
                    totalVolume: 1,
                    totalDistance: 1,
                    lastPerformed: 1
                }
            }
        ]);
        
        console.log(`✅ Found ${popularExercises.length} popular exercises for user ${userEmail}`);
        res.json(popularExercises);
    } catch (err) {
        console.error("❌ Error fetching popular exercises:", err);
        res.status(500).json({ 
            error: "Failed to fetch popular exercises", 
            details: err.message 
        });
    }
});

// Helper function to validate exercise data
function validateExerciseData(exerciseData) {
    const errors = [];
    
    // Required fields
    if (!exerciseData.name || !exerciseData.name.trim()) {
        errors.push("Exercise name is required");
    }
    
    if (!exerciseData.type || !VALID_TYPES.includes(exerciseData.type)) {
        errors.push(`Valid exercise type is required. Received: "${exerciseData.type}". Valid types: ${VALID_TYPES.join(', ')}`);
    }
    
    if (!exerciseData.duration || exerciseData.duration <= 0) {
        errors.push("Duration must be greater than 0");
    }
    
    // Auto-set category if not provided
    if (!exerciseData.category) {
        exerciseData.category = getExerciseCategory(exerciseData.type);
    }
    
    // Validate category
    if (!VALID_CATEGORIES.includes(exerciseData.category)) {
        errors.push(`Valid exercise category is required. Received: "${exerciseData.category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    }
    
    return errors;
}

// Helper function to map exercise type to category
function getExerciseCategory(type) {
    const typeToCategory = {
        'cardio': 'cardio',
        'low_intensity_cardio': 'cardio',
        'moderate_intensity_cardio': 'cardio',
        'high_intensity_cardio': 'cardio',
        'hiit': 'cardio',
        'resistance': 'resistance',
        'bodyweight': 'resistance',
        'free_weights': 'resistance',
        'machines': 'resistance',
        'resistance_bands': 'resistance',
        'powerlifting': 'resistance',
        'olympic_lifting': 'resistance',
        'flexibility': 'flexibility',
        'static_stretching': 'flexibility',
        'dynamic_stretching': 'flexibility',
        'yoga': 'flexibility',
        'pilates': 'flexibility',
        'balance': 'balance',
        'balance_training': 'balance',
        'functional_movement': 'balance',
        'tai_chi': 'balance',
        'sports_specific': 'sports_specific',
        'plyometrics': 'sports_specific',
        'agility': 'sports_specific',
        'endurance': 'sports_specific',
        'crossfit': 'sports_specific',
        'recovery': 'recovery',
        'active_recovery': 'recovery',
        'mobility_work': 'recovery',
        'meditation': 'recovery'
    };
    
    return typeToCategory[type] || 'resistance';
}

// Health check endpoint with enhanced information
router.get("/api/health", async (req, res) => {
    try {
        console.log("🏥 Performing enhanced health check...");
        
        // Test MongoDB connection
        const workoutCount = await Workout.countDocuments();
        const userCount = await User.countDocuments();
        
        const healthData = {
            status: "healthy",
            mongodb: "connected",
            timestamp: new Date().toISOString(),
            userCount: userCount,
            workoutCount: workoutCount,
            api: {
                version: "2.3.0-fixed-google-id-handling",
                features: [
                    "Fixed Google ID to MongoDB ObjectId Conversion",
                    "Proper User Email Lookup",
                    "Enhanced Error Handling",
                    "User-Specific Workouts",
                    "Account-Based Activity Tracking",
                    "Workout Statistics",
                    "Popular Exercise Analytics"
                ],
                authentication: "required",
                userIsolation: "enabled",
                userIdHandling: "email-lookup-to-mongodb-objectid"
            }
        };
        
        console.log("✅ Health check completed successfully");
        res.json(healthData);
    } catch (err) {
        console.error("❌ Health check failed:", err);
        res.status(500).json({
            status: "unhealthy",
            mongodb: "disconnected",
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Debug endpoint for development (remove in production)
router.get("/api/debug/user-info", (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: "Not found" });
    }
    
    res.json({
        userInfo: req.userInfo,
        headers: {
            'x-user-email': req.headers['x-user-email'],
            'x-user-id': req.headers['x-user-id'] // This should NOT be used
        },
        body: req.body,
        query: req.query
    });
});

module.exports = (app) => {
    app.use(router);
    console.log("🔌 FIXED: User-specific API routes initialized successfully");
    console.log("🔐 All workout operations now require user authentication");
    console.log("🎯 Users can only access their own workout data");
    console.log("✅ Enhanced security with ownership verification on all operations");
    console.log("🔧 FIXED: Google ID to MongoDB ObjectId conversion via email lookup");
    console.log("📊 Added workout statistics and analytics endpoints");
};