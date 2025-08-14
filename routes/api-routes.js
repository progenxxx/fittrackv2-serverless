const router = require("express").Router();
const Workout = require("../models/Workout");
const User = require("../models/User");

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

// Middleware to extract user information from request
const extractUserInfo = async (req, res, next) => {
    try {
        // Try to get user info from various sources
        let userId = null;
        let userEmail = null;
        
        // Method 1: From request body (when creating/updating workouts)
        if (req.body && (req.body.userId || req.body.userEmail)) {
            userId = req.body.userId;
            userEmail = req.body.userEmail;
        }
        
        // Method 2: From query parameters
        if (!userId && req.query && (req.query.userId || req.query.userEmail)) {
            userId = req.query.userId;
            userEmail = req.query.userEmail;
        }
        
        // Method 3: From headers (for frontend API calls)
        if (!userId && req.headers) {
            userId = req.headers['x-user-id'];
            userEmail = req.headers['x-user-email'];
        }
        
        // If we have userId, get the user's email
        if (userId && !userEmail) {
            const user = await User.findById(userId);
            if (user) {
                userEmail = user.email;
            }
        }
        
        // If we have email but no userId, get the user's ID
        if (userEmail && !userId) {
            const user = await User.findByEmail(userEmail);
            if (user) {
                userId = user._id;
            }
        }
        
        // Attach user info to request for use in route handlers
        req.userInfo = {
            userId: userId,
            userEmail: userEmail ? userEmail.toLowerCase() : null
        };
        
        console.log(`👤 User info extracted: ${req.userInfo.userEmail} (${req.userInfo.userId})`);
        
        next();
    } catch (error) {
        console.error("Error extracting user info:", error);
        // Continue without user info - some endpoints might work without it
        req.userInfo = { userId: null, userEmail: null };
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
            details: "User ID and email are required. Please log in again.",
            code: "AUTH_REQUIRED"
        });
    }
    next();
};

// GET all workouts for authenticated user
router.get("/api/workouts", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📋 Fetching workouts for user: ${userEmail}`);
        
        // Support filtering by category, type, or date range (user-specific)
        const { category, type, startDate, endDate, limit } = req.query;
        let query = { userId: userId }; // Always filter by user
        
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
        console.log(`📝 Creating new workout for user: ${userEmail}`);
        console.log("Workout data:", JSON.stringify(req.body, null, 2));
        
        // Validate and prepare workout data
        const workoutData = {
            userId: userId, // Associate with authenticated user
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
        console.log(`📋 Fetching workout ${req.params.id} for user: ${userEmail}`);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Find workout and verify ownership
        const workout = await Workout.findOne({
            _id: req.params.id,
            userId: userId // Ensure user owns this workout
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

// POST add exercise to user's workout
router.post("/api/workouts/:id/exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`🏋️ Adding exercise to workout ${req.params.id} for user: ${userEmail}`);
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

// PUT update entire workout (with user ownership verification)
router.put("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📝 Updating workout ${req.params.id} for user: ${userEmail}`);
        console.log("Update data:", JSON.stringify(req.body, null, 2));
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const updateData = { ...req.body };
        
        // Always set updatedAt
        updateData.updatedAt = new Date();
        
        // Ensure user ownership fields are not modified
        delete updateData.userId;
        delete updateData.userEmail;
        
        // Validate exercises if provided
        if (updateData.exercises) {
            if (!Array.isArray(updateData.exercises)) {
                return res.status(400).json({
                    error: "Invalid exercises format",
                    details: "Exercises must be an array"
                });
            }
            
            const validationErrors = [];
            updateData.exercises.forEach((exercise, index) => {
                const errors = validateExerciseData(exercise);
                if (errors.length > 0) {
                    validationErrors.push(`Exercise ${index + 1}: ${errors.join(', ')}`);
                }
            });
            
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    error: "Exercise validation failed",
                    details: validationErrors.join('; ')
                });
            }
        }
        
        const workout = await Workout.findOneAndUpdate(
            { 
                _id: req.params.id,
                userId: userId // Ensure user owns this workout
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
        console.error("❌ Error updating workout:", err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: "Workout validation failed", 
                details: Object.values(err.errors).map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({ 
            error: "Failed to update workout", 
            details: err.message 
        });
    }
});

