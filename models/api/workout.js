// models/workout.js
const mongoose = require("mongoose");

// Exercise schema for individual exercises within a workout
const exerciseSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['resistance', 'cardio', 'flexibility', 'other'],
        default: 'resistance'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        min: 0,
        default: 0
    },
    // For resistance exercises
    sets: {
        type: Number,
        min: 0,
        default: 1
    },
    reps: {
        type: Number,
        min: 0,
        default: 0
    },
    weight: {
        type: Number,
        min: 0,
        default: 0
    },
    // For cardio exercises
    distance: {
        type: Number,
        min: 0,
        default: 0
    },
    // Additional notes
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    _id: true, // Give each exercise its own ID
    timestamps: false // We handle timestamp manually
});

// Main workout schema
const workoutSchema = new mongoose.Schema({
    day: {
        type: Date,
        required: true,
        default: Date.now
    },
    exercises: [exerciseSchema],
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    duration: {
        type: Number,
        min: 0,
        default: 0
    },
    // User info (for future multi-user support)
    userId: {
        type: String,
        default: 'default_user'
    },
    // Workout status
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'cancelled'],
        default: 'completed'
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'workouts' // Explicit collection name
});

// Add indexes for better query performance
workoutSchema.index({ day: -1 }); // Index for sorting by date (newest first)
workoutSchema.index({ userId: 1, day: -1 }); // Compound index for user-specific queries
workoutSchema.index({ createdAt: -1 }); // Index for sorting by creation time

// Virtual field to calculate total workout duration from exercises
workoutSchema.virtual('totalDuration').get(function() {
    return this.exercises.reduce((total, exercise) => total + (exercise.duration || 0), 0);
});

// Virtual field to count exercises
workoutSchema.virtual('exerciseCount').get(function() {
    return this.exercises.length;
});

// Virtual field to calculate total weight moved
workoutSchema.virtual('totalWeight').get(function() {
    return this.exercises.reduce((total, exercise) => {
        if (exercise.type === 'resistance') {
            return total + ((exercise.weight || 0) * (exercise.reps || 0) * (exercise.sets || 1));
        }
        return total;
    }, 0);
});

// Include virtuals when converting to JSON
workoutSchema.set('toJSON', { 
    virtuals: true,
    transform: function(doc, ret) {
        // Remove the __v field from the output
        delete ret.__v;
        return ret;
    }
});

// Pre-save middleware to update duration if not set
workoutSchema.pre('save', function(next) {
    if (this.duration === 0 && this.exercises.length > 0) {
        this.duration = this.totalDuration;
    }
    next();
});

// Static methods for common queries
workoutSchema.statics.findRecent = function(limit = 10) {
    return this.find({}).sort({ day: -1 }).limit(limit);
};

workoutSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        day: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ day: -1 });
};

workoutSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalWorkouts: { $sum: 1 },
                totalExercises: { $sum: { $size: '$exercises' } },
                avgDuration: { $avg: '$duration' },
                totalDuration: { $sum: '$duration' }
            }
        }
    ]);
};

// Instance methods
workoutSchema.methods.addExercise = function(exerciseData) {
    this.exercises.push({
        ...exerciseData,
        timestamp: new Date()
    });
    return this.save();
};

workoutSchema.methods.removeExercise = function(exerciseId) {
    this.exercises.id(exerciseId).remove();
    return this.save();
};

// Create and export the model
const Workout = mongoose.model("Workout", workoutSchema);

module.exports = Workout;