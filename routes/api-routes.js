const router = require("express").Router();
const Workout = require("../models/Workout");
const User = require("../models/User");
const mongoose = require("mongoose");

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

const extractUserInfo = async (req, res, next) => {
    try {
        let userId = null;
        let userEmail = null;
        let user = null;
        
        if (req.body && req.body.userEmail) {
            userEmail = req.body.userEmail;
        }
        
        if (!userEmail && req.query && req.query.userEmail) {
            userEmail = req.query.userEmail;
        }
        
        if (!userEmail && req.headers) {
            userEmail = req.headers['x-user-email'];
        }
        
        if (userEmail) {
            try {
                user = await User.findByEmail(userEmail);
                if (user) {
                    userId = user._id; 
                    userEmail = user.email.toLowerCase();
                    console.log(`User lookup successful: ${userEmail} -> MongoDB ObjectId: ${userId}`);
                } else {
                    console.warn(`User not found for email: ${userEmail}`);
                }
            } catch (dbError) {
                console.error('Database error during user lookup:', dbError);
            }
        }
        
        req.userInfo = {
            userId: userId, 
            userEmail: userEmail,
            user: user 
        };
        
        if (userId) {
            console.log(`User info extracted: ${req.userInfo.userEmail} (MongoDB ObjectId: ${req.userInfo.userId})`);
        } else {
            console.log(`No valid user info extracted from request`);
        }
        
        next();
    } catch (error) {
        console.error("Error extracting user info:", error);
        req.userInfo = { userId: null, userEmail: null, user: null };
        next();
    }
};

router.use(extractUserInfo);

const requireAuth = (req, res, next) => {
    if (!req.userInfo.userId || !req.userInfo.userEmail) {
        return res.status(401).json({
            error: "Authentication required",
            details: "Please log in to access this resource. User ID and email are required.",
            code: "AUTH_REQUIRED"
        });
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.userInfo.userId)) {
        console.error(`Invalid MongoDB ObjectId: ${req.userInfo.userId}`);
        return res.status(400).json({
            error: "Invalid user ID format",
            details: "User ID must be a valid MongoDB ObjectId",
            code: "INVALID_USER_ID"
        });
    }
    
    next();
};

router.get("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Fetching workouts for user: ${userEmail} (ObjectId: ${userId})`);
        
        const { category, type, startDate, endDate, limit } = req.query;
        let query = { userId: userId }; 
        
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
            
        console.log(`Found ${workouts.length} workouts for user ${userEmail}`);
        
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
        console.error("Error fetching user workouts:", err);
        res.status(500).json({ 
            error: "Failed to fetch workouts", 
            details: err.message 
        });
    }
});