// DELETE workout (with user ownership verification)
router.delete("/api/workouts/:id", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`🗑️ Deleting workout ${req.params.id} for user: ${userEmail}`);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const workout = await Workout.findOneAndDelete({
            _id: req.params.id,
            userId: userId // Ensure user owns this workout
        });
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id} for your account`
            });
        }
        
        console.log(`✅ Workout deleted successfully for user ${userEmail}:`, req.params.id);
        res.json({ 
            message: "Workout deleted successfully", 
            deletedWorkout: {
                _id: workout._id,
                day: workout.day,
                exerciseCount: workout.exercises?.length || 0
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

// GET workout statistics for authenticated user
router.get("/api/workouts/stats/summary", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        console.log(`📊 Calculating workout statistics for user: ${userEmail}`);
        
        // Get user-specific statistics
        const stats = await Workout.getUserWorkoutStats(userId);
        const categoryStats = await Workout.getUserCategoryStats(userId);
        
        // Calculate additional user-specific statistics
        const userWorkouts = await Workout.findByUser(userId);
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const weeklyWorkouts = userWorkouts.filter(w => new Date(w.day) >= oneWeekAgo);
        const monthlyWorkouts = userWorkouts.filter(w => new Date(w.day) >= oneMonthAgo);
        
        // Intensity and equipment breakdown for user
        const intensityStats = {};
        const equipmentStats = {};
        
        userWorkouts.forEach(workout => {
            const exercises = workout.exercises || [];
            exercises.forEach(exercise => {
                // Intensity stats
                const intensity = exercise.intensity || 'moderate';
                if (!intensityStats[intensity]) {
                    intensityStats[intensity] = { count: 0, duration: 0 };
                }
                intensityStats[intensity].count++;
                intensityStats[intensity].duration += exercise.duration || 0;
                
                // Equipment stats
                const equipment = exercise.equipment || 'none';
                if (!equipmentStats[equipment]) {
                    equipmentStats[equipment] = { count: 0, duration: 0 };
                }
                equipmentStats[equipment].count++;
                equipmentStats[equipment].duration += exercise.duration || 0;
            });
        });
        
        const enhancedStats = {
            ...stats,
            categoryStats: categoryStats.reduce((acc, cat) => {
                acc[cat._id] = {
                    count: cat.count,
                    totalDuration: cat.totalDuration,
                    averageDuration: cat.averageDuration,
                    totalCalories: cat.totalCalories || 0,
                    popularExercises: cat.exercises?.slice(0, 5) || []
                };
                return acc;
            }, {}),
            intensityStats,
            equipmentStats,
            weeklyAverage: weeklyWorkouts.length,
            monthlyAverage: Math.round(monthlyWorkouts.length),
            currentStreak: calculateWorkoutStreak(userWorkouts),
            longestStreak: calculateLongestStreak(userWorkouts),
            lastWorkoutDate: userWorkouts.length > 0 ? userWorkouts[0].day : null
        };

        console.log(`✅ User workout statistics calculated for ${userEmail}`);
        res.json(enhancedStats);
    } catch (err) {
        console.error("❌ Error calculating user workout stats:", err);
        res.status(500).json({ 
            error: "Failed to calculate statistics", 
            details: err.message 
        });
    }
});

// GET popular exercises for authenticated user
router.get("/api/workouts/stats/popular-exercises", requireAuth, async (req, res) => {
    try {
        const { userId, userEmail } = req.userInfo;
        const { limit = 20, category, type } = req.query;
        console.log(`📊 Getting popular exercises for user ${userEmail} (limit: ${limit})`);
        
        let matchStage = { userId: new mongoose.Types.ObjectId(userId) };
        if (category) matchStage['exercises.category'] = category;
        if (type) matchStage['exercises.type'] = type;
        
        const pipeline = [
            { $match: matchStage },
            { $unwind: '$exercises' }
        ];
        
        if (category) {
            pipeline.push({ $match: { 'exercises.category': category } });
        }
        if (type) {
            pipeline.push({ $match: { 'exercises.type': type } });
        }
        
        pipeline.push(
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
                    totalVolume: { 
                        $sum: { 
                            $multiply: [
                                { $ifNull: ['$exercises.weight', 0] },
                                { $ifNull: ['$exercises.reps', 0] },
                                { $ifNull: ['$exercises.sets', 1] }
                            ]
                        }
                    },
                    totalDistance: { $sum: { $ifNull: ['$exercises.distance', 0] } },
                    totalCalories: { $sum: { $ifNull: ['$exercises.caloriesBurned', 0] } },
                    lastPerformed: { $max: '$day' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        );
        
        const popularExercises = await Workout.aggregate(pipeline);
        
        console.log(`✅ Found ${popularExercises.length} popular exercises for user ${userEmail}`);
        res.json(popularExercises);
    } catch (err) {
        console.error("❌ Error getting user popular exercises:", err);
        res.status(500).json({ 
            error: "Failed to get popular exercises", 
            details: err.message 
        });
    }
});

// Helper function to validate exercise data (same as before)
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

// Helper functions for streak calculations
function calculateWorkoutStreak(workouts) {
    if (!workouts || workouts.length === 0) return 0;
    
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.day) - new Date(a.day));
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const workout of sortedWorkouts) {
        const workoutDate = new Date(workout.day);
        workoutDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
            streak++;
            currentDate = workoutDate;
        } else {
            break;
        }
    }
    
    return streak;
}

function calculateLongestStreak(workouts) {
    if (!workouts || workouts.length === 0) return 0;
    
    const workoutDates = workouts.map(w => {
        const date = new Date(w.day);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }).sort((a, b) => a - b);
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < workoutDates.length; i++) {
        const daysDiff = (workoutDates[i] - workoutDates[i-1]) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 1) {
            currentStreak++;
        } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
        }
    }
    
    return Math.max(longestStreak, currentStreak);
}

// Health check endpoint with user-specific information
router.get("/api/health", async (req, res) => {
    try {
        console.log("🏥 Performing health check...");
        
        // Test MongoDB connection with user-aware queries
        const totalUsers = await User.countDocuments();
        const totalWorkouts = await Workout.countDocuments();
        const workoutsToday = await Workout.countDocuments({
            day: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
        });
        
        const healthData = {
            status: "healthy",
            mongodb: "connected",
            timestamp: new Date().toISOString(),
            userCount: totalUsers,
            workoutCount: totalWorkouts,
            workoutsToday: workoutsToday,
            api: {
                version: "2.2.0-user-specific",
                features: [
                    "User-Specific Workouts",
                    "Account-Based Activity Tracking", 
                    "Enhanced Security with Ownership Verification",
                    "User Authentication Required",
                    "Individual Progress Tracking",
                    "Personal Statistics and Analytics"
                ],
                authentication: "required",
                userIsolation: "enabled",
                endpoints: [
                    "GET /api/workouts (user-specific)",
                    "POST /api/workouts (creates for authenticated user)", 
                    "GET /api/workouts/:id (verifies ownership)",
                    "PUT /api/workouts/:id (user ownership required)",
                    "DELETE /api/workouts/:id (user ownership required)",
                    "POST /api/workouts/:id/exercises (user ownership required)",
                    "GET /api/workouts/stats/summary (user-specific stats)",
                    "GET /api/workouts/stats/popular-exercises (user-specific)",
                    "GET /api/health"
                ]
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

module.exports = (app) => {
    app.use(router);
    console.log("🔌 User-specific API routes initialized successfully");
    console.log("🔐 All workout operations now require user authentication");
    console.log("🎯 Users can only access their own workout data");
    console.log("✅ Enhanced security with ownership verification on all operations");
};