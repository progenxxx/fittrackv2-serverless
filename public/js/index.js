document.addEventListener("DOMContentLoaded", async () => {
  const newContainer = document.querySelector(".new-workout-container");
  const newContainerContent = document.querySelector(".new-workout-exercises");

  // Fetch last workout from MongoDB
  async function fetchLastWorkout() {
      try {
          console.log('Fetching last workout from MongoDB...');
          const lastWorkout = await API.getLastWorkout();
          
          if (!lastWorkout || !lastWorkout.exercises || lastWorkout.exercises.length === 0) {
              console.log('No workout data found');
              renderEmptyWorkoutContainer();
              return;
          }
          
          console.log('Last workout loaded:', lastWorkout._id);
          renderWorkoutInContainer(lastWorkout);
      } catch (err) {
          console.error("Error fetching last workout:", err);
          renderErrorWorkoutContainer();
      }
  }

  // Render workout data in container
  function renderWorkoutInContainer(workout) {
      if (!newContainerContent) return;
      
      newContainerContent.innerHTML = ""; // clear old content
      
      if (!workout.exercises || workout.exercises.length === 0) {
          newContainerContent.innerHTML = '<div class="exercise-detail">No exercises in this workout.</div>';
          return;
      }

      workout.exercises.forEach(ex => {
          const div = document.createElement("div");
          div.classList.add("exercise-detail");

          if (ex.type === "resistance") {
              div.textContent = `${ex.type} - ${ex.name} - Duration: ${ex.duration || 0} min, Weight: ${ex.weight || 0} kg, Sets: ${ex.sets || 0}, Reps: ${ex.reps || 0}`;
          } else if (ex.type === "cardio") {
              div.textContent = `${ex.type} - ${ex.name} - Duration: ${ex.duration || 0} min, Distance: ${ex.distance || 0} km`;
          } else {
              // Handle any other exercise types
              div.textContent = `${ex.type} - ${ex.name} - Duration: ${ex.duration || 0} min`;
          }

          newContainerContent.appendChild(div);
      });
  }

  // Render empty state
  function renderEmptyWorkoutContainer() {
      if (!newContainerContent) return;
      newContainerContent.innerHTML = '<div class="exercise-detail">No recent workouts. Start your first workout!</div>';
  }

  // Render error state
  function renderErrorWorkoutContainer() {
      if (!newContainerContent) return;
      newContainerContent.innerHTML = '<div class="exercise-detail">Error loading workout data. Check MongoDB connection.</div>';
  }

  // Load current workout in progress from localStorage
  function loadCurrentWorkoutExercises() {
      const exercises = JSON.parse(localStorage.getItem("newWorkoutExercises") || "[]");
      
      if (exercises.length === 0) {
          return;
      }

      // If there are exercises in localStorage, show them in a different container
      // This would be for a workout currently in progress
      const currentWorkoutContainer = document.querySelector(".current-workout-exercises");
      if (currentWorkoutContainer) {
          currentWorkoutContainer.innerHTML = "";
          exercises.forEach(ex => {
              const div = document.createElement("div");
              div.classList.add("exercise-detail");
              
              if (ex.type === "resistance") {
                  div.textContent = `${ex.type} - ${ex.name} - Duration: ${ex.duration || 0} min, Weight: ${ex.weight || 0} kg, Sets: ${ex.sets || 0}, Reps: ${ex.reps || 0}`;
              } else {
                  div.textContent = `${ex.type} - ${ex.name} - Duration: ${ex.duration || 0} min, Distance: ${ex.distance || 0} km`;
              }
              
              currentWorkoutContainer.appendChild(div);
          });
      }
  }

  // Complete workout button handler
  const completeBtn = document.querySelector("#complete-new-workout");
  if (completeBtn) {
      completeBtn.addEventListener("click", async () => {
          const workoutId = localStorage.getItem("currentWorkoutId");
          
          if (!workoutId) {
              alert("No workout to complete.");
              return;
          }

          try {
              console.log('Completing workout:', workoutId);
              
              // The workout should already be saved to MongoDB via exercise.js
              // Just need to clean up localStorage and refresh data
              
              // Clear localStorage
              localStorage.removeItem("currentWorkoutId");
              localStorage.removeItem("newWorkoutExercises");
              localStorage.removeItem("workoutStartTime");

              // Clear current workout container
              const currentWorkoutContainer = document.querySelector(".current-workout-exercises");
              if (currentWorkoutContainer) {
                  currentWorkoutContainer.innerHTML = '<div class="exercise-detail">No exercise added yet.</div>';
              }

              // Notify other pages that workout data has been updated
              localStorage.setItem("workoutUpdated", Date.now());
              
              // Refresh the last workout display
              await fetchLastWorkout();
              
              alert("Workout completed! Stats and history updated.");
              
          } catch (err) {
              console.error("Error completing workout:", err);
              alert("Error completing workout. Please try again.");
          }
      });
  }

  // Initialize page data
  async function initializePage() {
      await fetchLastWorkout();
      loadCurrentWorkoutExercises();
  }

  // Listen for updates from other pages
  window.addEventListener("storage", (e) => {
      if (e.key === "workoutUpdated") {
          console.log('Workout updated event received, refreshing data...');
          fetchLastWorkout();
      }
      if (e.key === "newWorkoutExercises") {
          console.log('New workout exercises updated, refreshing current workout display...');
          loadCurrentWorkoutExercises();
      }
  });

  // Auto-refresh every 30 seconds to stay in sync with MongoDB
  setInterval(async () => {
      const workoutId = localStorage.getItem("currentWorkoutId");
      if (workoutId) {
          try {
              // Sync current workout with MongoDB
              const currentWorkout = await API.getWorkout(workoutId);
              if (currentWorkout && currentWorkout.exercises) {
                  localStorage.setItem("newWorkoutExercises", JSON.stringify(currentWorkout.exercises));
                  loadCurrentWorkoutExercises();
              }
          } catch (error) {
              console.log('Auto-sync failed:', error.message);
          }
      }
  }, 30000); // 30 seconds

  // Initial page load
  await initializePage();
});

// Also handle workout completion from other parts of the app
window.completeCurrentWorkout = async function() {
    const workoutId = localStorage.getItem("currentWorkoutId");
    
    if (!workoutId) {
        console.log("No current workout to complete");
        return false;
    }

    try {
        console.log('Completing current workout:', workoutId);
        
        // Clear localStorage
        localStorage.removeItem("currentWorkoutId");
        localStorage.removeItem("newWorkoutExercises");
        localStorage.removeItem("workoutStartTime");

        // Notify other pages
        localStorage.setItem("workoutUpdated", Date.now());
        
        return true;
    } catch (error) {
        console.error("Error completing workout:", error);
        return false;
    }
};

// Handle page visibility changes to sync data
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        // Page became visible, refresh data
        try {
            const lastWorkout = await API.getLastWorkout();
            if (lastWorkout) {
                renderWorkoutInContainer(lastWorkout);
            }
        } catch (error) {
            console.log('Could not refresh workout data:', error.message);
        }
    }
});