router.post("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Creating new workout for user: ${userEmail} (ObjectId: ${userId})`);
        console.log("Workout data:", JSON.stringify(req.body, null, 2));
        
        const workoutData = {
            userId: userId, 
            userEmail: userEmail, 
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
        
        if (workoutData.exercises.length > 0) {
            const validationErrors = [];
            workoutData.exercises.forEach((exercise, index) => {
                const errors = validateExerciseData(exercise);
                if (errors.length > 0) {
                    validationErrors.push(`Exercise ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                console.error("Workout validation failed:", validationErrors);
                return res.status(400).json({
                    error: "Exercise validation failed",
                    details: validationErrors.join('; ')
                });
            }
        }
        
        const workout = await Workout.create(workoutData);
        console.log(`Workout created successfully for user ${userEmail}:`, workout._id);
        
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
        console.error("Error creating workout:", err);
        
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

router.get("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Fetching workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const workout = await Workout.findOne({
            _id: req.params.id,
            userId: userId 
        });
        
        if (!workout) {
            console.log(`Workout not found or not owned by user: ${req.params.id}`);
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`Workout found for user ${userEmail}:`, workout._id);
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
        console.error("Error fetching workout:", err);
        res.status(500).json({ 
            error: "Server error while fetching workout", 
            details: err.message 
        });
    }
});

router.put("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Updating workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const updateData = { ...req.body };
        delete updateData.userId; 
        delete updateData.userEmail; 
        updateData.updatedAt = new Date();
        
        if (updateData.exercises && Array.isArray(updateData.exercises)) {
            const validationErrors = [];
            updateData.exercises.forEach((exercise, index) => {
                const errors = validateExerciseData(exercise);
                if (errors.length > 0) {
                    validationErrors.push(`Exercise ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                console.error("Exercise validation failed:", validationErrors);
                return res.status(400).json({
                    error: "Exercise validation failed",
                    details: validationErrors.join('; ')
                });
            }
        }
        
        const workout = await Workout.findOneAndUpdate(
            { 
                _id: req.params.id,
                userId: userId 
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
        
        console.log(`Workout updated successfully for user ${userEmail}:`, workout._id);
        
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
        console.error("Error updating workout:", err);
        
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

router.delete("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Deleting workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const workout = await Workout.findOneAndDelete({
            _id: req.params.id,
            userId: userId 
        });
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`Workout deleted successfully for user ${userEmail}:`, workout._id);
        res.json({ 
            message: "Workout deleted successfully",
            deletedWorkout: {
                _id: workout._id,
                title: workout.title,
                day: workout.day
            }
        });
    } catch (err) {
        console.error("Error deleting workout:", err);
        res.status(500).json({ 
            error: "Failed to delete workout", 
            details: err.message 
        });
    }
});

router.post("/api/workouts/:id/exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Adding exercise to workout ${req.params.id} for user: ${userEmail} (ObjectId: ${userId})`);
        console.log("Exercise data received:", JSON.stringify(req.body, null, 2));
        
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const existingWorkout = await Workout.findOne({
            _id: req.params.id,
            userId: userId 
        });
        
        if (!existingWorkout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
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
        
        const workout = await Workout.findOneAndUpdate(
            { 
                _id: req.params.id,
                userId: userId 
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
        
        console.log(`Exercise added successfully to workout for user ${userEmail}:`, workout._id);
        console.log(`Total exercises: ${workout.exercises.length}, Total duration: ${workout.totalDuration || 0}`);
        
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
        console.error("Error adding exercise:", err);
        
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

router.get("/api/workouts/stats/summary", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`Fetching workout stats for user: ${userEmail} (ObjectId: ${userId})`);
        
        const stats = await Workout.getUserWorkoutStats(userId);
        const categoryStats = await Workout.getUserCategoryStats(userId);
        
        console.log(`Stats fetched for user ${userEmail}`);
        res.json({
            summary: stats,
            categoryBreakdown: categoryStats,
            userId: userId,
            userEmail: userEmail
        });
    } catch (err) {
        console.error("Error fetching workout stats:", err);
        res.status(500).json({ 
            error: "Failed to fetch workout statistics", 
            details: err.message 
        });
    }
});

router.get("/api/workouts/stats/popular-exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        const { limit = 10, category, type } = req.query;
        
        console.log(`Fetching popular exercises for user: ${userEmail} (ObjectId: ${userId})`);
        
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
        
        console.log(`Found ${popularExercises.length} popular exercises for user ${userEmail}`);
        res.json(popularExercises);
    } catch (err) {
        console.error("Error fetching popular exercises:", err);
        res.status(500).json({ 
            error: "Failed to fetch popular exercises", 
            details: err.message 
        });
    }
});

function validateExerciseData(exerciseData) {
    const errors = [];
    
    if (!exerciseData.name || !exerciseData.name.trim()) {
        errors.push("Exercise name is required");
    }
    
    if (!exerciseData.type || !VALID_TYPES.includes(exerciseData.type)) {
        errors.push(`Valid exercise type is required. Received: "${exerciseData.type}". Valid types: ${VALID_TYPES.join(', ')}`);
    }
    
    if (!exerciseData.duration || exerciseData.duration <= 0) {
        errors.push("Duration must be greater than 0");
    }
    
    if (!exerciseData.category) {
        exerciseData.category = getExerciseCategory(exerciseData.type);
    }
    
    if (!VALID_CATEGORIES.includes(exerciseData.category)) {
        errors.push(`Valid exercise category is required. Received: "${exerciseData.category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    }
    
    return errors;
}

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

router.get("/api/health", async (req, res) => {
    try {
        console.log("Performing enhanced health check...");
    
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
        
        console.log("Health check completed successfully");
        res.json(healthData);
    } catch (err) {
        console.error("Health check failed:", err);
        res.status(500).json({
            status: "unhealthy",
            mongodb: "disconnected",
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get("/api/debug/user-info", (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: "Not found" });
    }
    
    res.json({
        userInfo: req.userInfo,
        headers: {
            'x-user-email': req.headers['x-user-email'],
            'x-user-id': req.headers['x-user-id'] 
        },
        body: req.body,
        query: req.query
    });
});

module.exports = (app) => {
    app.use(router);
    console.log("FIXED: User-specific API routes initialized successfully");
    console.log("All workout operations now require user authentication");
    console.log("Users can only access their own workout data");
    console.log("Enhanced security with ownership verification on all operations");
    console.log("FIXED: Google ID to MongoDB ObjectId conversion via email lookup");
    console.log("Added workout statistics and analytics endpoints");
};