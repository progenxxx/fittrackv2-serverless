const workoutTypeSelect = document.querySelector("#type");
const cardioForm = document.querySelector(".cardio-form");
const resistanceForm = document.querySelector(".resistance-form");
const cardioNameInput = document.querySelector("#cardio-name");
const nameInput = document.querySelector("#name");
const weightInput = document.querySelector("#weight");
const setsInput = document.querySelector("#sets");
const repsInput = document.querySelector("#reps");
const durationInput = document.querySelector("#duration");
const resistanceDurationInput = document.querySelector("#resistance-duration");
const distanceInput = document.querySelector("#distance");
const completeButton = document.querySelector("button.complete");
const addButton = document.querySelector("button.add-another");
const toast = document.querySelector("#toast");

let workoutType = null;
let shouldNavigateAway = false;
let currentWorkoutId = null;

const API = {
    baseUrl: '/api', 
    
    async request(url, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${url}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.details || data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed for ${url}:`, error);
            throw error;
        }
    },
    
    async createWorkout(workoutData) {
        return this.request('/workouts', {
            method: 'POST',
            body: JSON.stringify(workoutData)
        });
    },
    
    async getWorkout(id) {
        return this.request(`/workouts/${id}`);
    },
    
    async addExercise(exerciseData) {
        if (!currentWorkoutId) {
            throw new Error('No active workout session');
        }
        return this.request(`/workouts/${currentWorkoutId}/exercises`, {
            method: 'POST',
            body: JSON.stringify(exerciseData)
        });
    },
    
    async updateWorkout(id, workoutData) {
        return this.request(`/workouts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workoutData)
        });
    },
    
    async deleteWorkout(id) {
        return this.request(`/workouts/${id}`, {
            method: 'DELETE'
        });
    },
    
    async completeCurrentWorkout() {
        if (currentWorkoutId) {
            localStorage.removeItem("currentWorkoutId");
            localStorage.removeItem("newWorkoutExercises");
            
            localStorage.setItem('workoutCompleted', Date.now().toString());
            setTimeout(() => localStorage.removeItem('workoutCompleted'), 100);
            
            console.log('Current workout session completed and cleaned up');
        }
    }
};

function getWorkoutId() {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    if (id && isValidMongoId(id)) {
        localStorage.setItem("currentWorkoutId", id);
        return id;
    }
    
    id = localStorage.getItem("currentWorkoutId");
    if (id && isValidMongoId(id)) {
        const newUrl = `${window.location.pathname}?id=${id}`;
        window.history.replaceState({}, '', newUrl);
        return id;
    }
    
    return null;
}

function isValidMongoId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

async function initExercise() {
    try {
        currentWorkoutId = getWorkoutId();
        
        if (!currentWorkoutId) {
            console.log('No existing workout found, creating new workout in MongoDB...');
            
            showToast("Creating new workout session...", "info");
            
            const workout = await API.createWorkout({
                day: new Date().toISOString(),
                exercises: [],
                location: "gym",
                workoutType: "mixed",
                difficulty: "intermediate"
            });
            
            if (workout && workout._id) {
                currentWorkoutId = workout._id;
                localStorage.setItem("currentWorkoutId", currentWorkoutId);
                console.log('New workout created successfully:', currentWorkoutId);
                
                const newUrl = `${window.location.pathname}?id=${currentWorkoutId}`;
                window.history.replaceState({}, '', newUrl);
                
                localStorage.setItem("newWorkoutExercises", JSON.stringify([]));
                
                showToast("New workout session created!", "success");
            } else {
                throw new Error("Failed to create workout - no ID returned");
            }
        } else {
            console.log('Using existing workout:', currentWorkoutId);
            
            try {
                const workout = await API.getWorkout(currentWorkoutId);
                if (workout && workout.exercises) {
                    localStorage.setItem("newWorkoutExercises", JSON.stringify(workout.exercises));
                    updateNewWorkoutContainer(workout.exercises);
                    console.log(`Loaded ${workout.exercises.length} existing exercises`);
                    
                    if (workout.exercises.length > 0) {
                        showToast(`Resuming workout with ${workout.exercises.length} exercises`, "info");
                    }
                }
            } catch (error) {
                console.warn('Could not load existing workout, may have been deleted:', error.message);
                localStorage.removeItem("currentWorkoutId");
                localStorage.removeItem("newWorkoutExercises");
                currentWorkoutId = null;
                
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
                
                showToast("Previous workout not found, creating new one...", "warning");
                return initExercise(); 
            }
        }
        
        updateWorkoutStatsDisplay();
        
    } catch (error) {
        console.error("Error initializing workout:", error);
        showToast(`Error creating workout: ${error.message}`, "error");
        
        currentWorkoutId = null;
        localStorage.removeItem("currentWorkoutId");
        localStorage.removeItem("newWorkoutExercises");
    }
}

