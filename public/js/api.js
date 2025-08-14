const API = {
    // Use relative URLs for deployment flexibility
    baseURL: '',

    // Get current user info from localStorage
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return null;
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            return null;
        }
    },

    // Get headers with user authentication
    getAuthHeaders() {
    const user = this.getCurrentUser();
    if (!user) {
        console.warn('No user found for authentication');
        return {
            'Content-Type': 'application/json'
        };
    }
    
    // FIXED: Only send email for user identification
    // Backend will look up MongoDB ObjectId by email
    return {
        'Content-Type': 'application/json',
        'X-User-Email': user.email
        // REMOVED: 'X-User-Id': user.id || user._id  <- This was causing the cast error
    };
},

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

    // Check if user is authenticated
    isAuthenticated() {
        const user = this.getCurrentUser();
        return !!(user && user.id && user.email);
    },

    // Handle authentication errors
    handleAuthError(response) {
        if (response.status === 401) {
            console.warn('Authentication required - redirecting to login');
            localStorage.clear();
            window.location.href = '/login.html';
            return true;
        }
        return false;
    },

    async getAllWorkouts() {
        try {
            console.log('🔄 Fetching user workouts...');
            
            if (!this.isAuthenticated()) {
                throw new Error('Please log in to view your workouts');
            }
            
            const res = await fetch(`${this.baseURL}/api/workouts`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                if (this.handleAuthError(res)) return [];
                
                const errorText = await res.text().catch(() => 'Unknown error');
                console.error('❌ API Error:', res.status, errorText);
                throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
            }
            
            const workouts = await res.json();
            console.log(`✅ Loaded ${workouts.length} user workouts`);
            return workouts;
        } catch (error) {
            console.error("❌ Error fetching user workouts:", error);
            
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
            console.log('🔄 Creating new user workout...');
            
            if (!this.isAuthenticated()) {
                throw new Error('Please log in to create workouts');
            }
            
            const user = this.getCurrentUser();
            const workoutData = {
                day: data.day || new Date().toISOString(),
                exercises: data.exercises || [],
                userId: user.id || user._id,
                userEmail: user.email,
                ...data
            };

            const res = await fetch(`${this.baseURL}/api/workouts`, {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify(workoutData),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Create workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const newWorkout = await res.json();
            console.log('✅ User workout created:', newWorkout._id);
            return newWorkout;
        } catch (error) {
            console.error("❌ Error creating user workout:", error);
            
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

        if (!this.isAuthenticated()) {
            throw new Error('Please log in to add exercises');
        }

        try {
            console.log('🔄 Adding exercise to user workout:', workoutId);
            console.log('Exercise data:', exerciseData);

            const res = await fetch(`${this.baseURL}/api/workouts/${workoutId}/exercises`, {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify(exerciseData),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
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
            console.log('✅ Exercise added successfully to user workout');
            
            // Update local session with the exercise
            this.session.addExerciseToSession(exerciseData);
            
            return updatedWorkout;
        } catch (error) {
            console.error("❌ Error adding exercise to user workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Exercise addition timeout - Please try again');
            }
            
            throw error;
        }
    },

    async updateWorkout(workoutId, data) {
        try {
            console.log('🔄 Updating user workout:', workoutId);

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to update workouts');
            }

            const res = await fetch(`${this.baseURL}/api/workouts/${workoutId}`, {
                method: "PUT",
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Update workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            console.log('✅ User workout updated successfully');
            return updatedWorkout;
        } catch (error) {
            console.error("❌ Error updating user workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout update timeout - Please try again');
            }
            
            throw error;
        }
    },

    async deleteWorkout(id) {
        try {
            console.log('🔄 Deleting user workout:', id);

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to delete workouts');
            }

            const res = await fetch(`${this.baseURL}/api/workouts/${id}`, { 
                method: "DELETE",
                headers: this.getAuthHeaders(),
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Delete workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const result = await res.json();
            console.log('✅ User workout deleted successfully');
            return result;
        } catch (error) {
            console.error("❌ Error deleting user workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout deletion timeout - Please try again');
            }
            
            throw error;
        }
    },

    async getWorkout(id) {
        try {
            console.log('🔄 Fetching user workout:', id);

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to view workouts');
            }

            const res = await fetch(`${this.baseURL}/api/workouts/${id}`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                signal: AbortSignal.timeout(30000)
            });
            
            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
                if (res.status === 404) {
                    throw new Error(`Workout with ID ${id} not found or not accessible`);
                }
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Get workout error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const workout = await res.json();
            console.log('✅ User workout fetched successfully');
            return workout;
        } catch (error) {
            console.error("❌ Error fetching user workout:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Workout fetch timeout - Please try again');
            }
            
            throw error;
        }
    },

    async startNewWorkout() {
        try {
            console.log('🔄 Starting new user workout...');

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to start workouts');
            }

            const user = this.getCurrentUser();
            const workoutData = {
                day: new Date().toISOString(),
                exercises: [],
                userId: user.id || user._id,
                userEmail: user.email
            };
            
            const newWorkout = await this.createWorkout(workoutData);
            
            if (!newWorkout) {
                throw new Error('Failed to create workout');
            }
            
            // Initialize session
            this.session.startNewSession(newWorkout._id);
            
            console.log('✅ New user workout started:', newWorkout._id);
            return newWorkout;
            
        } catch (error) {
            console.error('❌ Failed to start new user workout:', error);
            throw error;
        }
    },

    async completeCurrentWorkout() {
        const workoutId = this.session.getCurrentWorkoutId();
        
        if (!workoutId) {
            console.log('⚠️ No workout to complete');
            return null;
        }

        if (!this.isAuthenticated()) {
            throw new Error('Please log in to complete workouts');
        }

        try {
            console.log('🔄 Completing user workout:', workoutId);
            
            const workout = await this.getWorkout(workoutId);
            
            // Clear session
            this.session.clearSession();
            
            console.log('✅ User workout completed successfully');
            return workout;
            
        } catch (error) {
            console.error("❌ Error completing user workout:", error);
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
            console.log('🔄 Fetching user workout statistics...');

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to view statistics');
            }

            const res = await fetch(`${this.baseURL}/api/workouts/stats/summary`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (this.handleAuthError(res)) return null;
                
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Get stats error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const stats = await res.json();
            console.log('✅ User workout statistics fetched successfully');
            return stats;
        } catch (error) {
            console.error('❌ Error fetching user workout stats:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('Statistics fetch timeout - Please try again');
            }
            
            throw error;
        }
    },

    async getPopularExercises(limit = 10, category = null, type = null) {
        try {
            console.log('🔄 Fetching user popular exercises...');

            if (!this.isAuthenticated()) {
                throw new Error('Please log in to view exercise data');
            }

            let url = `${this.baseURL}/api/workouts/stats/popular-exercises?limit=${limit}`;
            if (category) url += `&category=${category}`;
            if (type) url += `&type=${type}`;

            const res = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders(),
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) {
                if (this.handleAuthError(res)) return [];
                
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Get popular exercises error:', res.status, errorData);
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const exercises = await res.json();
            console.log('✅ User popular exercises fetched successfully');
            return exercises;
        } catch (error) {
            console.error('❌ Error fetching user popular exercises:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('Popular exercises fetch timeout - Please try again');
            }
            
            throw error;
        }
    },

    // Enhanced session synchronization
    async syncCurrentSession() {
        const workoutId = this.session.getCurrentWorkoutId();
        
        if (!workoutId) return null;
        
        if (!this.isAuthenticated()) {
            console.warn('Cannot sync session - not authenticated');
            this.session.clearSession();
            return null;
        }
        
        try {
            const workout = await this.getWorkout(workoutId);
            
            if (workout && workout.exercises) {
                // Sync local storage with server data
                localStorage.setItem("newWorkoutExercises", JSON.stringify(workout.exercises));
                
                console.log(`🔄 User session synced: ${workout.exercises.length} exercises`);
                return workout;
            }
        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('not accessible')) {
                console.warn('⚠️ Current workout not found on server or not accessible, clearing session');
                this.session.clearSession();
            } else {
                console.error('❌ Error syncing user session:', error);
            }
        }
        
        return null;
    },

    // Backwards compatibility aliases
    async getWorkouts() {
        return this.getAllWorkouts();
    },

    async saveWorkout(workoutData) {
        return this.createWorkout(workoutData);
    }
};

// Initialize API when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 User-specific API initialized for domain:', window.location.origin);
    console.log('📍 Current URL:', window.location.href);
    
    // Check authentication
    if (!API.isAuthenticated()) {
        console.warn('⚠️ User not authenticated - some features will be limited');
        // Don't redirect here as this might be called on login page
    } else {
        const user = API.getCurrentUser();
        console.log('✅ User authenticated:', user.email);
    }
    
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
    
    // Sync session on page load if authenticated
    if (API.isAuthenticated()) {
        await API.syncCurrentSession();
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && API.isAuthenticated()) {
        console.log('🔄 Page visible again, syncing user session...');
        await API.syncCurrentSession();
    }
});

