const API = {
    baseURL: '/api',

    async getAllWorkouts() {
        try {
            const res = await fetch(`${this.baseURL}/workouts`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const workouts = await res.json();
            return workouts;
        } catch (error) {
            console.error("Error fetching workouts:", error);
            throw error;
        }
    },

    async getLastWorkout() {
        try {
            const workouts = await this.getAllWorkouts();
            return workouts.length > 0 ? workouts[0] : null;
        } catch (error) {
            console.error("Error fetching last workout:", error);
            throw error;
        }
    },

    async createWorkout(data = {}) {
        try {
            const workoutData = {
                day: data.day || new Date().toISOString(),
                exercises: data.exercises || [],
                ...data
            };

            const res = await fetch(`${this.baseURL}/workouts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(workoutData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const newWorkout = await res.json();
            return newWorkout;
        } catch (error) {
            console.error("Error creating workout:", error);
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

            const res = await fetch(`${this.baseURL}/workouts/${workoutId}/exercises`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(exerciseData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            return updatedWorkout;
        } catch (error) {
            console.error("Error adding exercise:", error);
            throw error;
        }
    },

    async updateWorkout(workoutId, data) {
        try {

            const res = await fetch(`${this.baseURL}/workouts/${workoutId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            const updatedWorkout = await res.json();
            return updatedWorkout;
        } catch (error) {
            console.error("Error updating workout:", error);
            throw error;
        }
    },

    async deleteWorkout(id) {
        try {

            const res = await fetch(`${this.baseURL}/workouts/${id}`, { 
                method: "DELETE" 
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const result = await res.json();
            return result;
        } catch (error) {
            throw error;
        }
    },

    async getWorkout(id) {
        try {

            const res = await fetch(`${this.baseURL}/workouts/${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`Workout with ID ${id} not found`);
                }
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const workout = await res.json();
            return workout;
        } catch (error) {
            console.error("Error fetching workout:", error);
            throw error;
        }
    },

    async startNewWorkout() {
        try {

            const workoutData = {
                day: new Date().toISOString(),
                exercises: []
            };
            
            const newWorkout = await this.createWorkout(workoutData);
            
            localStorage.setItem("currentWorkoutId", newWorkout._id);
            localStorage.setItem("workoutStartTime", Date.now().toString());
            localStorage.setItem("newWorkoutExercises", JSON.stringify([]));
            
            return newWorkout;
            
        } catch (error) {
            console.error('Failed to start new workout:', error);
            throw error;
        }
    },

    async completeCurrentWorkout() {
        const workoutId = localStorage.getItem("currentWorkoutId");
        
        if (!workoutId) {
            return null;
        }

        try {
            
            const workout = await this.getWorkout(workoutId);
            
            localStorage.removeItem("currentWorkoutId");
            localStorage.removeItem("newWorkoutExercises");
            localStorage.removeItem("workoutStartTime");

            localStorage.setItem("workoutUpdated", Date.now().toString());
            
            return workout;
            
        } catch (error) {
            console.error("Error completing workout:", error);
            throw error;
        }
    },

    async checkHealth() {
        try {
            const res = await fetch(`${this.baseURL}/health`);
            const data = await res.json();
            return data;
        } catch (error) {
            console.error('API Health Check failed:', error);
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
            console.error('Error calculating workout stats:', error);
            throw error;
        }
    },

    async getWorkouts() {
        return this.getAllWorkouts();
    },

    async saveWorkout(workoutData) {
        return this.createWorkout(workoutData);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    
    try {
        await API.checkHealth();
    } catch (error) {
        console.warn('API health check failed - this is normal if /api/health endpoint does not exist');
    }
});

window.addEventListener('beforeunload', () => {
    const workoutId = localStorage.getItem("currentWorkoutId");
    if (workoutId) {
    }
});

window.addEventListener('storage', (e) => {
    if (e.key === 'workoutUpdated') {
        window.dispatchEvent(new CustomEvent('workoutDataUpdated'));
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

window.API_DEBUG = {
    async testConnection() {
        try {
            const health = await API.checkHealth();
            return health;
        } catch (error) {
            return { error: error.message };
        }
    },

    async testCreateWorkout() {
        try {
            const workout = await API.startNewWorkout();
            return workout;
        } catch (error) {
            return { error: error.message };
        }
    },

    async testAddExercise() {
        try {
            const workoutId = localStorage.getItem("currentWorkoutId");
            if (!workoutId) {
                throw new Error('No active workout. Run testCreateWorkout() first.');
            }

            const testExercise = {
                name: 'Test Push-ups',
                type: 'resistance',
                duration: 5,
                reps: 10,
                sets: 2,
                weight: 0
            };

            const result = await API.addExercise(testExercise);
            return result;
        } catch (error) {
            return { error: error.message };
        }
    },

    async testGetWorkouts() {
        try {
            const workouts = await API.getAllWorkouts();
            return workouts;
        } catch (error) {
            return { error: error.message };
        }
    },

    async runAllTests() {
        
        const results = {
            connection: await this.testConnection(),
            getWorkouts: await this.testGetWorkouts(),
            createWorkout: await this.testCreateWorkout(),
            addExercise: await this.testAddExercise()
        };

        return results;
    }
};
