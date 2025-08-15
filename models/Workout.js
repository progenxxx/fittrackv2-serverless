const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, "Exercise type is required"],
        enum: [
            "cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery",
            "low_intensity_cardio", "moderate_intensity_cardio", "high_intensity_cardio", "hiit",
            "bodyweight", "free_weights", "machines", "resistance_bands", "powerlifting", "olympic_lifting",
            "static_stretching", "dynamic_stretching", "yoga", "pilates",
            "balance_training", "functional_movement", "tai_chi",
            "plyometrics", "agility", "endurance", "crossfit",
            "active_recovery", "mobility_work", "meditation"
        ],
        trim: true
    },
    category: {
        type: String,
        enum: ["cardio", "resistance", "flexibility", "balance", "sports_specific", "recovery"],
        required: [true, "Exercise category is required"]
    },
    name: {
        type: String,
        required: [true, "Exercise name is required"],
        trim: true,
        maxlength: [100, "Exercise name cannot exceed 100 characters"]
    },
    duration: {
        type: Number,
        min: [0, "Duration cannot be negative"],
        default: 0,
        required: [true, "Duration is required"]
    },
    intensity: {
        type: String,
        enum: ["light", "moderate", "vigorous", "maximum"],
        default: "moderate"
    },
    perceivedExertion: {
        type: Number,
        min: 1,
        max: 10,
        validate: {
            validator: function(v) {
                return v === undefined || v === null || (v >= 1 && v <= 10);
            },
            message: "Perceived exertion must be between 1 and 10"
        }
    },
    equipment: {
        type: String,
        enum: [
            "none", "dumbbells", "barbell", "kettlebell", "resistance_bands", 
            "machines", "cardio_equipment", "suspension", "medicine_ball", "stability_ball"
        ],
        default: "none"
    },
    muscleGroups: [{
        type: String,
        enum: [
            "chest", "back", "shoulders", "biceps", "triceps", "core", 
            "quadriceps", "hamstrings", "glutes", "calves", "full_body"
        ]
    }],
    distance: {
        type: Number,
        min: [0, "Distance cannot be negative"],
        default: 0
    },
    averageHeartRate: {
        type: Number,
        min: [50, "Heart rate seems too low"],
        max: [220, "Heart rate seems too high"]
    },
    maxHeartRate: {
        type: Number,
        min: [50, "Heart rate seems too low"],
        max: [220, "Heart rate seems too high"]
    },
    caloriesBurned: {
        type: Number,
        min: [0, "Calories cannot be negative"]
    },
    weight: {
        type: Number,
        min: [0, "Weight cannot be negative"],
        default: 0
    },
    reps: {
        type: Number,
        min: [0, "Reps cannot be negative"],
        default: 0
    },
    sets: {
        type: Number,
        min: [0, "Sets cannot be negative"],
        default: 0
    },
    restBetweenSets: {
        type: Number,
        min: [0, "Rest time cannot be negative"],
        default: 60 
    },
    stretchHoldTime: {
        type: Number,
        min: [0, "Hold time cannot be negative"]
    },
    rangeOfMotionImprovement: {
        type: String,
        enum: ["poor", "fair", "good", "excellent"]
    },
    notes: {
        type: String,
        maxlength: [500, "Notes cannot exceed 500 characters"],
        trim: true
    },
    performanceRating: {
        type: Number,
        min: 1,
        max: 5,
        validate: {
            validator: function(v) {
                return v === undefined || v === null || (v >= 1 && v <= 5);
            },
            message: "Performance rating must be between 1 and 5"
        }
    }
}, {
    _id: true,
    timestamps: false
});

const workoutSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "User ID is required"],
        index: true 
    },
    userEmail: {
        type: String,
        required: [true, "User email is required"],
        lowercase: true,
        index: true 
    },
    
    day: {
        type: Date,
        required: [true, "Workout date is required"],
        default: Date.now,
        index: true 
    },
    exercises: {
        type: [exerciseSchema],
        default: []
    },
    
    title: {
        type: String,
        trim: true,
        maxlength: [100, "Workout title cannot exceed 100 characters"]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Workout description cannot exceed 500 characters"]
    },
    location: {
        type: String,
        enum: ["home", "gym", "outdoor", "studio", "other"],
        default: "gym"
    },
    workoutType: {
        type: String,
        enum: ["strength", "cardio", "mixed", "flexibility", "recovery", "sports"],
        default: "mixed"
    },
    difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate"
    },
    overallRating: {
        type: Number,
        min: 1,
        max: 5,
        validate: {
            validator: function(v) {
                return v === undefined || v === null || (v >= 1 && v <= 5);
            },
            message: "Overall rating must be between 1 and 5"
        }
    },
    mood: {
        type: String,
        enum: ["excellent", "good", "okay", "poor", "terrible"]
    },
    notes: {
        type: String,
        maxlength: [1000, "Workout notes cannot exceed 1000 characters"],
        trim: true
    },
    
    goals: [{
        type: String,
        maxlength: [200, "Goal cannot exceed 200 characters"]
    }],
    achievements: [{
        type: String,
        maxlength: [200, "Achievement cannot exceed 200 characters"]
    }],
    personalRecords: [{
        exercise: String,
        metric: String, 
        value: Number,
        unit: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

workoutSchema.index({ userId: 1, day: -1 }); 
workoutSchema.index({ userEmail: 1, day: -1 }); 
workoutSchema.index({ userId: 1, workoutType: 1 }); 
workoutSchema.index({ userId: 1, 'exercises.category': 1 }); 

workoutSchema.virtual('totalDuration').get(function() {
    return this.exercises.reduce((total, exercise) => total + (exercise.duration || 0), 0);
});

workoutSchema.virtual('exerciseCount').get(function() {
    return this.exercises.length;
});

workoutSchema.virtual('totalCalories').get(function() {
    return this.exercises.reduce((total, exercise) => total + (exercise.caloriesBurned || 0), 0);
});

workoutSchema.virtual('totalVolume').get(function() {
    return this.exercises.reduce((total, exercise) => {
        if (exercise.category === 'resistance' && exercise.weight && exercise.reps && exercise.sets) {
            return total + (exercise.weight * exercise.reps * exercise.sets);
        }
        return total;
    }, 0);
});

workoutSchema.virtual('totalDistance').get(function() {
    return this.exercises.reduce((total, exercise) => total + (exercise.distance || 0), 0);
});

workoutSchema.statics.findByUser = function(userId) {
    return this.find({ userId }).sort({ day: -1 });
};

workoutSchema.statics.findByUserEmail = function(userEmail) {
    return this.find({ userEmail: userEmail.toLowerCase() }).sort({ day: -1 });
};

workoutSchema.statics.findByUserAndDateRange = function(userId, startDate, endDate) {
    return this.find({
        userId,
        day: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ day: -1 });
};

workoutSchema.statics.getUserWorkoutStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalWorkouts: { $sum: 1 },
                totalDuration: { 
                    $sum: { 
                        $sum: '$exercises.duration' 
                    } 
                },
                totalExercises: { 
                    $sum: { 
                        $size: '$exercises' 
                    } 
                },
                averageDuration: { 
                    $avg: { 
                        $sum: '$exercises.duration' 
                    } 
                },
                totalCalories: {
                    $sum: {
                        $sum: '$exercises.caloriesBurned'
                    }
                },
                totalVolume: {
                    $sum: {
                        $sum: {
                            $map: {
                                input: '$exercises',
                                as: 'exercise',
                                in: {
                                    $multiply: [
                                        { $ifNull: ['$$exercise.weight', 0] },
                                        { $ifNull: ['$$exercise.reps', 0] },
                                        { $ifNull: ['$$exercise.sets', 0] }
                                    ]
                                }
                            }
                        }
                    }
                },
                totalDistance: {
                    $sum: {
                        $sum: '$exercises.distance'
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalWorkouts: 0,
        totalDuration: 0,
        totalExercises: 0,
        averageDuration: 0,
        totalCalories: 0,
        totalVolume: 0,
        totalDistance: 0
    };
};

workoutSchema.statics.getUserCategoryStats = async function(userId) {
    return await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$exercises' },
        {
            $group: {
                _id: '$exercises.category',
                count: { $sum: 1 },
                totalDuration: { $sum: '$exercises.duration' },
                averageDuration: { $avg: '$exercises.duration' },
                totalCalories: { $sum: '$exercises.caloriesBurned' },
                exercises: { $addToSet: '$exercises.name' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

workoutSchema.pre('save', async function(next) {
    if (!this.title) {
        const date = new Date(this.day).toLocaleDateString();
        const primaryCategory = this.exercises.length > 0 ? 
            this.exercises[0].category || 'workout' : 'workout';
        this.title = `${primaryCategory.charAt(0).toUpperCase() + primaryCategory.slice(1)} - ${date}`;
    }
    
    if (!this.workoutType || this.workoutType === 'mixed') {
        const categories = new Set(this.exercises.map(ex => ex.category));
        
        if (categories.size === 1) {
            const category = Array.from(categories)[0];
            switch (category) {
                case 'resistance':
                    this.workoutType = 'strength';
                    break;
                case 'cardio':
                    this.workoutType = 'cardio';
                    break;
                case 'flexibility':
                    this.workoutType = 'flexibility';
                    break;
                case 'recovery':
                    this.workoutType = 'recovery';
                    break;
                case 'sports_specific':
                    this.workoutType = 'sports';
                    break;
                default:
                    this.workoutType = 'mixed';
            }
        } else {
            this.workoutType = 'mixed';
        }
    }
    
    next();
});

const Workout = mongoose.model("Workout", workoutSchema);

module.exports = Workout;