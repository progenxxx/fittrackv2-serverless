const mongoose = require("mongoose");

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
    distance: {
        type: Number,
        min: 0,
        default: 0
    },
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
    _id: true, 
    timestamps: false 
});

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
    userId: {
        type: String,
        default: 'default_user'
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'cancelled'],
        default: 'completed'
    }
}, {
    timestamps: true, 
    collection: 'workouts' 
});

workoutSchema.index({ day: -1 }); 
workoutSchema.index({ userId: 1, day: -1 }); 
workoutSchema.index({ createdAt: -1 });

workoutSchema.virtual('totalDuration').get(function() {
    return this.exercises.reduce((total, exercise) => total + (exercise.duration || 0), 0);
});

workoutSchema.virtual('exerciseCount').get(function() {
    return this.exercises.length;
});

workoutSchema.virtual('totalWeight').get(function() {
    return this.exercises.reduce((total, exercise) => {
        if (exercise.type === 'resistance') {
            return total + ((exercise.weight || 0) * (exercise.reps || 0) * (exercise.sets || 1));
        }
        return total;
    }, 0);
});

workoutSchema.set('toJSON', { 
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v;
        return ret;
    }
});

workoutSchema.pre('save', function(next) {
    if (this.duration === 0 && this.exercises.length > 0) {
        this.duration = this.totalDuration;
    }
    next();
});

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

const Workout = mongoose.model("Workout", workoutSchema);

module.exports = Workout;