function updateWorkoutStatsDisplay() {
    try {
        const exercises = JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
        const exerciseCount = exercises.length;
        const totalDuration = exercises.reduce((sum, ex) => sum + (parseInt(ex.duration) || 0), 0);
        
        const countElement = document.getElementById('exerciseCount');
        const durationElement = document.getElementById('totalDuration');
        const workoutIdElement = document.getElementById('workoutId');
        
        if (countElement) countElement.textContent = exerciseCount;
        if (durationElement) durationElement.textContent = `${totalDuration} min`;
        if (workoutIdElement && currentWorkoutId) {
            workoutIdElement.textContent = currentWorkoutId.slice(-6); 
        }
        
        if (completeButton) {
            completeButton.disabled = exerciseCount === 0;
            completeButton.textContent = exerciseCount === 0 ? "Add exercises first" : "Complete Workout";
        }
        
        console.log(`Workout stats updated: ${exerciseCount} exercises, ${totalDuration} min total`);
        
    } catch (error) {
        console.error("Error updating workout stats:", error);
    }
}

function handleWorkoutTypeChange(event) {
    workoutType = event.target.value;
    console.log('Workout type changed to:', workoutType);
    
    if (cardioForm && resistanceForm) {
        if (workoutType === "cardio") {
            cardioForm.classList.remove("d-none");
            resistanceForm.classList.add("d-none");
            if (cardioNameInput) cardioNameInput.focus();
        } else if (workoutType === "resistance") {
            resistanceForm.classList.remove("d-none");
            cardioForm.classList.add("d-none");
            if (nameInput) nameInput.focus();
        } else {
            cardioForm.classList.add("d-none");
            resistanceForm.classList.add("d-none");
        }
    }
    
    validateInputs();
}

