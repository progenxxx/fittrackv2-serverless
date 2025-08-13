const form = document.querySelector("#exercise-form");
const typeSelect = document.querySelector("#exercise-type");
const nameInput = document.querySelector("#exercise-name");
const durationInput = document.querySelector("#exercise-duration");
const weightInput = document.querySelector("#exercise-weight");
const repsInput = document.querySelector("#exercise-reps");
const setsInput = document.querySelector("#exercise-sets");
const distanceInput = document.querySelector("#exercise-distance");

if (form) {
  form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const type = typeSelect.value;
      const name = nameInput.value.trim();
      const duration = Number(durationInput.value);
      const weight = Number(weightInput.value);
      const reps = Number(repsInput.value);
      const sets = Number(setsInput.value);
      const distance = Number(distanceInput.value);

      const exerciseData = { type, name, duration, weight, reps, sets, distance };

      // If no workout exists yet, create one
      let workoutId = location.search.split("=")[1];
      if (!workoutId) {
          const newWorkout = await API.createWorkout();
          workoutId = newWorkout._id;
          location.search = `?id=${workoutId}`; // redirect to add exercises
      }

      // Add exercise
      await API.addExercise(exerciseData);

      // Optionally reset form
      form.reset();
  });
}
