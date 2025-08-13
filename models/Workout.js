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

exerciseSchema.pre('save', function(next) {
    if (!this.category) {
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
        
        this.category = typeToCategory[this.type];
    }
    
    if (this.category === 'cardio') {
        if (!this.duration || this.duration <= 0) {
            return next(new Error('Cardio exercises must have a positive duration'));
        }
    } else if (this.category === 'resistance') {
        if (!this.duration || this.duration <= 0) {
            return next(new Error('Resistance exercises must have a positive duration'));
        }
        if (['resistance', 'free_weights', 'machines', 'powerlifting'].includes(this.type)) {
            if (!this.reps || this.reps <= 0) {
                return next(new Error('Traditional resistance exercises must have positive reps'));
            }
            if (!this.sets || this.sets <= 0) {
                return next(new Error('Traditional resistance exercises must have positive sets'));
            }
        }
    } else if (this.category === 'flexibility') {
        if (!this.duration || this.duration <= 0) {
            return next(new Error('Flexibility exercises must have a positive duration'));
        }
    }
    
    next();
});

exerciseSchema.virtual('totalVolume').get(function() {
    if (this.category === 'resistance' && this.weight && this.reps && this.sets) {
        return this.weight * this.reps * this.sets;
    }
    return 0;
});

exerciseSchema.virtual('caloriesPerMinute').get(function() {
    if (this.caloriesBurned && this.duration) {
        return Math.round((this.caloriesBurned / this.duration) * 100) / 100;
    }
    return 0;
});

exerciseSchema.virtual('pace').get(function() {
    if (this.category === 'cardio' && this.distance && this.duration) {
        const paceMinutesPerKm = this.duration / this.distance;
        const minutes = Math.floor(paceMinutesPerKm);
        const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
    }
    return null;
});

const workoutSchema = new mongoose.Schema({
    day: {
        type: Date,
        required: [true, "Workout date is required"],
        default: Date.now
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
    
    // Goals and achievements
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

workoutSchema.virtual('categoryBreakdown').get(function() {
    const breakdown = {};
    this.exercises.forEach(exercise => {
        const category = exercise.category || 'other';
        if (!breakdown[category]) {
            breakdown[category] = {
                count: 0,
                duration: 0,
                exercises: []
            };
        }
        breakdown[category].count++;
        breakdown[category].duration += exercise.duration || 0;
        breakdown[category].exercises.push(exercise.name);
    });
    return breakdown;
});

workoutSchema.virtual('intensityBreakdown').get(function() {
    const breakdown = {};
    this.exercises.forEach(exercise => {
        const intensity = exercise.intensity || 'moderate';
        if (!breakdown[intensity]) {
            breakdown[intensity] = {
                count: 0,
                duration: 0
            };
        }
        breakdown[intensity].count++;
        breakdown[intensity].duration += exercise.duration || 0;
    });
    return breakdown;
});

workoutSchema.virtual('averageIntensity').get(function() {
    if (this.exercises.length === 0) return 'moderate';
    
    const intensityScores = {
        'light': 1,
        'moderate': 2,
        'vigorous': 3,
        'maximum': 4
    };
    
    const totalScore = this.exercises.reduce((sum, exercise) => {
        return sum + (intensityScores[exercise.intensity] || 2);
    }, 0);
    
    const avgScore = totalScore / this.exercises.length;
    
    if (avgScore <= 1.5) return 'light';
    if (avgScore <= 2.5) return 'moderate';
    if (avgScore <= 3.5) return 'vigorous';
    return 'maximum';
});

workoutSchema.index({ day: -1 });
workoutSchema.index({ workoutType: 1 });
workoutSchema.index({ 'exercises.category': 1 });
workoutSchema.index({ 'exercises.type': 1 });
workoutSchema.index({ location: 1 });
workoutSchema.index({ difficulty: 1 });

workoutSchema.pre('save', function(next) {
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
    
    if (!this.title) {
        const date = new Date(this.day).toLocaleDateString();
        const primaryCategory = this.exercises.length > 0 ? 
            this.exercises[0].category || 'workout' : 'workout';
        this.title = `${primaryCategory.charAt(0).toUpperCase() + primaryCategory.slice(1)} - ${date}`;
    }
    
    next();
});

workoutSchema.methods.addExercise = function(exerciseData) {
    this.exercises.push(exerciseData);
    return this.save();
};

workoutSchema.methods.getExercisesByCategory = function(category) {
    return this.exercises.filter(exercise => exercise.category === category);
};

workoutSchema.methods.getExercisesByType = function(type) {
    return this.exercises.filter(exercise => exercise.type === type);
};

workoutSchema.methods.calculateWorkoutStats = function() {
    return {
        totalDuration: this.totalDuration,
        exerciseCount: this.exerciseCount,
        totalCalories: this.totalCalories,
        totalVolume: this.totalVolume,
        totalDistance: this.totalDistance,
        categoryBreakdown: this.categoryBreakdown,
        intensityBreakdown: this.intensityBreakdown,
        averageIntensity: this.averageIntensity
    };
};

workoutSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        day: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ day: -1 });
};

workoutSchema.statics.findByWorkoutType = function(workoutType) {
    return this.find({ workoutType }).sort({ day: -1 });
};

workoutSchema.statics.findByCategory = function(category) {
    return this.find({ 'exercises.category': category }).sort({ day: -1 });
};

workoutSchema.statics.findByExerciseType = function(exerciseType) {
    return this.find({ 'exercises.type': exerciseType }).sort({ day: -1 });
};

workoutSchema.statics.getWorkoutStatistics = async function() {
    const stats = await this.aggregate([
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
                                        { $ifNull: ['$exercise.weight', 0] },
                                        { $ifNull: ['$exercise.reps', 0] },
                                        { $ifNull: ['$exercise.sets', 0] }
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

workoutSchema.statics.getCategoryStatistics = async function() {
    return await this.aggregate([
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

workoutSchema.statics.getPopularExercises = async function(limit = 10) {
    return await this.aggregate([
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
                lastPerformed: { $max: '$day' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]);
};

const Workout = mongoose.model("Workout", workoutSchema);

module.exports = Workout;