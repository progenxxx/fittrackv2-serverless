const router = require("express").Router();
const Workout = require("../models/Workout");

// Updated exercise type validation lists to match your frontend
const VALID_CATEGORIES = ["cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery"];
const VALID_TYPES = [
    // Main categories
    "cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery",
    // Cardio subcategories
    "low_intensity_cardio", "moderate_intensity_cardio", "high_intensity_cardio", "hiit",
    // Resistance subcategories
    "bodyweight", "free_weights", "machines", "resistance_bands", "powerlifting", "olympic_lifting",
    // Flexibility subcategories - FIXED: Added the missing types
    "static_stretching", "dynamic_stretching", "yoga", "pilates",
    // Balance subcategories
    "balance_training", "functional_movement", "tai_chi",
    // Sports specific subcategories
    "plyometrics", "agility", "endurance", "crossfit",
    // Recovery subcategories
    "active_recovery", "mobility_work", "meditation"
];
const VALID_INTENSITIES = ["light", "moderate", "vigorous", "maximum"];
const VALID_EQUIPMENT = [
    "none", "dumbbells", "barbell", "kettlebell", "resistance_bands", 
    "machines", "cardio_equipment", "suspension", "medicine_ball", "stability_ball"
];

// Middleware for logging API requests
router.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

// Helper function to map exercise type to category
function getExerciseCategory(type) {
    const typeToCategory = {
        // Cardio types
        'cardio': 'cardio',
        'low_intensity_cardio': 'cardio',
        'moderate_intensity_cardio': 'cardio',
        'high_intensity_cardio': 'cardio',
        'hiit': 'cardio',
        
        // Resistance types
        'resistance': 'resistance',
        'bodyweight': 'resistance',
        'free_weights': 'resistance',
        'machines': 'resistance',
        'resistance_bands': 'resistance',
        'powerlifting': 'resistance',
        'olympic_lifting': 'resistance',
        
        // Flexibility types - FIXED: Added the missing mappings
        'flexibility': 'flexibility',
        'static_stretching': 'flexibility',
        'dynamic_stretching': 'flexibility',
        'yoga': 'flexibility',
        'pilates': 'flexibility',
        
        // Balance types
        'balance': 'balance',
        'balance_training': 'balance',
        'functional_movement': 'balance',
        'tai_chi': 'balance',
        
        // Sports specific types
        'sports_specific': 'sports_specific',
        'plyometrics': 'sports_specific',
        'agility': 'sports_specific',
        'endurance': 'sports_specific',
        'crossfit': 'sports_specific',
        
        // Recovery types
        'recovery': 'recovery',
        'active_recovery': 'recovery',
        'mobility_work': 'recovery',
        'meditation': 'recovery'
    };
    
    return typeToCategory[type] || 'resistance'; // Default fallback
}

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
    
    // Validate intensity if provided
    if (exerciseData.intensity && !VALID_INTENSITIES.includes(exerciseData.intensity)) {
        errors.push(`Invalid intensity level. Received: "${exerciseData.intensity}". Valid intensities: ${VALID_INTENSITIES.join(', ')}`);
    }
    
    // Validate equipment if provided
    if (exerciseData.equipment && !VALID_EQUIPMENT.includes(exerciseData.equipment)) {
        errors.push(`Invalid equipment type. Received: "${exerciseData.equipment}". Valid equipment: ${VALID_EQUIPMENT.join(', ')}`);
    }
    
    // Category-specific validation with improved error messages
    if (exerciseData.category === 'resistance') {
        // For traditional resistance training, require sets and reps
        if (['resistance', 'free_weights', 'machines', 'powerlifting'].includes(exerciseData.type)) {
            if (!exerciseData.reps || exerciseData.reps <= 0) {
                errors.push('Traditional resistance exercises must have positive reps');
            }
            if (!exerciseData.sets || exerciseData.sets <= 0) {
                errors.push('Traditional resistance exercises must have positive sets');
            }
        }
        
        // Weight validation
        if (exerciseData.weight !== undefined && exerciseData.weight < 0) {
            errors.push('Weight cannot be negative');
        }
    }
    
    if (exerciseData.category === 'cardio') {
        // Distance validation
        if (exerciseData.distance !== undefined && exerciseData.distance < 0) {
            errors.push('Distance cannot be negative');
        }
        
        // Heart rate validation
        if (exerciseData.averageHeartRate && (exerciseData.averageHeartRate < 50 || exerciseData.averageHeartRate > 220)) {
            errors.push('Average heart rate seems unrealistic (50-220 bpm)');
        }
        
        if (exerciseData.maxHeartRate && (exerciseData.maxHeartRate < 50 || exerciseData.maxHeartRate > 220)) {
            errors.push('Max heart rate seems unrealistic (50-220 bpm)');
        }
    }
    
    // Validate perceived exertion
    if (exerciseData.perceivedExertion && (exerciseData.perceivedExertion < 1 || exerciseData.perceivedExertion > 10)) {
        errors.push('Perceived exertion must be between 1 and 10');
    }
    
    // Validate performance rating
    if (exerciseData.performanceRating && (exerciseData.performanceRating < 1 || exerciseData.performanceRating > 5)) {
        errors.push('Performance rating must be between 1 and 5');
    }
    
    return errors;
}