// Enhanced debug tools
if (typeof window !== 'undefined') {
    window.API_DEBUG = {
        async testSession() {
            console.log('🔍 Testing user session management...');
            console.log('User authenticated:', API.isAuthenticated());
            console.log('Current user:', API.getCurrentUser());
            console.log('Current Workout ID:', API.session.getCurrentWorkoutId());
            console.log('Current Exercises:', API.session.getCurrentExercises());
            console.log('Session Start Time:', API.session.getSessionStartTime());
            console.log('Is Session Active:', API.session.isSessionActive());
            
            return {
                authenticated: API.isAuthenticated(),
                user: API.getCurrentUser(),
                workoutId: API.session.getCurrentWorkoutId(),
                exercises: API.session.getCurrentExercises(),
                startTime: API.session.getSessionStartTime(),
                isActive: API.session.isSessionActive()
            };
        },
        
        async clearSession() {
            console.log('🔧 Clearing user session...');
            API.session.clearSession();
            console.log('✅ Session cleared');
        },
        
        async syncSession() {
            console.log('🔄 Syncing user session...');
            const result = await API.syncCurrentSession();
            console.log('Session sync result:', result);
            return result;
        },

        async testAuth() {
            console.log('🔍 Testing authentication...');
            console.log('Is authenticated:', API.isAuthenticated());
            console.log('Auth headers:', API.getAuthHeaders());
            
            try {
                const workouts = await API.getAllWorkouts();
                console.log('✅ Successfully fetched user workouts:', workouts.length);
                return { success: true, workoutsCount: workouts.length };
            } catch (error) {
                console.error('❌ Failed to fetch user workouts:', error.message);
                return { success: false, error: error.message };
            }
        }
    };
    
    console.log('🔧 Enhanced User-Specific API Debug tools available:');
    console.log('   - window.API_DEBUG.testSession()');
    console.log('   - window.API_DEBUG.clearSession()');
    console.log('   - window.API_DEBUG.syncSession()');
    console.log('   - window.API_DEBUG.testAuth()');
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}