function validateInputs() {
    let isValid = false;
    let validationMessage = "";
    
    if (workoutType === "resistance") {
        if (nameInput && weightInput && setsInput && repsInput && resistanceDurationInput) {
            const name = nameInput.value.trim();
            const weight = parseFloat(weightInput.value);
            const sets = parseInt(setsInput.value);
            const reps = parseInt(repsInput.value);
            const duration = parseInt(resistanceDurationInput.value);
            
            if (!name) validationMessage = "Exercise name is required";
            else if (isNaN(weight) || weight < 0) validationMessage = "Valid weight is required";
            else if (isNaN(sets) || sets <= 0) validationMessage = "Sets must be greater than 0";
            else if (isNaN(reps) || reps <= 0) validationMessage = "Reps must be greater than 0";
            else if (isNaN(duration) || duration <= 0) validationMessage = "Duration must be greater than 0";
            else {
                isValid = true;
                validationMessage = "Ready to add resistance exercise";
            }
        }
    } else if (workoutType === "cardio") {
        if (cardioNameInput && durationInput && distanceInput) {
            const name = cardioNameInput.value.trim();
            const duration = parseInt(durationInput.value);
            const distance = parseFloat(distanceInput.value);
            
            if (!name) validationMessage = "Exercise name is required";
            else if (isNaN(duration) || duration <= 0) validationMessage = "Duration must be greater than 0";
            else if (isNaN(distance) || distance < 0) validationMessage = "Valid distance is required";
            else {
                isValid = true;
                validationMessage = "Ready to add cardio exercise";
            }
        }
    } else {
        validationMessage = "Please select an exercise type";
    }

    if (addButton) {
        addButton.disabled = !isValid;
        if (isValid) {
            addButton.removeAttribute("disabled");
            addButton.title = validationMessage;
        } else {
            addButton.setAttribute("disabled", true);
            addButton.title = validationMessage;
        }
    }
    
    const exercises = JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
    if (completeButton) {
        completeButton.disabled = exercises.length === 0;
    }
    
    const validationDisplay = document.getElementById('validationMessage');
    if (validationDisplay) {
        validationDisplay.textContent = validationMessage;
        validationDisplay.className = isValid ? 'text-success' : 'text-warning';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!currentWorkoutId) {
        showToast("No workout session active. Please refresh the page.", "error");
        return;
    }

    let workoutData = {};
    
    if (workoutType === "cardio") {
        if (!cardioNameInput || !durationInput || !distanceInput) {
            showToast("Cardio form elements not found", "error");
            return;
        }
        
        const name = cardioNameInput.value.trim();
        const duration = parseInt(durationInput.value);
        const distance = parseFloat(distanceInput.value);
        
        if (!name || isNaN(duration) || duration <= 0 || isNaN(distance) || distance < 0) {
            showToast("Please fill in all cardio fields correctly", "error");
            return;
        }
        
        workoutData = {
            type: determineCardioType(name),
            category: "cardio",
            name: name,
            duration: duration,
            distance: distance,
            intensity: determineCardioIntensity(name, duration),
            equipment: getCardioEquipment(name)
        };
        
    } else if (workoutType === "resistance") {
        if (!nameInput || !weightInput || !setsInput || !repsInput || !resistanceDurationInput) {
            showToast("Resistance form elements not found", "error");
            return;
        }
        
        const name = nameInput.value.trim();
        const weight = parseFloat(weightInput.value);
        const sets = parseInt(setsInput.value);
        const reps = parseInt(repsInput.value);
        const duration = parseInt(resistanceDurationInput.value);
        
        if (!name || isNaN(weight) || weight < 0 || isNaN(sets) || sets <= 0 || 
            isNaN(reps) || reps <= 0 || isNaN(duration) || duration <= 0) {
            showToast("Please fill in all resistance fields correctly", "error");
            return;
        }
        
        workoutData = {
            type: determineResistanceType(name, weight),
            category: "resistance",
            name: name,
            weight: weight,
            sets: sets,
            reps: reps,
            duration: duration,
            intensity: determineResistanceIntensity(reps, weight),
            equipment: getResistanceEquipment(name, weight),
            muscleGroups: getMuscleGroups(name)
        };
        
    } else if (workoutType === "flexibility") {
        const name = document.querySelector('#flexibility-name')?.value.trim() || 
                    cardioNameInput?.value.trim() || 
                    nameInput?.value.trim();
        const duration = parseInt(document.querySelector('#flexibility-duration')?.value || 
                                durationInput?.value || 
                                resistanceDurationInput?.value);
        
        if (!name || isNaN(duration) || duration <= 0) {
            showToast("Please provide exercise name and duration for flexibility exercise", "error");
            return;
        }
        
        workoutData = {
            type: determineFlexibilityType(name),
            category: "flexibility",
            name: name,
            duration: duration,
            intensity: "light",
            equipment: "none",
            stretchHoldTime: Math.floor(duration * 60 / 8) 
        };
        
    } else if (workoutType === "recovery") {
        const name = document.querySelector('#recovery-name')?.value.trim() || 
                    cardioNameInput?.value.trim() || 
                    nameInput?.value.trim() ||
                    "Easy Walk"; 
        const duration = parseInt(document.querySelector('#recovery-duration')?.value || 
                                durationInput?.value || 
                                resistanceDurationInput?.value ||
                                1); 
        
        if (!name || isNaN(duration) || duration <= 0) {
            showToast("Please provide exercise name and duration for recovery exercise", "error");
            return;
        }
        
        workoutData = {
            type: determineRecoveryType(name),
            category: "recovery",
            name: name,
            duration: duration,
            intensity: "light",
            equipment: getRecoveryEquipment(name)
        };
        
    } else if (workoutType === "balance") {
        const name = document.querySelector('#balance-name')?.value.trim() || 
                    cardioNameInput?.value.trim() || 
                    nameInput?.value.trim();
        const duration = parseInt(document.querySelector('#balance-duration')?.value || 
                                durationInput?.value || 
                                resistanceDurationInput?.value);
        
        if (!name || isNaN(duration) || duration <= 0) {
            showToast("Please provide exercise name and duration for balance exercise", "error");
            return;
        }
        
        workoutData = {
            type: determineBalanceType(name),
            category: "balance",
            name: name,
            duration: duration,
            intensity: "moderate",
            equipment: getBalanceEquipment(name)
        };
        
    } else if (workoutType === "sports_specific") {
        const name = document.querySelector('#sports-name')?.value.trim() || 
                    cardioNameInput?.value.trim() || 
                    nameInput?.value.trim();
        const duration = parseInt(document.querySelector('#sports-duration')?.value || 
                                durationInput?.value || 
                                resistanceDurationInput?.value);
        
        if (!name || isNaN(duration) || duration <= 0) {
            showToast("Please provide exercise name and duration for sports exercise", "error");
            return;
        }
        
        workoutData = {
            type: determineSportsType(name),
            category: "sports_specific",
            name: name,
            duration: duration,
            intensity: determineSportsIntensity(name),
            equipment: getSportsEquipment(name)
        };
        
    } else {
        showToast("Please select an exercise type", "error");
        return;
    }

    if (addButton) {
        addButton.disabled = true;
        addButton.textContent = "Adding...";
    }

    try {
        console.log('Adding exercise to MongoDB:', workoutData);
        
        const updatedWorkout = await API.addExercise(workoutData);
        console.log('Exercise added successfully to MongoDB');

        if (updatedWorkout && updatedWorkout.exercises) {
            localStorage.setItem("newWorkoutExercises", JSON.stringify(updatedWorkout.exercises));
            updateNewWorkoutContainer(updatedWorkout.exercises);
            console.log(`Updated with ${updatedWorkout.exercises.length} exercises from server`);
        } else {
            console.warn('API did not return full workout data, updating manually');
            const exercises = JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
            exercises.push(workoutData);
            localStorage.setItem("newWorkoutExercises", JSON.stringify(exercises));
            updateNewWorkoutContainer(exercises);
        }

        updateWorkoutStatsDisplay();
        clearInputs();
        
        showToast(`${workoutData.name} (${workoutData.category}) added successfully!`, "success");
        
    } catch (error) {
        console.error("Error adding exercise:", error);
        showToast(`Error adding exercise: ${error.message}`, "error");
    } finally {
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = "Add Another";
        }
        
        setTimeout(() => validateInputs(), 100);
    }
}

