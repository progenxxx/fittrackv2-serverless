// stats.js - Real MongoDB Integration

async function renderStats() {
  try {
      console.log('Loading workout data from MongoDB...');
      const workouts = await API.getAllWorkouts();

      if (!workouts || workouts.length === 0) {
          console.log("No workouts found in MongoDB.");
          showEmptyStatsState();
          return;
      }

      console.log(`Loaded ${workouts.length} workouts from MongoDB`);

      // Use all available workouts, but limit charts to recent data for clarity
      const recentWorkouts = workouts.slice(0, 10).reverse(); // Last 10 workouts for charts

      // Prepare data for charts
      const labels = recentWorkouts.map(w => {
          const date = new Date(w.day);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const durationData = recentWorkouts.map(w =>
          w.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0)
      );

      const weightData = recentWorkouts.map(w =>
          w.exercises
              .filter(ex => ex.type === "resistance")
              .reduce((sum, ex) => sum + ((ex.weight || 0) * (ex.reps || 0) * (ex.sets || 1)), 0)
      );

      // Clear previous charts if they exist
      const canvases = ['canvas', 'canvas2', 'canvas3', 'canvas4'];
      canvases.forEach(canvasId => {
          const canvas = document.getElementById(canvasId);
          if (canvas) {
              const existingChart = Chart.getChart(canvas);
              if (existingChart) {
                  existingChart.destroy();
              }
          }
      });

      // Create Duration Line Chart
      const ctx1 = document.getElementById("canvas");
      if (ctx1) {
          new Chart(ctx1.getContext("2d"), {
              type: "line",
              data: {
                  labels: labels,
                  datasets: [{
                      label: "Duration (min)",
                      data: durationData,
                      backgroundColor: "rgba(75, 192, 192, 0.2)",
                      borderColor: "rgba(75, 192, 192, 1)",
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4
                  }]
              },
              options: { 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                      legend: {
                          display: true,
                          position: 'top'
                      }
                  },
                  scales: {
                      y: {
                          beginAtZero: true
                      }
                  }
              }
          });
      }

      // Create Duration Pie Chart
      const ctx2 = document.getElementById("canvas2");
      if (ctx2 && durationData.length > 0) {
          new Chart(ctx2.getContext("2d"), {
              type: "pie",
              data: {
                  labels: labels,
                  datasets: [{
                      data: durationData,
                      backgroundColor: [
                          "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", 
                          "#F44336", "#00BCD4", "#FFEB3B", "#E91E63",
                          "#795548", "#607D8B"
                      ]
                  }]
              },
              options: { 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                      legend: {
                          position: 'bottom'
                      }
                  }
              }
          });
      }

      // Create Weight Bar Chart
      const ctx3 = document.getElementById("canvas3");
      if (ctx3) {
          new Chart(ctx3.getContext("2d"), {
              type: "bar",
              data: {
                  labels: labels,
                  datasets: [{
                      label: "Weight Lifted (kg)",
                      data: weightData,
                      backgroundColor: "#4CAF50",
                      borderColor: "#45a049",
                      borderWidth: 1
                  }]
              },
              options: { 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                      legend: {
                          display: true,
                          position: 'top'
                      }
                  },
                  scales: {
                      y: {
                          beginAtZero: true
                      }
                  }
              }
          });
      }

      // Create Weight Doughnut Chart
      const ctx4 = document.getElementById("canvas4");
      if (ctx4 && weightData.some(weight => weight > 0)) {
          new Chart(ctx4.getContext("2d"), {
              type: "doughnut",
              data: {
                  labels: labels,
                  datasets: [{
                      data: weightData,
                      backgroundColor: [
                          "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", 
                          "#F44336", "#00BCD4", "#FFEB3B", "#E91E63",
                          "#795548", "#607D8B"
                      ]
                  }]
              },
              options: { 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                      legend: {
                          position: 'bottom'
                      }
                  }
              }
          });
      }

      console.log('Charts rendered successfully');

  } catch (err) {
      console.error("Error loading stats from MongoDB:", err);
      showErrorStatsState(err.message);
  }
}

// Show empty state when no workouts are available
function showEmptyStatsState() {
    const chartContainers = document.querySelectorAll('[id^="canvas"]');
    chartContainers.forEach(container => {
        if (container && container.parentElement) {
            container.parentElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <h3 style="margin-bottom: 0.5rem;">No Workout Data</h3>
                    <p style="text-align: center; margin-bottom: 1rem;">Start tracking your workouts to see analytics here.</p>
                    <a href="/excercise.html" style="background: #4CAF50; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; text-decoration: none;">Start First Workout</a>
                </div>
            `;
        }
    });
}

// Show error state when there's a problem loading data
function showErrorStatsState(errorMessage) {
    const chartContainers = document.querySelectorAll('[id^="canvas"]');
    chartContainers.forEach(container => {
        if (container && container.parentElement) {
            container.parentElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 0.5rem;">Error Loading Data</h3>
                    <p style="text-align: center; margin-bottom: 1rem;">${errorMessage}</p>
                    <button onclick="renderStats()" style="background: #4CAF50; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer;">Retry</button>
                </div>
            `;
        }
    });
}

// Listen for updates from other pages
window.addEventListener("storage", (e) => {
  if (e.key === "workoutUpdated") {
      console.log('Workout updated event received, refreshing stats...');
      setTimeout(renderStats, 500); // Small delay to ensure data is saved
  }
});

// Auto-refresh stats every 60 seconds to stay in sync
setInterval(() => {
    console.log('Auto-refreshing stats...');
    renderStats();
}, 60000); // 60 seconds

// Initial render when page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log('Stats page loaded, initializing...');
    renderStats();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Stats page became visible, refreshing data...');
        renderStats();
    }
});

// Expose globally for other scripts
window.renderStats = renderStats;

// Handle window resize
window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        console.log('Window resized, re-rendering charts...');
        renderStats();
    }, 250);
});