// GET all workouts (sorted by newest first)
router.get("/api/workouts", async (req, res) => {
    try {
        console.log("📋 Fetching all workouts from MongoDB...");
        
        // Support filtering by category, type, or date range
        const { category, type, startDate, endDate, limit } = req.query;
        let query = {};
        
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
            
        console.log(`✅ Found ${workouts.length} workouts`);
        
        // Include virtual fields in response
        const workoutsWithVirtuals = workouts.map(workout => ({
            _id: workout._id,
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
        console.error("❌ Error fetching workouts:", err);
        res.status(500).json({ 
            error: "Failed to fetch workouts", 
            details: err.message 
        });
    }
});

// POST new workout
router.post("/api/workouts", async (req, res) => {
    try {
        console.log("📝 Creating new workout with data:", JSON.stringify(req.body, null, 2));
        
        // Validate and prepare workout data
        const workoutData = {
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
        console.log("✅ Workout created successfully:", workout._id);
        
        // Return workout with virtual fields
        const responseWorkout = {
            _id: workout._id,
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
        
        // Handle validation errors
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

// GET single workout by ID
router.get("/api/workouts/:id", async (req, res) => {
    try {
        console.log("📋 Fetching workout with ID:", req.params.id);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const workout = await Workout.findById(req.params.id);
        if (!workout) {
            console.log("❌ Workout not found:", req.params.id);
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id}`
            });
        }
        
        console.log("✅ Workout found:", workout._id);
        res.json({
            _id: workout._id,
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

// POST add exercise to workout
router.post("/api/workouts/:id/exercises", async (req, res) => {
    try {
        console.log("🏋️ Adding exercise to workout:", req.params.id);
        console.log("Exercise data received:", JSON.stringify(req.body, null, 2));
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        // Check if workout exists first
        const existingWorkout = await Workout.findById(req.params.id);
        if (!existingWorkout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id}`
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
        
        // Add exercise to workout
        const workout = await Workout.findByIdAndUpdate(
            req.params.id,
            { 
                $push: { exercises: cleanExercise },
                $set: { updatedAt: new Date() }
            },
            { new: true, runValidators: true }
        );
        
        console.log("✅ Exercise added successfully to workout:", workout._id);
        console.log(`Total exercises: ${workout.exercises.length}, Total duration: ${workout.totalDuration || 0}`);
        
        // Return updated workout with virtual fields
        res.json({
            _id: workout._id,
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

// PUT update entire workout
router.put("/api/workouts/:id", async (req, res) => {
    try {
        console.log("📝 Updating workout:", req.params.id);
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
        
        const workout = await Workout.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id}`
            });
        }
        
        console.log("✅ Workout updated successfully:", workout._id);
        res.json({
            _id: workout._id,
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

// DELETE workout
router.delete("/api/workouts/:id", async (req, res) => {
    try {
        console.log("🗑️ Deleting workout:", req.params.id);
        
        // Validate ObjectId format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                error: "Invalid workout ID format",
                details: "Workout ID must be a valid MongoDB ObjectId"
            });
        }
        
        const workout = await Workout.findByIdAndDelete(req.params.id);
        
        if (!workout) {
            return res.status(404).json({ 
                error: "Workout not found",
                details: `No workout found with ID: ${req.params.id}`
            });
        }
        
        console.log("✅ Workout deleted successfully:", req.params.id);
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

// GET workout statistics with enhanced analytics
router.get("/api/workouts/stats/summary", async (req, res) => {
    try {
        console.log("📊 Calculating enhanced workout statistics...");
        
        const workouts = await Workout.find({}).sort({ day: -1 });
        
        if (!workouts || workouts.length === 0) {
            return res.json({
                totalWorkouts: 0,
                totalExercises: 0,
                totalDuration: 0,
                averageDuration: 0,
                totalCalories: 0,
                totalVolume: 0,
                totalDistance: 0,
                categoryStats: {},
                intensityStats: {},
                equipmentStats: {},
                weeklyAverage: 0,
                monthlyAverage: 0,
                lastWorkoutDate: null,
                currentStreak: 0,
                longestStreak: 0
            });
        }

        // Try to get statistics using model methods if available
        let stats = {
            totalWorkouts: workouts.length,
            totalExercises: 0,
            totalDuration: 0,
            totalCalories: 0,
            totalVolume: 0,
            totalDistance: 0,
            averageDuration: 0,
            lastWorkoutDate: workouts[0]?.day || null
        };

        // Calculate basic stats manually
        workouts.forEach(workout => {
            const exercises = workout.exercises || [];
            stats.totalExercises += exercises.length;
            
            exercises.forEach(exercise => {
                stats.totalDuration += exercise.duration || 0;
                stats.totalCalories += exercise.caloriesBurned || 0;
                stats.totalDistance += exercise.distance || 0;
                
                if (exercise.weight && exercise.reps && exercise.sets) {
                    stats.totalVolume += (exercise.weight * exercise.reps * exercise.sets);
                }
            });
        });

        stats.averageDuration = stats.totalWorkouts > 0 ? Math.round(stats.totalDuration / stats.totalWorkouts) : 0;

        let categoryStats = {};
        try {
            const categoryData = await Workout.getCategoryStatistics();
            categoryStats = categoryData.reduce((acc, cat) => {
                acc[cat._id] = {
                    count: cat.count,
                    totalDuration: cat.totalDuration,
                    averageDuration: cat.averageDuration,
                    totalCalories: cat.totalCalories || 0,
                    popularExercises: cat.exercises?.slice(0, 5) || []
                };
                return acc;
            }, {});
        } catch (err) {
            console.warn("Could not get category statistics:", err.message);
        }
        
        // Calculate additional statistics
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const weeklyWorkouts = workouts.filter(w => new Date(w.day) >= oneWeekAgo);
        const monthlyWorkouts = workouts.filter(w => new Date(w.day) >= oneMonthAgo);
        
        // Intensity breakdown
        const intensityStats = {};
        const equipmentStats = {};
        
        workouts.forEach(workout => {
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
            categoryStats,
            intensityStats,
            equipmentStats,
            weeklyAverage: weeklyWorkouts.length,
            monthlyAverage: Math.round(monthlyWorkouts.length),
            currentStreak: calculateWorkoutStreak(workouts),
            longestStreak: calculateLongestStreak(workouts)
        };

        console.log("✅ Enhanced workout statistics calculated");
        res.json(enhancedStats);
    } catch (err) {
        console.error("❌ Error calculating workout stats:", err);
        res.status(500).json({ 
            error: "Failed to calculate statistics", 
            details: err.message 
        });
    }
});

// Helper function to calculate current workout streak
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

// Helper function to calculate longest workout streak
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

// GET popular exercises
router.get("/api/workouts/stats/popular-exercises", async (req, res) => {
    try {
        const { limit = 20, category, type } = req.query;
        console.log(`📊 Getting popular exercises (limit: ${limit})`);
        
        let matchStage = {};
        if (category) matchStage['exercises.category'] = category;
        if (type) matchStage['exercises.type'] = type;
        
        const pipeline = [
            { $unwind: '$exercises' }
        ];
        
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
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
                    lastPerformed: { $max: '$day' },
                    averageIntensity: { $avg: '$exercises.intensity' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        );
        
        const popularExercises = await Workout.aggregate(pipeline);
        
        console.log(`✅ Found ${popularExercises.length} popular exercises`);
        res.json(popularExercises);
    } catch (err) {
        console.error("❌ Error getting popular exercises:", err);
        res.status(500).json({ 
            error: "Failed to get popular exercises", 
            details: err.message 
        });
    }
});

// GET exercise types and categories info
router.get("/api/exercise-types", (req, res) => {
    console.log("📋 Fetching exercise types information");
    
    const exerciseTypes = {
        categories: VALID_CATEGORIES,
        types: VALID_TYPES,
        intensities: VALID_INTENSITIES,
        equipment: VALID_EQUIPMENT,
        typeToCategory: {
            // Map each type to its category for frontend use
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
        }
    };
    
    res.json(exerciseTypes);
});

// Health check endpoint with enhanced information
router.get("/api/health", async (req, res) => {
    try {
        console.log("🏥 Performing enhanced health check...");
        
        // Test MongoDB connection
        const workoutCount = await Workout.countDocuments();
        const lastWorkout = await Workout.findOne().sort({ day: -1 });
        
        let categoryStats = [];
        try {
            categoryStats = await Workout.getCategoryStatistics();
        } catch (err) {
            console.warn("Could not get category statistics:", err.message);
        }
        
        const healthData = {
            status: "healthy",
            mongodb: "connected",
            timestamp: new Date().toISOString(),
            workoutCount: workoutCount,
            categoryCount: categoryStats.length,
            lastWorkout: lastWorkout ? {
                id: lastWorkout._id,
                date: lastWorkout.day,
                exerciseCount: lastWorkout.exercises?.length || 0,
                workoutType: lastWorkout.workoutType,
                totalDuration: lastWorkout.totalDuration
            } : null,
            api: {
                version: "2.1.1",
                features: [
                    "Enhanced Exercise Types",
                    "Category-based Organization", 
                    "Intensity Tracking",
                    "Equipment Management",
                    "Advanced Analytics",
                    "Workout Streaks",
                    "Fixed Exercise Validation",
                    "Better Error Handling"
                ],
                validExerciseTypes: VALID_TYPES.length,
                validCategories: VALID_CATEGORIES.length,
                endpoints: [
                    "GET /api/workouts",
                    "POST /api/workouts", 
                    "GET /api/workouts/:id",
                    "PUT /api/workouts/:id",
                    "DELETE /api/workouts/:id",
                    "POST /api/workouts/:id/exercises",
                    "GET /api/workouts/stats/summary",
                    "GET /api/workouts/stats/popular-exercises",
                    "GET /api/exercise-types",
                    "GET /api/health"
                ]
            }
        };
        
        console.log("✅ Enhanced health check completed successfully");
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

// Catch-all for undefined API routes
router.all("/api/*", (req, res) => {
    console.log(`❌ Unknown API endpoint: ${req.method} ${req.path}`);
    res.status(404).json({
        error: "API endpoint not found",
        details: `${req.method} ${req.path} is not a valid API endpoint`,
        availableEndpoints: [
            "GET /api/workouts - Get all workouts (supports filtering)",
            "POST /api/workouts - Create new workout",
            "GET /api/workouts/:id - Get specific workout",
            "PUT /api/workouts/:id - Update workout",
            "DELETE /api/workouts/:id - Delete workout",
            "POST /api/workouts/:id/exercises - Add exercise to workout",
            "GET /api/workouts/stats/summary - Get enhanced workout statistics",
            "GET /api/workouts/stats/popular-exercises - Get popular exercises",
            "GET /api/exercise-types - Get exercise types and categories",
            "GET /api/health - Enhanced API health check"
        ]
    });
});

module.exports = (app) => {
    app.use(router);
    console.log("🔌 Fixed API routes initialized successfully");
    console.log("🎯 New fixes: Better error handling, workout existence checks, and improved validation");
    console.log("✅ All exercise types now properly supported with enhanced validation");
};