function determineCardioType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('hiit') || nameLower.includes('sprint') || nameLower.includes('interval')) {
        return "hiit";
    } else if (nameLower.includes('walk') || nameLower.includes('easy') || nameLower.includes('recovery')) {
        return "low_intensity_cardio";
    } else if (nameLower.includes('fast') || nameLower.includes('intense') || nameLower.includes('vigorous')) {
        return "high_intensity_cardio";
    } else {
        return "moderate_intensity_cardio";
    }
}

function determineResistanceType(name, weight) {
    const nameLower = name.toLowerCase();
    
    if (weight === 0 || nameLower.includes('bodyweight') || nameLower.includes('push') || nameLower.includes('pull')) {
        return "bodyweight";
    } else if (nameLower.includes('machine') || nameLower.includes('cable')) {
        return "machines";
    } else if (nameLower.includes('band') || nameLower.includes('elastic')) {
        return "resistance_bands";
    } else if (nameLower.includes('deadlift') || nameLower.includes('squat') || nameLower.includes('bench')) {
        return "powerlifting";
    } else if (nameLower.includes('clean') || nameLower.includes('snatch') || nameLower.includes('jerk')) {
        return "olympic_lifting";
    } else {
        return "free_weights";
    }
}

function determineFlexibilityType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('yoga')) {
        return "yoga";
    } else if (nameLower.includes('pilates')) {
        return "pilates";
    } else if (nameLower.includes('dynamic') || nameLower.includes('warm')) {
        return "dynamic_stretching";
    } else {
        return "static_stretching";
    }
}

function determineRecoveryType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('meditat') || nameLower.includes('mindful')) {
        return "meditation";
    } else if (nameLower.includes('mobility') || nameLower.includes('foam') || nameLower.includes('roll')) {
        return "mobility_work";
    } else {
        return "active_recovery";
    }
}

function determineBalanceType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('tai chi') || nameLower.includes('taichi')) {
        return "tai_chi";
    } else if (nameLower.includes('functional') || nameLower.includes('movement')) {
        return "functional_movement";
    } else {
        return "balance_training";
    }
}

function determineSportsType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('plyometric') || nameLower.includes('jump') || nameLower.includes('explosive')) {
        return "plyometrics";
    } else if (nameLower.includes('agility') || nameLower.includes('ladder') || nameLower.includes('cone')) {
        return "agility";
    } else if (nameLower.includes('crossfit') || nameLower.includes('wod')) {
        return "crossfit";
    } else {
        return "endurance";
    }
}

