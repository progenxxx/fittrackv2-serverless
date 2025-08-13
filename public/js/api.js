const API = {
    // FIXED: Use relative URLs for Vercel deployment
    baseURL: '',  // Empty string means use current domain

    async getAllWorkouts() {
        try {
            console.log('🔄 Fetching all workouts...');
            const res = await fetch(`${this.baseURL}/api/workouts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // FIXED: Add timeout for serverless functions
                signal: AbortSignal.timeout(30000) // 30 second timeout for Vercel
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
            
            // FIXED: Better error handling for different scenarios
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
        let workoutId = localStorage.getItem("currentWorkoutId");
        
        if (!workoutId) {
            const urlParams = new URLSearchParams(window.location.search);
            workoutId = urlParams.get('id');
        }

        if (!workoutId) {
            throw new Error("No workout in progress. Please start a new workout first.");
        }

        try {
            console.log('🔄 Adding exercise to workout:', workoutId);

            const res = await fetch(`${this.baseURL}/api/workouts/${workoutId}/exercises`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(exerciseData),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Add exercise error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            console.log('✅ Exercise added successfully');
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
            
            localStorage.setItem("currentWorkoutId", newWorkout._id);
            localStorage.setItem("workoutStartTime", Date.now().toString());
            localStorage.setItem("newWorkoutExercises", JSON.stringify([]));
            
            console.log('✅ New workout started:', newWorkout._id);
            return newWorkout;
            
        } catch (error) {
            console.error('❌ Failed to start new workout:', error);
            throw error;
        }
    },

    async completeCurrentWorkout() {
        const workoutId = localStorage.getItem("currentWorkoutId");
        
        if (!workoutId) {
            console.log('⚠️ No workout to complete');
            return null;
        }

        try {
            console.log('🔄 Completing workout:', workoutId);
            
            const workout = await this.getWorkout(workoutId);
            
            localStorage.removeItem("currentWorkoutId");
            localStorage.removeItem("newWorkoutExercises");
            localStorage.removeItem("workoutStartTime");

            localStorage.setItem("workoutUpdated", Date.now().toString());
            
            console.log('✅ Workout completed successfully');
            return workout;
            
        } catch (error) {
            console.error("❌ Error completing workout:", error);
            throw error;
        }
    },

    async checkHealth() {
        try {
            console.log('🔄 Checking API health...');
            const res = await fetch(`${this.baseURL}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(20000) // 20 second timeout for health check
            });
            
            // Even if not OK, try to parse the response for more info
            let data;
            try {
                data = await res.json();
            } catch (parseError) {
                data = { status: 'parse_error', message: 'Could not parse health response' };
            }
            
            if (!res.ok) {
                console.warn('⚠️ Health check returned non-OK status:', res.status, data);
                
                // For 503, server is running but has issues (likely database)
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

            return stats;
        } catch (error) {
            console.error('❌ Error calculating workout stats:', error);
            throw error;
        }
    },

    // Aliases for compatibility
    async getWorkouts() {
        return this.getAllWorkouts();
    },

    async saveWorkout(workoutData) {
        return this.createWorkout(workoutData);
    }
};

// FIXED: Initialize API when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 API initialized for domain:', window.location.origin);
    console.log('📍 Current URL:', window.location.href);
    
    // Test API connection on page load with better error handling
    try {
        const health = await API.checkHealth();
        
        if (health.status === 'healthy') {
            console.log('✅ API connection verified - All systems operational');
        } else if (health.status === 'degraded') {
            console.warn('⚠️ API partially working - Database issues detected:', health.message);
            console.warn('   This may cause workout data loading issues');
        } else {
            console.error('❌ API health check failed:', health.status, health.message);
            console.error('   Check Vercel deployment and server logs');
        }
    } catch (error) {
        console.error('❌ Initial API health check failed:', error.message);
        console.error('   This may indicate deployment or routing issues');
    }
});

// Handle page visibility changes to reconnect if needed
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('🔄 Page visible again, checking API connection...');
        try {
            const health = await API.checkHealth();
            if (health.status === 'healthy') {
                console.log('✅ API reconnection successful');
            } else {
                console.warn('⚠️ API reconnection issues:', health.status);
            }
        } catch (error) {
            console.warn('⚠️ API reconnection check failed:', error.message);
        }
    }
});

