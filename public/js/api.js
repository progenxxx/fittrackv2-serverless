const API = {
    // Use relative URLs for deployment flexibility
    baseURL: '',

    // Enhanced session management
    session: {
        getCurrentWorkoutId() {
            return localStorage.getItem("currentWorkoutId");
        },
        
        getCurrentExercises() {
            return JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
        },
        
        getSessionStartTime() {
            return localStorage.getItem("workoutStartTime");
        },
        
        isSessionActive() {
            return !!(this.getCurrentWorkoutId() && this.getCurrentExercises().length > 0);
        },
        
        startNewSession(workoutId) {
            localStorage.setItem("currentWorkoutId", workoutId);
            localStorage.setItem("workoutStartTime", Date.now().toString());
            localStorage.setItem("newWorkoutExercises", JSON.stringify([]));
        },
        
        addExerciseToSession(exercise) {
            const exercises = this.getCurrentExercises();
            exercises.push(exercise);
            localStorage.setItem("newWorkoutExercises", JSON.stringify(exercises));
            // Trigger storage event for other tabs
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'newWorkoutExercises',
                newValue: JSON.stringify(exercises)
            }));
        },
        
        clearSession() {
            localStorage.removeItem("currentWorkoutId");
            localStorage.removeItem("newWorkoutExercises");
            localStorage.removeItem("workoutStartTime");
            // Notify other tabs
            localStorage.setItem("workoutUpdated", Date.now().toString());
        }
    },

    async getAllWorkouts() {
        try {
            console.log('🔄 Fetching all workouts...');
            const res = await fetch(`${this.baseURL}/api/workouts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error');
                console.error('❌ API Error:', res.status, errorText);
                throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
            }
            
            const workouts = await res.json();
            console.log(`✅ Loaded ${workouts.length} workouts`);
            return workouts;
        } catch (error) {
            console.error("❌ Error fetching workouts:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - Server may be slow to respond');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error - Check your internet connection');
            } else if (error.message.includes('404')) {
                throw new Error('API endpoint not found - Check deployment');
            }
            
            throw error;
        }
    },

    async getLastWorkout() {
        try {
            const workouts = await this.getAllWorkouts();
            return workouts.length > 0 ? workouts[0] : null;
        } catch (error) {
            console.error("❌ Error fetching last workout:", error);
            throw error;
        }
    },

    async createWorkout(data = {}) {
        try {
            console.log('🔄 Creating new workout...');
            const workoutData = {
                day: data.day || new Date().toISOString(),
                exercises: data.exercises || [],
                ...data
            };

            const res = await fetch(`${this.baseURL}/api/workouts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(workoutData),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Create workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const newWorkout = await res.json();
            console.log('✅ Workout created:', newWorkout._id);
            return newWorkout;
        } catch (error) {
            console.error("❌ Error creating workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout creation timeout - Please try again');
            }
            
            throw error;
        }
    },

    async addExercise(exerciseData) {
        let workoutId = this.session.getCurrentWorkoutId();
        
        if (!workoutId) {
            throw new Error("No workout in progress. Please start a new workout first.");
        }

        try {
            console.log('🔄 Adding exercise to workout:', workoutId);
            console.log('Exercise data:', exerciseData);

            const res = await fetch(`${this.baseURL}/api/workouts/${workoutId}/exercises`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(exerciseData),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Add exercise error:', res.status, errorData);
                
                if (res.status === 404) {
                    // Workout not found, clear invalid session
                    this.session.clearSession();
                    throw new Error('Workout not found. Session has been reset. Please start a new workout.');
                }
                
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            console.log('✅ Exercise added successfully');
            
            // Update local session with the exercise
            this.session.addExerciseToSession(exerciseData);
            
            return updatedWorkout;
        } catch (error) {
            console.error("❌ Error adding exercise:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Exercise addition timeout - Please try again');
            }
            
            throw error;
        }
    },

    async updateWorkout(workoutId, data) {
        try {
            console.log('🔄 Updating workout:', workoutId);

            const res = await fetch(`${this.baseURL}/api/workouts/${workoutId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Update workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            console.log('✅ Workout updated successfully');
            return updatedWorkout;
        } catch (error) {
            console.error("❌ Error updating workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout update timeout - Please try again');
            }
            
            throw error;
        }
    },

    async deleteWorkout(id) {
        try {
            console.log('🔄 Deleting workout:', id);

            const res = await fetch(`${this.baseURL}/api/workouts/${id}`, { 
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Delete workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const result = await res.json();
            console.log('✅ Workout deleted successfully');
            return result;
        } catch (error) {
            console.error("❌ Error deleting workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout deletion timeout - Please try again');
            }
            
            throw error;
        }
    },

    async getWorkout(id) {
        try {
            console.log('🔄 Fetching workout:', id);

            const res = await fetch(`${this.baseURL}/api/workouts/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`Workout with ID ${id} not found`);
                }
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Get workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const workout = await res.json();
            console.log('✅ Workout fetched successfully');
            return workout;
        } catch (error) {
            console.error("❌ Error fetching workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout fetch timeout - Please try again');
            }
            
            throw error;
        }
    },

    async startNewWorkout() {
        try {
            console.log('🔄 Starting new workout...');

            const workoutData = {
                day: new Date().toISOString(),
                exercises: []
            };
            
            const newWorkout = await this.createWorkout(workoutData);
            
            // Initialize session
            this.session.startNewSession(newWorkout._id);
            
            console.log('✅ New workout started:', newWorkout._id);
            return newWorkout;
            
        } catch (error) {
            console.error('❌ Failed to start new workout:', error);
            throw error;
        }
    },

    async completeCurrentWorkout() {
        const workoutId = this.session.getCurrentWorkoutId();
        
        if (!workoutId) {
            console.log('⚠️ No workout to complete');
            return null;
        }

        try {
            console.log('🔄 Completing workout:', workoutId);
            
            const workout = await this.getWorkout(workoutId);
            
            // Clear session
            this.session.clearSession();
            
            console.log('✅ Workout completed successfully');
            return workout;
            
        } catch (error) {
            console.error("❌ Error completing workout:", error);
            // Clear session anyway to prevent stuck state
            this.session.clearSession();
            throw error;
        }
    },

    async checkHealth() {
        try {
            console.log('🔄 Checking API health...');
            const res = await fetch(`${this.baseURL}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(20000)
            });
            
            let data;
            try {
                data = await res.json();
            } catch (parseError) {
                data = { status: 'parse_error', message: 'Could not parse health response' };
            }
            
            if (!res.ok) {
                console.warn('⚠️ Health check returned non-OK status:', res.status, data);
                
                if (res.status === 503) {
                    return { 
                        status: 'degraded', 
                        message: 'Server running but database issues',
                        details: data,
                        httpStatus: res.status
                    };
                }
                
                throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
            }
            
            console.log('✅ API health check passed');
            return data;
        } catch (error) {
            console.error('❌ API Health Check failed:', error);
            
            if (error.name === 'AbortError') {
                return { status: 'timeout', message: 'Health check timeout' };
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return { status: 'unreachable', message: 'Server unreachable - Check deployment' };
            } else if (error.message.includes('404')) {
                return { status: 'endpoint_not_found', message: 'Health endpoint not found - Check server routes' };
            }
            
            return { status: 'error', message: error.message };
        }
    },

    async getWorkoutStats() {
        try {
            const workouts = await this.getAllWorkouts();
            
            if (!workouts || workouts.length === 0) {
                return {
                    totalWorkouts: 0,
                    totalExercises: 0,
                    totalDuration: 0,
                    averageDuration: 0,
                    totalWeight: 0
                };
            }

            const stats = {
                totalWorkouts: workouts.length,
                totalExercises: 0,
                totalDuration: 0,
                totalWeight: 0
            };

            workouts.forEach(workout => {
                if (workout.exercises && workout.exercises.length > 0) {
                    stats.totalExercises += workout.exercises.length;
                    
                    workout.exercises.forEach(exercise => {
                        stats.totalDuration += exercise.duration || 0;
                        if (exercise.type === 'resistance' || exercise.category === 'resistance') {
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

            return stats;
        } catch (error) {
            console.error('❌ Error calculating workout stats:', error);
            throw error;
        }
    },

    // Enhanced session synchronization
    async syncCurrentSession() {
        const workoutId = this.session.getCurrentWorkoutId();
        
        if (!workoutId) return null;
        
        try {
            const workout = await this.getWorkout(workoutId);
            
            if (workout && workout.exercises) {
                // Sync local storage with server data
                localStorage.setItem("newWorkoutExercises", JSON.stringify(workout.exercises));
                
                console.log(`🔄 Session synced: ${workout.exercises.length} exercises`);
                return workout;
            }
        } catch (error) {
            if (error.message.includes('not found')) {
                console.warn('⚠️ Current workout not found on server, clearing session');
                this.session.clearSession();
            } else {
                console.error('❌ Error syncing session:', error);
            }
        }
        
        return null;
    },

    // Aliases for compatibility
    async getWorkouts() {
        return this.getAllWorkouts();
    },

    async saveWorkout(workoutData) {
        return this.createWorkout(workoutData);
    }
};

// Initialize API when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 API initialized for domain:', window.location.origin);
    console.log('📍 Current URL:', window.location.href);
    
    // Test API connection
    try {
        const health = await API.checkHealth();
        
        if (health.status === 'healthy') {
            console.log('✅ API connection verified - All systems operational');
        } else if (health.status === 'degraded') {
            console.warn('⚠️ API partially working - Database issues detected:', health.message);
        } else {
            console.error('❌ API health check failed:', health.status, health.message);
        }
    } catch (error) {
        console.error('❌ Initial API health check failed:', error.message);
    }
    
    // Sync session on page load
    await API.syncCurrentSession();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('🔄 Page visible again, syncing session...');
        await API.syncCurrentSession();
    }
});

// Enhanced debug tools
if (typeof window !== 'undefined') {
    window.API_DEBUG = {
        async testSession() {
            console.log('🔍 Testing session management...');
            console.log('Current Workout ID:', API.session.getCurrentWorkoutId());
            console.log('Current Exercises:', API.session.getCurrentExercises());
            console.log('Session Start Time:', API.session.getSessionStartTime());
            console.log('Is Session Active:', API.session.isSessionActive());
            
            return {
                workoutId: API.session.getCurrentWorkoutId(),
                exercises: API.session.getCurrentExercises(),
                startTime: API.session.getSessionStartTime(),
                isActive: API.session.isSessionActive()
            };
        },
        
        async clearSession() {
            console.log('🔧 Clearing session...');
            API.session.clearSession();
            console.log('✅ Session cleared');
        },
        
        async syncSession() {
            console.log('🔄 Syncing session...');
            const result = await API.syncCurrentSession();
            console.log('Session sync result:', result);
            return result;
        }
    };
    
    console.log('🔧 Enhanced API Debug tools available:');
    console.log('   - window.API_DEBUG.testSession()');
    console.log('   - window.API_DEBUG.clearSession()');
    console.log('   - window.API_DEBUG.syncSession()');
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}