function determineCardioIntensity(name, duration) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('easy') || nameLower.includes('walk') || duration > 60) {
        return "light";
    } else if (nameLower.includes('vigorous') || nameLower.includes('sprint') || duration < 20) {
        return "vigorous";
    } else {
        return "moderate";
    }
}

function determineResistanceIntensity(reps, weight) {
    if (reps <= 5 && weight > 50) {
        return "maximum";
    } else if (reps <= 8 || weight > 30) {
        return "vigorous";
    } else if (reps <= 15) {
        return "moderate";
    } else {
        return "light";
    }
}

function determineSportsIntensity(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('sprint') || nameLower.includes('explosive') || nameLower.includes('max')) {
        return "maximum";
    } else if (nameLower.includes('intense') || nameLower.includes('vigorous')) {
        return "vigorous";
    } else {
        return "moderate";
    }
}

function getCardioEquipment(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('treadmill') || nameLower.includes('bike') || nameLower.includes('elliptical') || 
        nameLower.includes('rowing') || nameLower.includes('stair')) {
        return "cardio_equipment";
    } else {
        return "none";
    }
}

function getResistanceEquipment(name, weight) {
    const nameLower = name.toLowerCase();
    
    if (weight === 0 || nameLower.includes('bodyweight')) {
        return "none";
    } else if (nameLower.includes('dumbbell')) {
        return "dumbbells";
    } else if (nameLower.includes('barbell')) {
        return "barbell";
    } else if (nameLower.includes('kettlebell')) {
        return "kettlebell";
    } else if (nameLower.includes('machine') || nameLower.includes('cable')) {
        return "machines";
    } else if (nameLower.includes('band')) {
        return "resistance_bands";
    } else {
        return weight > 20 ? "barbell" : "dumbbells";
    }
}

function getRecoveryEquipment(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('foam') || nameLower.includes('roll')) {
        return "medicine_ball"; 
    } else {
        return "none";
    }
}

function getBalanceEquipment(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('ball') || nameLower.includes('stability')) {
        return "stability_ball";
    } else {
        return "none";
    }
}

function getSportsEquipment(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('medicine') || nameLower.includes('ball')) {
        return "medicine_ball";
    } else if (nameLower.includes('suspension') || nameLower.includes('trx')) {
        return "suspension";
    } else {
        return "none";
    }
}

function getMuscleGroups(name) {
    const nameLower = name.toLowerCase();
    const muscleGroups = [];
    
    if (nameLower.includes('chest') || nameLower.includes('bench') || nameLower.includes('press')) {
        muscleGroups.push('chest');
    }
    if (nameLower.includes('back') || nameLower.includes('row') || nameLower.includes('pull')) {
        muscleGroups.push('back');
    }
    if (nameLower.includes('shoulder') || nameLower.includes('overhead')) {
        muscleGroups.push('shoulders');
    }
    if (nameLower.includes('bicep') || nameLower.includes('curl')) {
        muscleGroups.push('biceps');
    }
    if (nameLower.includes('tricep') || nameLower.includes('extension')) {
        muscleGroups.push('triceps');
    }
    if (nameLower.includes('squat') || nameLower.includes('quad')) {
        muscleGroups.push('quadriceps');
    }
    if (nameLower.includes('deadlift') || nameLower.includes('hamstring')) {
        muscleGroups.push('hamstrings');
    }
    if (nameLower.includes('glute') || nameLower.includes('hip')) {
        muscleGroups.push('glutes');
    }
    if (nameLower.includes('calf') || nameLower.includes('raise')) {
        muscleGroups.push('calves');
    }
    if (nameLower.includes('core') || nameLower.includes('ab') || nameLower.includes('plank')) {
        muscleGroups.push('core');
    }
    
    if (muscleGroups.length === 0) {
        muscleGroups.push('full_body');
    }
    
    return muscleGroups;
}