// Enhanced global error handler
window.addEventListener('error', (event) => {
    if (event.error && (event.error.message.includes('fetch') || event.error.message.includes('NetworkError'))) {
        console.error('🌐 Network error detected:', event.error.message);
        console.error('   Check internet connection and Vercel deployment status');
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch')) {
        console.error('🌐 Unhandled fetch error:', event.reason.message);
        console.error('   This usually indicates API endpoint or network issues');
    }
});

// Enhanced debug tools
if (typeof window !== 'undefined') {
    window.API_DEBUG = {
        async testConnection() {
            try {
                console.log('🔍 Testing API connection...');
                const health = await API.checkHealth();
                console.log('🔍 Health Check Result:', health);
                
                if (health.status === 'healthy') {
                    console.log('✅ Server and database are working correctly');
                } else if (health.status === 'degraded') {
                    console.warn('⚠️ Server is running but database has issues');
                    console.warn('   Details:', health.details);
                } else if (health.status === 'endpoint_not_found') {
                    console.error('❌ Health endpoint not found - Check server routes');
                } else {
                    console.error('❌ Server health check failed:', health.message);
                }
                
                return health;
            } catch (error) {
                console.error('🔍 API Connection Test Failed:', error);
                return { error: error.message };
            }
        },

        async testCreateWorkout() {
            try {
                console.log('🔍 Testing workout creation...');
                const workout = await API.startNewWorkout();
                console.log('🔍 Test Workout Created:', workout);
                return workout;
            } catch (error) {
                console.error('🔍 Test Workout Creation Failed:', error);
                return { error: error.message };
            }
        },

        async testGetWorkouts() {
            try {
                console.log('🔍 Testing get workouts...');
                const workouts = await API.getAllWorkouts();
                console.log('🔍 Test Get Workouts - Found:', workouts.length, 'workouts');
                return workouts;
            } catch (error) {
                console.error('🔍 Test Get Workouts Failed:', error);
                return { error: error.message };
            }
        },

        async testAllEndpoints() {
            console.log('🔍 Testing all API endpoints...');
            
            const results = {
                health: await this.testConnection(),
                getWorkouts: await this.testGetWorkouts()
            };

            // Only test workout creation if other tests pass
            if (results.health.status === 'healthy' || results.health.status === 'degraded') {
                results.createWorkout = await this.testCreateWorkout();
            }

            console.log('🔍 All API Test Results:', results);
            
            // Summary
            const healthyEndpoints = Object.keys(results).filter(key => 
                results[key] && !results[key].error
            ).length;
            
            console.log(`📊 Test Summary: ${healthyEndpoints}/${Object.keys(results).length} endpoints working`);
            
            return results;
        },

        // Quick diagnostics
        async diagnose() {
            console.log('🔧 Running API diagnostics...');
            console.log('📍 Current domain:', window.location.origin);
            console.log('📍 Full URL:', window.location.href);
            console.log('📍 API base URL:', API.baseURL || 'relative (current domain)');
            
            const results = await this.testAllEndpoints();
            
            // Provide recommendations
            if (results.health.error) {
                console.log('💡 Recommendations:');
                console.log('   1. Check if Vercel deployment is successful');
                console.log('   2. Verify API routes are properly configured');
                console.log('   3. Check server logs in Vercel dashboard');
            } else if (results.health.status === 'degraded') {
                console.log('💡 Recommendations:');
                console.log('   1. Check MongoDB connection in server logs');
                console.log('   2. Verify MONGODB_URI environment variable');
                console.log('   3. Ensure MongoDB Atlas cluster is running');
            }
            
            return results;
        }
    };
    
    console.log('🔧 Enhanced API Debug tools available:');
    console.log('   - window.API_DEBUG.testConnection()');
    console.log('   - window.API_DEBUG.testAllEndpoints()');
    console.log('   - window.API_DEBUG.diagnose()');
}

// Auto-retry mechanism for failed requests with exponential backoff
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await originalFetch(url, options);
            
            // If it's a 503, 500, or 502 error and we have retries left, wait and retry
            if ((response.status === 503 || response.status === 500 || response.status === 502) && i < maxRetries) {
                console.log(`🔄 Retrying request to ${url} (attempt ${i + 2}/${maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
                continue;
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (i < maxRetries && (
                error.name === 'AbortError' || 
                error.message.includes('fetch') || 
                error.message.includes('NetworkError')
            )) {
                console.log(`🔄 Retrying failed request to ${url} (attempt ${i + 2}/${maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
};

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}