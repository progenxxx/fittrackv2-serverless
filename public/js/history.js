<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100;300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <title>FitTrack - Workout History</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Lexend', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }

        nav {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 2rem;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: white;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .nav-brand i {
            font-size: 2rem;
            background: rgba(255, 255, 255, 0.2);
            padding: 0.5rem;
            border-radius: 50%;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 2rem;
        }

        .nav-links a {
            color: white;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            padding: 0.5rem 1rem;
            border-radius: 25px;
        }

        .nav-links a:hover,
        .nav-links a.active {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 0;
            text-align: center;
        }

        .hero h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .hero p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        /* Main Container */
        .history-container {
            max-width: 1000px;
            margin: -2rem auto 0;
            padding: 0 2rem 3rem;
            position: relative;
            z-index: 10;
        }

        .filters-card {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }

        .filters-header {
            display: flex;
            align-items: center;
            justify-content: between;
            margin-bottom: 1.5rem;
        }

        .filters-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
        }

        .filters-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            align-items: end;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
        }

        .filter-group label {
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
            font-size: 0.9rem;
        }

        .filter-group select,
        .filter-group input {
            padding: 0.75rem;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-family: 'Lexend', sans-serif;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        .filter-group select:focus,
        .filter-group input:focus {
            outline: none;
            border-color: #4CAF50;
        }

        .filter-buttons {
            display: flex;
            gap: 0.75rem;
        }

        .btn-filter {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 10px;
            font-family: 'Lexend', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: #4CAF50;
            color: white;
        }

        .btn-primary:hover {
            background: #45a049;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: transparent;
            color: #4CAF50;
            border: 2px solid #4CAF50;
        }

        .btn-secondary:hover {
            background: #4CAF50;
            color: white;
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .summary-card {
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            border-top: 4px solid var(--accent-color, #4CAF50);
        }

        .summary-number {
            font-size: 2rem;
            font-weight: 700;
            color: var(--accent-color, #4CAF50);
            margin-bottom: 0.25rem;
        }

        .summary-label {
            color: #666;
            font-weight: 500;
            font-size: 0.9rem;
        }

        .summary-card.total { --accent-color: #4CAF50; }
        .summary-card.duration { --accent-color: #2196F3; }
        .summary-card.exercises { --accent-color: #FF9800; }
        .summary-card.avg { --accent-color: #9C27B0; }

        /* Workout List */
        .workouts-list {
            space-y: 1rem;
        }

        .workout-item {
            background: white;
            border-radius: 20px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            margin-bottom: 1.5rem;
        }

        .workout-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
        }

        .workout-header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .workout-date {
            font-size: 1.2rem;
            font-weight: 600;
        }

        .workout-duration {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
        }

        .workout-body {
            padding: 2rem;
        }

        .workout-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .summary-item {
            text-align: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 10px;
        }

        .summary-item-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #333;
            margin-bottom: 0.25rem;
        }

        .summary-item-label {
            color: #666;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .exercises-list {
            margin-top: 1.5rem;
        }

        .exercises-header {
            font-weight: 600;
            color: #333;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }

        .exercise-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 12px;
            margin-bottom: 0.75rem;
            border-left: 4px solid var(--exercise-color);
        }

        .exercise-item:last-child {
            margin-bottom: 0;
        }

        .exercise-item.resistance {
            --exercise-color: #4CAF50;
        }

        .exercise-item.cardio {
            --exercise-color: #2196F3;
        }

        .exercise-icon {
            width: 40px;
            height: 40px;
            background: var(--exercise-color);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-right: 1rem;
        }

        .exercise-details {
            flex: 1;
        }

        .exercise-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 0.25rem;
        }

        .exercise-stats {
            color: #666;
            font-size: 0.9rem;
        }

        .workout-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e0e0e0;
        }

        .btn-action {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 8px;
            font-family: 'Lexend', sans-serif;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }

        .btn-repeat {
            background: #4CAF50;
            color: white;
        }

        .btn-repeat:hover {
            background: #45a049;
        }

        .btn-delete {
            background: transparent;
            color: #f44336;
            border: 1px solid #f44336;
        }

        .btn-delete:hover {
            background: #f44336;
            color: white;
        }

        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .empty-state i {
            font-size: 4rem;
            color: #e0e0e0;
            margin-bottom: 1rem;
        }

        .empty-state h3 {
            color: #666;
            margin-bottom: 0.5rem;
        }

        .empty-state p {
            color: #999;
            margin-bottom: 2rem;
        }

        .btn-start-workout {
            background: #4CAF50;
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            font-family: 'Lexend', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-start-workout:hover {
            background: #45a049;
            transform: translateY(-2px);
        }

        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .toast {
            position: fixed;
            top: 20px;
            right: -400px;
            background: #4CAF50;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: 'Lexend', sans-serif;
            font-weight: 500;
            transition: right 0.3s ease;
        }

        .toast.show {
            right: 20px;
        }

        .error-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            border: 2px solid #f44336;
        }

        .error-state i {
            font-size: 4rem;
            color: #f44336;
            margin-bottom: 1rem;
        }

        .error-state h3 {
            color: #f44336;
            margin-bottom: 0.5rem;
        }

        .error-state p {
            color: #666;
            margin-bottom: 2rem;
        }

        .btn-retry {
            background: #f44336;
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            font-family: 'Lexend', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-retry:hover {
            background: #d32f2f;
            transform: translateY(-2px);
        }

        .debug-panel {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            z-index: 1000;
            display: none;
        }

        .debug-panel.show {
            display: block;
        }

        @media (max-width: 768px) {
            .nav-container {
                flex-direction: column;
                gap: 1rem;
                padding: 0 1rem;
            }

            .history-container {
                padding: 0 1rem 3rem;
            }

            .filters-card {
                padding: 1.5rem;
            }

            .filters-row {
                grid-template-columns: 1fr;
            }

            .summary-stats {
                grid-template-columns: repeat(2, 1fr);
            }

            .workout-header {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .workout-body {
                padding: 1.5rem;
            }

            .workout-summary {
                grid-template-columns: repeat(2, 1fr);
            }

            .exercise-item {
                flex-direction: column;
                text-align: center;
                gap: 0.75rem;
            }

            .exercise-icon {
                margin-right: 0;
            }
        }

        @media (max-width: 480px) {
            .summary-stats {
                grid-template-columns: 1fr;
            }

            .workout-summary {
                grid-template-columns: 1fr;
            }

            .hero h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>

<body>
    <nav>
        <div class="nav-container">
            <a href="/index.html" class="nav-brand">
                <i class="fas fa-dumbbell"></i>
                FitTrack
            </a>
            
            <div class="nav-links">
                <a href="/index.html">Home</a>
                <a href="/stats.html">Dashboard</a>
                <a href="/history.html" class="active">History</a>
            </div>
        </div>
    </nav>

    <div class="hero">
        <h1>Workout History</h1>
        <p>Review your fitness journey and track your progress over time</p>
    </div>

    <div class="history-container">
        <div class="filters-card">
            <div class="filters-header">
                <h3 class="filters-title">Filter Workouts</h3>
            </div>
            <div class="filters-row">
                <div class="filter-group">
                    <label for="dateRange">Date Range</label>
                    <select id="dateRange">
                        <option value="all">All Time</option>
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="exerciseType">Exercise Type</label>
                    <select id="exerciseType">
                        <option value="all">All Types</option>
                        <option value="resistance">Resistance</option>
                        <option value="cardio">Cardio</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="sortBy">Sort By</label>
                    <select id="sortBy">
                        <option value="date-desc">Date (Newest)</option>
                        <option value="date-asc">Date (Oldest)</option>
                        <option value="duration-desc">Duration (Longest)</option>
                        <option value="duration-asc">Duration (Shortest)</option>
                    </select>
                </div>
                
                <div class="filter-buttons">
                    <button class="btn-filter btn-primary" onclick="applyFilters()">
                        <i class="fas fa-filter"></i> Apply
                    </button>
                    <button class="btn-filter btn-secondary" onclick="clearFilters()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>
            </div>
        </div>

        <div class="summary-stats" id="summaryStats">
            <div class="summary-card total">
                <div class="summary-number" id="totalWorkoutsFiltered">0</div>
                <div class="summary-label">Workouts</div>
            </div>
            <div class="summary-card duration">
                <div class="summary-number" id="totalTimeFiltered">0</div>
                <div class="summary-label">Minutes</div>
            </div>
            <div class="summary-card exercises">
                <div class="summary-number" id="totalExercisesFiltered">0</div>
                <div class="summary-label">Exercises</div>
            </div>
            <div class="summary-card avg">
                <div class="summary-number" id="avgDurationFiltered">0</div>
                <div class="summary-label">Avg Duration</div>
            </div>
        </div>

        <div class="workouts-list" id="workoutsList">
            <div class="loading">
                <div class="spinner"></div>
            </div>
        </div>
    </div>

    <div class="toast" id="toast">
        <span>Action completed successfully!</span>
    </div>

    <div id="deleteModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
        <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 400px; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 1rem;"></i>
            <h3 style="margin-bottom: 1rem;">Delete Workout?</h3>
            <p style="margin-bottom: 2rem; color: #666;">This action cannot be undone. Are you sure you want to delete this workout?</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeDeleteModal()" style="padding: 0.75rem 1.5rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button onclick="confirmDelete()" style="padding: 0.75rem 1.5rem; border: none; background: #f44336; color: white; border-radius: 8px; cursor: pointer;">Delete</button>
            </div>
        </div>
    </div>

    <div class="debug-panel" id="debugPanel">
        <div><strong>Debug Info:</strong></div>
        <div id="debugContent">Initializing...</div>
        <button onclick="toggleDebug()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">Hide Debug</button>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>

    <script>
        const API = {
            baseURL: window.location.origin,
            
            debug: true,
            
            log(message, data = null) {
                if (this.debug) {
                    console.log(`[API] ${message}`, data || '');
                    this.updateDebug(`${new Date().toLocaleTimeString()}: ${message}`);
                }
            },
            
            updateDebug(message) {
                const debugContent = document.getElementById('debugContent');
                if (debugContent) {
                    debugContent.innerHTML = `${debugContent.innerHTML}<br>${message}`;
                    const lines = debugContent.innerHTML.split('<br>');
                    if (lines.length > 10) {
                        debugContent.innerHTML = lines.slice(-10).join('<br>');
                    }
                }
            },

            async getAllWorkouts() {
                try {
                    this.log('Fetching all workouts from MongoDB...');
                    
                    const response = await fetch(`${this.baseURL}/api/workouts`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },

                        signal: AbortSignal.timeout(10000) 
                    });
                    
                    this.log(`Response status: ${response.status}`);
                    
                    if (!response.ok) {
                        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorMessage;
                        } catch (e) {
                            
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const workouts = await response.json();
                    this.log(`Successfully loaded ${workouts.length} workouts`);
                    
                    if (!Array.isArray(workouts)) {
                        throw new Error('Invalid response format: Expected array of workouts');
                    }
                    
                    return workouts;
                    
                } catch (error) {
                    this.log(`Error fetching workouts: ${error.message}`);
                    
                    if (error.name === 'AbortError') {
                        throw new Error('Request timeout - Please check your internet connection');
                    } else if (error.message.includes('Failed to fetch')) {
                        throw new Error('Cannot connect to server - Please check if the server is running');
                    } else if (error.message.includes('ECONNREFUSED')) {
                        throw new Error('MongoDB connection refused - Please check your database connection');
                    }
                    
                    throw error;
                }
            },

            async deleteWorkout(id) {
                try {
                    this.log(`Deleting workout: ${id}`);
                    
                    if (!id) {
                        throw new Error('Workout ID is required');
                    }
                    
                    const response = await fetch(`${this.baseURL}/api/workouts/${id}`, { 
                        method: "DELETE",
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        signal: AbortSignal.timeout(5000) 
                    });
                    
                    if (!response.ok) {
                        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorMessage;
                        } catch (e) {
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const result = await response.json();
                    this.log(`Successfully deleted workout: ${id}`);
                    return result;
                    
                } catch (error) {
                    this.log(`Error deleting workout: ${error.message}`);
                    throw error;
                }
            }
        };

        let allWorkouts = [];
        let filteredWorkouts = [];
        let workoutToDelete = null;

        function toggleDebug() {
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel.classList.contains('show')) {
                debugPanel.classList.remove('show');
            } else {
                debugPanel.classList.add('show');
            }
        }

        function showDebugOnError() {
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel) {
                debugPanel.classList.add('show');
            }
        }

        async function initializePage() {
            try {
                API.log('Starting page initialization...');
                
                const user = localStorage.getItem('user');
                if (!user) {
                    API.log('No user found, redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                
                try {
                    JSON.parse(user);
                    API.log('User authentication valid');
                } catch (e) {
                    API.log('Invalid user data, redirecting to login');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                    return;
                }

                API.log('Loading workouts from database...');
                allWorkouts = await API.getAllWorkouts();
                filteredWorkouts = [...allWorkouts];
                
                displayWorkouts();
                updateSummaryStats();
                
                API.log('Page initialization completed successfully');
                
            } catch (error) {
                console.error('Error initializing page:', error);
                API.log(`Initialization failed: ${error.message}`);
                showErrorState(error.message);
                showDebugOnError();
            }
        }

        function displayWorkouts() {
            const workoutsList = document.getElementById('workoutsList');
            
            if (!workoutsList) {
                API.log('Error: workoutsList element not found');
                return;
            }
            
            if (filteredWorkouts.length === 0) {
                showEmptyState();
                return;
            }

            try {
                workoutsList.innerHTML = filteredWorkouts.map(workout => {
                    if (!workout || !workout._id) {
                        API.log('Warning: Invalid workout data', workout);
                        return '';
                    }
                    
                    const exercises = workout.exercises || [];
                    const totalDuration = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
                    const exerciseCount = exercises.length;
                    
                    let date = 'Unknown Date';
                    let timeAgo = 'Unknown';
                    
                    try {
                        if (workout.day) {
                            if (typeof moment !== 'undefined') {
                                date = moment(workout.day).format('MMMM Do, YYYY');
                                timeAgo = moment(workout.day).fromNow();
                            } else {
                                const workoutDate = new Date(workout.day);
                                date = workoutDate.toLocaleDateString();
                                timeAgo = 'Recently';
                            }
                        }
                    } catch (dateError) {
                        API.log('Date parsing error:', dateError.message);
                    }
                    
                    const resistanceExercises = exercises.filter(ex => ex && ex.type === 'resistance');
                    const cardioExercises = exercises.filter(ex => ex && ex.type === 'cardio');
                    const totalWeight = resistanceExercises.reduce((sum, ex) => 
                        sum + ((ex.weight || 0) * (ex.reps || 0) * (ex.sets || 1)), 0
                    );
                    const totalDistance = cardioExercises.reduce((sum, ex) => sum + (ex.distance || 0), 0);

                    return `
                        <div class="workout-item">
                            <div class="workout-header">
                                <div class="workout-date">${date}</div>
                                <div class="workout-duration">
                                    <i class="fas fa-clock"></i>
                                    ${totalDuration} minutes
                                </div>
                            </div>
                            
                            <div class="workout-body">
                                <div class="workout-summary">
                                    <div class="summary-item">
                                        <div class="summary-item-value">${exerciseCount}</div>
                                        <div class="summary-item-label">Exercises</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-item-value">${resistanceExercises.length}</div>
                                        <div class="summary-item-label">Resistance</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-item-value">${cardioExercises.length}</div>
                                        <div class="summary-item-label">Cardio</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-item-value">${totalWeight}kg</div>
                                        <div class="summary-item-label">Weight Lifted</div>
                                    </div>
                                </div>
                                
                                <div class="exercises-list">
                                    <div class="exercises-header">Exercises Performed</div>
                                    ${exercises.map(exercise => {
                                        if (!exercise || !exercise.name) return '';
                                        
                                        const exerciseType = exercise.type || 'unknown';
                                        const exerciseName = exercise.name || 'Unknown Exercise';
                                        
                                        let exerciseStats = '';
                                        if (exerciseType === 'resistance') {
                                            exerciseStats = `${exercise.weight || 0}kg × ${exercise.sets || 0} sets × ${exercise.reps || 0} reps • ${exercise.duration || 0} min`;
                                        } else if (exerciseType === 'cardio') {
                                            exerciseStats = `${exercise.distance || 0}km in ${exercise.duration || 0} minutes`;
                                        } else {
                                            exerciseStats = `Duration: ${exercise.duration || 0} minutes`;
                                        }
                                        
                                        return `
                                            <div class="exercise-item ${exerciseType}">
                                                <div class="exercise-icon">
                                                    <i class="fas fa-${exerciseType === 'resistance' ? 'dumbbell' : exerciseType === 'cardio' ? 'heart' : 'circle'}"></i>
                                                </div>
                                                <div class="exercise-details">
                                                    <div class="exercise-name">${exerciseName}</div>
                                                    <div class="exercise-stats">${exerciseStats}</div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                
                                <div class="workout-actions">
                                    <button class="btn-action btn-repeat" onclick="repeatWorkout('${workout._id}')">
                                        <i class="fas fa-redo"></i> Repeat Workout
                                    </button>
                                    <button class="btn-action btn-delete" onclick="showDeleteModal('${workout._id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).filter(html => html !== '').join('');
                
                API.log(`Displayed ${filteredWorkouts.length} workouts`);
                
            } catch (error) {
                API.log(`Error displaying workouts: ${error.message}`);
                showErrorState('Error displaying workout data');
            }
        }

        function showEmptyState(message = null) {
            const workoutsList = document.getElementById('workoutsList');
            if (!workoutsList) return;
            
            const defaultMessage = 'No workouts found';
            const defaultSubtext = 'Start your fitness journey by creating your first workout!';
            const errorSubtext = 'Please check your MongoDB connection or try seeding some data.';
            
            workoutsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <h3>${message || defaultMessage}</h3>
                    <p>${message ? errorSubtext : defaultSubtext}</p>
                    ${!message ? '<a href="/exercise.html" class="btn-start-workout"><i class="fas fa-plus"></i> Start First Workout</a>' : ''}
                </div>
            `;
        }

        function showErrorState(errorMessage) {
            const workoutsList = document.getElementById('workoutsList');
            if (!workoutsList) return;
            
            workoutsList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Data</h3>
                    <p>${errorMessage}</p>
                    <button class="btn-retry" onclick="retryLoadData()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }

        async function retryLoadData() {
            API.log('Retrying data load...');
            showLoadingState();
            
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await initializePage();
            } catch (error) {
                API.log(`Retry failed: ${error.message}`);
                showErrorState(error.message);
            }
        }

        function showLoadingState() {
            const workoutsList = document.getElementById('workoutsList');
            if (!workoutsList) return;
            
            workoutsList.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }

        function updateSummaryStats() {
            try {
                const totalWorkouts = filteredWorkouts.length;
                const totalTime = filteredWorkouts.reduce((sum, workout) => 
                    sum + (workout.exercises || []).reduce((exSum, ex) => exSum + (ex.duration || 0), 0), 0
                );
                const totalExercises = filteredWorkouts.reduce((sum, workout) => sum + (workout.exercises || []).length, 0);
                const avgDuration = totalWorkouts > 0 ? Math.round(totalTime / totalWorkouts) : 0;

                const elements = {
                    'totalWorkoutsFiltered': totalWorkouts,
                    'totalTimeFiltered': totalTime,
                    'totalExercisesFiltered': totalExercises,
                    'avgDurationFiltered': avgDuration
                };

                for (const [elementId, value] of Object.entries(elements)) {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = value;
                    } else {
                        API.log(`Warning: Element ${elementId} not found`);
                    }
                }
                
                API.log('Summary stats updated successfully');
                
            } catch (error) {
                API.log(`Error updating summary stats: ${error.message}`);
            }
        }

        function applyFilters() {
            try {
                const dateRange = document.getElementById('dateRange')?.value || 'all';
                const exerciseType = document.getElementById('exerciseType')?.value || 'all';
                const sortBy = document.getElementById('sortBy')?.value || 'date-desc';

                API.log(`Applying filters: date=${dateRange}, type=${exerciseType}, sort=${sortBy}`);

                let filtered = [...allWorkouts];
                
                if (dateRange !== 'all' && typeof moment !== 'undefined') {
                    const now = moment();
                    let startDate;
                    
                    switch (dateRange) {
                        case 'week':
                            startDate = now.clone().subtract(1, 'week');
                            break;
                        case 'month':
                            startDate = now.clone().subtract(1, 'month');
                            break;
                        case '3months':
                            startDate = now.clone().subtract(3, 'months');
                            break;
                    }
                    
                    if (startDate) {
                        filtered = filtered.filter(workout => {
                            try {
                                return moment(workout.day).isAfter(startDate);
                            } catch (e) {
                                API.log(`Date filter error for workout ${workout._id}: ${e.message}`);
                                return true;
                            }
                        });
                    }
                }

                if (exerciseType !== 'all') {
                    filtered = filtered.filter(workout => 
                        workout.exercises && workout.exercises.some(ex => ex && ex.type === exerciseType)
                    );
                }

                filtered.sort((a, b) => {
                    try {
                        const aDuration = (a.exercises || []).reduce((sum, ex) => sum + (ex.duration || 0), 0);
                        const bDuration = (b.exercises || []).reduce((sum, ex) => sum + (ex.duration || 0), 0);
                        
                        switch (sortBy) {
                            case 'date-desc':
                                return new Date(b.day || 0) - new Date(a.day || 0);
                            case 'date-asc':
                                return new Date(a.day || 0) - new Date(b.day || 0);
                            case 'duration-desc':
                                return bDuration - aDuration;
                            case 'duration-asc':
                                return aDuration - bDuration;
                            default:
                                return new Date(b.day || 0) - new Date(a.day || 0);
                        }
                    } catch (e) {
                        API.log(`Sort error: ${e.message}`);
                        return 0;
                    }
                });

                filteredWorkouts = filtered;
                displayWorkouts();
                updateSummaryStats();
                showToast(`Found ${filtered.length} workout${filtered.length !== 1 ? 's' : ''}`);
                
                API.log(`Filters applied successfully, ${filtered.length} workouts found`);
                
            } catch (error) {
                API.log(`Error applying filters: ${error.message}`);
                showToast('Error applying filters', 'error');
            }
        }

        function clearFilters() {
            try {
                ['dateRange', 'exerciseType', 'sortBy'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.value = id === 'sortBy' ? 'date-desc' : 'all';
                    }
                });
                
                filteredWorkouts = [...allWorkouts];
                displayWorkouts();
                updateSummaryStats();
                showToast('Filters cleared');
                
                API.log('Filters cleared successfully');
                
            } catch (error) {
                API.log(`Error clearing filters: ${error.message}`);
                showToast('Error clearing filters', 'error');
            }
        }

        function repeatWorkout(workoutId) {
            try {
                API.log(`Repeating workout: ${workoutId}`);
                
                const workout = allWorkouts.find(w => w._id === workoutId);
                if (workout && workout.exercises) {
                    localStorage.setItem('repeatWorkoutExercises', JSON.stringify(workout.exercises));
                    showToast('Workout template saved! Redirecting to exercise page...');
                    
                    setTimeout(() => {
                        window.location.href = '/exercise.html';
                    }, 1500);
                } else {
                    throw new Error('Workout not found or has no exercises');
                }
                
            } catch (error) {
                API.log(`Error repeating workout: ${error.message}`);
                showToast('Error repeating workout', 'error');
            }
        }

        function showDeleteModal(workoutId) {
            try {
                workoutToDelete = workoutId;
                const modal = document.getElementById('deleteModal');
                if (modal) {
                    modal.style.display = 'flex';
                    API.log(`Showing delete modal for workout: ${workoutId}`);
                } else {
                    throw new Error('Delete modal not found');
                }
            } catch (error) {
                API.log(`Error showing delete modal: ${error.message}`);
                showToast('Error showing delete confirmation', 'error');
            }
        }

        function closeDeleteModal() {
            workoutToDelete = null;
            const modal = document.getElementById('deleteModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        async function confirmDelete() {
            if (!workoutToDelete) return;
            
            try {
                API.log(`Confirming delete for workout: ${workoutToDelete}`);
                
                await API.deleteWorkout(workoutToDelete);
                
                allWorkouts = allWorkouts.filter(w => w._id !== workoutToDelete);
                filteredWorkouts = filteredWorkouts.filter(w => w._id !== workoutToDelete);
                
                displayWorkouts();
                updateSummaryStats();
                
                showToast('Workout deleted successfully');
                closeDeleteModal();
                
                localStorage.setItem('workoutUpdated', Date.now());
                
                API.log('Workout deleted successfully');
                
            } catch (error) {
                API.log(`Error deleting workout: ${error.message}`);
                showToast('Error deleting workout. Please try again.', 'error');
                showDebugOnError();
            }
        }

        function showToast(message, type = 'success') {
            try {
                const toast = document.getElementById('toast');
                if (!toast) return;
                
                const span = toast.querySelector('span');
                if (span) {
                    span.textContent = message;
                }
                
                if (type === 'error') {
                    toast.style.background = '#f44336';
                } else {
                    toast.style.background = '#4CAF50';
                }
                
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
                
            } catch (error) {
                console.error('Error showing toast:', error);
            }
        }

        // Event listeners and initialization
        document.addEventListener('DOMContentLoaded', () => {
            API.log('DOM loaded, initializing page...');
            
            if (typeof moment === 'undefined') {
                API.log('Warning: Moment.js not loaded, using fallback date handling');
            }
            
            initializePage();
            
            try {
                const modal = document.getElementById('deleteModal');
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === e.currentTarget) {
                            closeDeleteModal();
                        }
                    });
                }
                
                window.addEventListener('storage', (e) => {
                    if (e.key === 'workoutUpdated') {
                        API.log('Workout updated event received, refreshing...');
                        initializePage();
                    }
                });
                
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                        toggleDebug();
                    }
                });
                
                API.log('Event listeners added successfully');
                
            } catch (error) {
                API.log(`Error adding event listeners: ${error.message}`);
            }
        });

        // Global error handler
        window.addEventListener('error', (event) => {
            API.log(`Global error: ${event.error?.message || event.message}`);
            showDebugOnError();
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            API.log(`Unhandled promise rejection: ${event.reason}`);
            showDebugOnError();
        });
    </script>
</body>
</html>