function getMuscleGroups(exerciseName) {
    const nameLower = exerciseName.toLowerCase();
    const muscleGroups = [];
    
    if (nameLower.includes('chest') || nameLower.includes('bench') || nameLower.includes('press')) {
        muscleGroups.push('chest');
    }
    if (nameLower.includes('back') || nameLower.includes('row') || nameLower.includes('pull')) {
        muscleGroups.push('back');
    }
    if (nameLower.includes('shoulder') || nameLower.includes('overhead')) {
        muscleGroups.push('shoulders');
    }
    if (nameLower.includes('bicep') || nameLower.includes('curl')) {
        muscleGroups.push('biceps');
    }
    if (nameLower.includes('tricep') || nameLower.includes('extension')) {
        muscleGroups.push('triceps');
    }
    if (nameLower.includes('squat') || nameLower.includes('quad')) {
        muscleGroups.push('quadriceps');
    }
    if (nameLower.includes('deadlift') || nameLower.includes('hamstring')) {
        muscleGroups.push('hamstrings');
    }
    if (nameLower.includes('glute') || nameLower.includes('hip')) {
        muscleGroups.push('glutes');
    }
    if (nameLower.includes('calf') || nameLower.includes('raise')) {
        muscleGroups.push('calves');
    }
    if (nameLower.includes('core') || nameLower.includes('ab') || nameLower.includes('plank')) {
        muscleGroups.push('core');
    }
    
    if (muscleGroups.length === 0 || nameLower.includes('burpee') || nameLower.includes('thruster')) {
        muscleGroups.push('full_body');
    }
    
    return muscleGroups;
}

function updateNewWorkoutContainer(exercises) {
    const newContainerContent = document.querySelector(".new-workout-exercises");
    
    if (!newContainerContent) {
        console.log("New workout exercises container not found");
        return;
    }

    newContainerContent.innerHTML = "";
    
    if (!exercises || exercises.length === 0) {
        newContainerContent.innerHTML = `
            <div class="exercise-detail text-center text-muted">
                <i>No exercises added yet.</i><br>
                <small>Select an exercise type above to get started!</small>
            </div>
        `;
        return;
    }

    const headerDiv = document.createElement("div");
    headerDiv.className = "exercise-header mb-3";
    headerDiv.innerHTML = `
        <h6 class="text-primary mb-2">Current Workout (${exercises.length} exercises)</h6>
        <hr class="my-2">
    `;
    newContainerContent.appendChild(headerDiv);

    exercises.forEach((ex, index) => {
        const div = document.createElement("div");
        div.classList.add("exercise-detail", "mb-2");
        div.style.cssText = `
            padding: 12px; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid ${ex.type === 'cardio' ? '#28a745' : '#007bff'};
            position: relative;
        `;
        
        let exerciseHtml = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${ex.name}</strong> 
                    <span class="badge badge-${ex.type === 'cardio' ? 'success' : 'primary'} ml-1">
                        ${ex.type.charAt(0).toUpperCase() + ex.type.slice(1)}
                    </span>
                    <br>
        `;
        
        if (ex.type === "resistance") {
            exerciseHtml += `
                    <small class="text-muted">
                        ${ex.weight || 0}kg × ${ex.sets || 0} sets × ${ex.reps || 0} reps | ${ex.duration || 0} min
                    </small>
            `;
        } else if (ex.type === "cardio") {
            exerciseHtml += `
                    <small class="text-muted">
                        ${ex.distance || 0}km | ${ex.duration || 0} min
                    </small>
            `;
        }
        
        exerciseHtml += `
                </div>
                <small class="text-muted">#${index + 1}</small>
            </div>
        `;
        
        div.innerHTML = exerciseHtml;
        newContainerContent.appendChild(div);
    });
    
    const totalDuration = exercises.reduce((sum, ex) => sum + (parseInt(ex.duration) || 0), 0);
    const footerDiv = document.createElement("div");
    footerDiv.className = "exercise-footer mt-3 pt-2 border-top";
    footerDiv.innerHTML = `
        <div class="row text-center">
            <div class="col-6">
                <strong class="text-primary">${exercises.length}</strong><br>
                <small class="text-muted">Exercises</small>
            </div>
            <div class="col-6">
                <strong class="text-success">${totalDuration}</strong><br>
                <small class="text-muted">Total Minutes</small>
            </div>
        </div>
    `;
    newContainerContent.appendChild(footerDiv);
    
    console.log(`Updated exercise display with ${exercises.length} exercises`);
}

function handleToastAnimationEnd() {
    if (toast) {
        toast.removeAttribute("class");
    }
    
    if (shouldNavigateAway) {
        window.location.href = "/index.html";
    }
}

function showToast(message, type = "success") {
    if (!toast) {
        console.log(`Toast message (${type}): ${message}`);
        return;
    }
    
    const text = toast.querySelector("span") || toast;
    text.textContent = message;
    
    toast.className = "toast";
    
    switch (type) {
        case "error":
            toast.classList.add("error", "bg-danger", "text-white");
            break;
        case "warning":
            toast.classList.add("warning", "bg-warning", "text-dark");
            break;
        case "info":
            toast.classList.add("info", "bg-info", "text-white");
            break;
        case "success":
        default:
            toast.classList.add("success", "bg-success", "text-white");
            break;
    }
    
    toast.style.display = "block";
    
    const duration = type === "error" ? 5000 : type === "warning" ? 4000 : 3000;
    setTimeout(() => {
        toast.style.display = "none";
        toast.className = "toast";
    }, duration);
    
    console.log(`Toast shown (${type}): ${message}`);
}

function clearInputs() {
    const inputs = [
        cardioNameInput, nameInput, setsInput, distanceInput, 
        durationInput, repsInput, resistanceDurationInput, weightInput
    ];
    
    inputs.forEach(input => {
        if (input) {
            input.value = "";
            input.classList.remove('is-invalid', 'is-valid');
        }
    });
    
    if (workoutTypeSelect) {
        workoutTypeSelect.value = "";
    }
    
    workoutType = null;
    
    if (cardioForm) cardioForm.classList.add("d-none");
    if (resistanceForm) resistanceForm.classList.add("d-none");
    
    const validationDisplay = document.getElementById('validationMessage');
    if (validationDisplay) {
        validationDisplay.textContent = "Select an exercise type to begin";
        validationDisplay.className = 'text-muted';
    }
    
    console.log("Form inputs cleared and reset");
}

async function handleCompleteWorkout(event) {
    event.preventDefault();
    
    if (!currentWorkoutId) {
        showToast("No workout session active.", "error");
        return;
    }

    if (completeButton) {
        completeButton.disabled = true;
        completeButton.innerHTML = '<span class="spinner-border spinner-border-sm mr-2"></span>Completing...';
    }

    try {
        const workout = await API.getWorkout(currentWorkoutId);
        if (!workout || !workout.exercises || workout.exercises.length === 0) {
            showToast("Please add at least one exercise before completing the workout.", "warning");
            return;
        }

        console.log('Completing workout:', currentWorkoutId, 'with', workout.exercises.length, 'exercises');
        
        await API.completeCurrentWorkout();
        
        shouldNavigateAway = true;
        
        const newContainerContent = document.querySelector(".new-workout-exercises");
        if (newContainerContent) {
            newContainerContent.innerHTML = `
                <div class="text-center p-4">
                    <div class="mb-3">
                        <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-success">Workout Completed!</h5>
                    <p class="text-muted mb-3">
                        Great job! You completed ${workout.exercises.length} exercises 
                        in ${workout.totalDuration || 0} minutes.
                    </p>
                    <div class="spinner-border spinner-border-sm text-primary mr-2"></div>
                    <span class="text-muted">Redirecting to dashboard...</span>
                </div>
            `;
        }
        
        showToast(`Workout completed! ${workout.exercises.length} exercises, ${workout.totalDuration || 0} minutes total.`, "success");
        
        setTimeout(() => {
            window.location.href = "/index.html";
        }, 2500);
        
        console.log('Workout completed successfully, navigating in 2.5 seconds');
        
    } catch (error) {
        console.error("Error completing workout:", error);
        showToast(`Error completing workout: ${error.message}`, "error");
        shouldNavigateAway = false;
    } finally {
        setTimeout(() => {
            if (completeButton && !shouldNavigateAway) {
                completeButton.disabled = false;
                completeButton.innerHTML = "Complete Workout";
            }
        }, 1000);
    }
}

function setupEventListeners() {
    try {
        if (workoutTypeSelect) {
            workoutTypeSelect.addEventListener("change", handleWorkoutTypeChange);
            console.log("Workout type selector event listener added");
        }

        if (completeButton) {
            completeButton.addEventListener("click", handleCompleteWorkout);
            console.log("Complete button event listener added");
        }

        if (addButton) {
            addButton.addEventListener("click", handleFormSubmit);
            console.log("Add button event listener added");
        }

        if (toast) {
            toast.addEventListener("animationend", handleToastAnimationEnd);
            console.log("Toast animation event listener added");
        }

        const allInputs = document.querySelectorAll("input, select");
        allInputs.forEach(input => {
            let timeout;
            
            const debouncedValidation = () => {
                clearTimeout(timeout);
                timeout = setTimeout(validateInputs, 300);
            };
            
            input.addEventListener("input", debouncedValidation);
            input.addEventListener("change", validateInputs);
            
            input.addEventListener("blur", function() {
                if (this.value.trim()) {
                    this.classList.add('is-valid');
                    this.classList.remove('is-invalid');
                }
            });
        });
        
        document.addEventListener("keydown", function(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                if (addButton && !addButton.disabled) {
                    handleFormSubmit(event);
                }
            }
            
            if (event.key === "Escape") {
                clearInputs();
                if (workoutTypeSelect) workoutTypeSelect.focus();
            }
        });
        
        console.log("All event listeners set up successfully");
        
    } catch (error) {
        console.error("Error setting up event listeners:", error);
        showToast("Error setting up page interactions. Please refresh.", "error");
    }
}

function handleConnectionError() {
    showToast("Connection issue detected. Please check your internet connection.", "warning");
    
    setTimeout(async () => {
        try {
            if (currentWorkoutId) {
                await API.getWorkout(currentWorkoutId);
                showToast("Connection restored!", "success");
            }
        } catch (error) {
            console.log("Still having connection issues:", error.message);
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Exercise page loading...");
    
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) {
            console.log("User not authenticated, redirecting to login");
            showToast("Please log in to continue", "warning");
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            return;
        }
        
        console.log("User authenticated:", user.email || user.username || "Unknown");
        
        if (typeof API === 'undefined') {
            console.log("Using internal API implementation");
        }
        
        setupEventListeners();
        
        const initPromise = initExercise();
        
        const validationDisplay = document.getElementById('validationMessage');
        if (validationDisplay) {
            validationDisplay.textContent = "Select an exercise type to begin";
            validationDisplay.className = 'text-muted';
        }
        
        await initPromise;
        
        console.log("Exercise page initialized successfully");
        
    } catch (error) {
        console.error("Error during page initialization:", error);
        showToast(`Initialization error: ${error.message}`, "error");
    }
});

document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentWorkoutId) {
        try {
            console.log("Page became visible, syncing workout data...");
            const workout = await API.getWorkout(currentWorkoutId);
            if (workout && workout.exercises) {
                const currentExercises = JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
                
                if (workout.exercises.length !== currentExercises.length) {
                    localStorage.setItem("newWorkoutExercises", JSON.stringify(workout.exercises));
                    updateNewWorkoutContainer(workout.exercises);
                    updateWorkoutStatsDisplay();
                    
                    const diff = workout.exercises.length - currentExercises.length;
                    if (diff > 0) {
                        showToast(`${diff} new exercise${diff > 1 ? 's' : ''} synced from another session`, "info");
                    }
                    
                    console.log("Workout data synced on page focus");
                }
            }
        } catch (error) {
            console.warn('Could not sync workout data on page focus:', error.message);
            if (error.message.includes('not found')) {
                showToast("Workout was deleted in another session. Creating new workout...", "warning");
                currentWorkoutId = null;
                localStorage.removeItem("currentWorkoutId");
                localStorage.removeItem("newWorkoutExercises");
                initExercise();
            }
        }
    }
});

window.addEventListener('beforeunload', (event) => {
    if (currentWorkoutId) {
        console.log('Page unloading with active workout:', currentWorkoutId);
        
        if (process?.env?.NODE_ENV === 'development') {
            event.preventDefault();
            event.returnValue = 'You have an active workout. Are you sure you want to leave?';
        }
    }
});

window.addEventListener('storage', (e) => {
    if (e.key === 'workoutCompleted') {
        console.log('Workout completed in another tab');
        showToast('Workout was completed in another tab', 'info');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
    } else if (e.key === 'workoutUpdated') {
        console.log('Workout updated in another tab');
        if (currentWorkoutId) {
            setTimeout(() => updateWorkoutStatsDisplay(), 100);
        }
    }
});

window.addEventListener('online', () => {
    console.log('Connection restored');
    showToast('Connection restored!', 'success');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    showToast('Connection lost. Changes will be saved when connection is restored.', 'warning');
});

if (typeof window !== 'undefined') {
    window.ExercisePageDebug = {
        currentWorkoutId: () => currentWorkoutId,
        getWorkoutData: () => JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]"),
        validateForm: validateInputs,
        clearForm: clearInputs,
        refreshStats: updateWorkoutStatsDisplay,
        showToast: showToast,
        API: API
    };
}