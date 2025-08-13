const EXERCISE_TYPES = {
  CARDIO: {
    id: 'cardio',
    name: 'Cardio',
    description: 'Aerobic exercises that improve cardiovascular health',
    icon: '❤️',
    color: '#ef4444',
    subcategories: {
      LOW_INTENSITY: {
        id: 'low_intensity_cardio',
        name: 'Low Intensity Cardio',
        description: 'Sustainable aerobic activities (60-70% max heart rate)',
        examples: ['Walking', 'Light Jogging', 'Easy Cycling', 'Swimming Laps', 'Elliptical']
      },
      MODERATE_INTENSITY: {
        id: 'moderate_intensity_cardio',
        name: 'Moderate Intensity Cardio',
        description: 'Moderate aerobic activities (70-80% max heart rate)',
        examples: ['Brisk Walking', 'Jogging', 'Cycling', 'Dancing', 'Water Aerobics']
      },
      HIGH_INTENSITY: {
        id: 'high_intensity_cardio',
        name: 'High Intensity Cardio',
        description: 'Vigorous aerobic activities (80-90% max heart rate)',
        examples: ['Running', 'Sprinting', 'Fast Cycling', 'Jump Rope', 'Burpees']
      },
      HIIT: {
        id: 'hiit',
        name: 'HIIT (High Intensity Interval Training)',
        description: 'Short bursts of intense exercise followed by rest periods',
        examples: ['Sprint Intervals', 'Tabata', 'Circuit Training', 'Bike Intervals', 'Rowing Intervals']
      }
    }
  },

  RESISTANCE: {
    id: 'resistance',
    name: 'Resistance Training',
    description: 'Exercises that build muscle strength and endurance',
    icon: '💪',
    color: '#3b82f6',
    subcategories: {
      BODYWEIGHT: {
        id: 'bodyweight',
        name: 'Bodyweight Training',
        description: 'Using your own body weight as resistance',
        examples: ['Push-ups', 'Pull-ups', 'Squats', 'Lunges', 'Planks', 'Burpees', 'Dips']
      },
      FREE_WEIGHTS: {
        id: 'free_weights',
        name: 'Free Weights',
        description: 'Using dumbbells, barbells, and kettlebells',
        examples: ['Bench Press', 'Deadlifts', 'Squats', 'Overhead Press', 'Rows', 'Curls']
      },
      MACHINES: {
        id: 'machines',
        name: 'Weight Machines',
        description: 'Using gym machines with guided movement patterns',
        examples: ['Leg Press', 'Lat Pulldown', 'Chest Press', 'Cable Rows', 'Leg Curl']
      },
      RESISTANCE_BANDS: {
        id: 'resistance_bands',
        name: 'Resistance Bands',
        description: 'Using elastic bands for variable resistance',
        examples: ['Band Squats', 'Band Rows', 'Band Pull-aparts', 'Band Curls', 'Band Presses']
      },
      POWERLIFTING: {
        id: 'powerlifting',
        name: 'Powerlifting',
        description: 'Focus on maximum strength in squat, bench press, and deadlift',
        examples: ['Back Squat', 'Bench Press', 'Deadlift', 'Accessory Work']
      },
      OLYMPIC_LIFTING: {
        id: 'olympic_lifting',
        name: 'Olympic Weightlifting',
        description: 'Technical lifts focusing on power and speed',
        examples: ['Clean & Jerk', 'Snatch', 'Clean', 'Jerk', 'Power Clean']
      }
    }
  },

  FLEXIBILITY: {
    id: 'flexibility',
    name: 'Flexibility & Mobility',
    description: 'Exercises that improve range of motion and muscle elasticity',
    icon: '🧘',
    color: '#10b981',
    subcategories: {
      STATIC_STRETCHING: {
        id: 'static_stretching',
        name: 'Static Stretching',
        description: 'Holding stretches in one position',
        examples: ['Hamstring Stretch', 'Quad Stretch', 'Shoulder Stretch', 'Calf Stretch']
      },
      DYNAMIC_STRETCHING: {
        id: 'dynamic_stretching',
        name: 'Dynamic Stretching',
        description: 'Moving stretches that warm up muscles',
        examples: ['Leg Swings', 'Arm Circles', 'Walking Lunges', 'High Knees']
      },
      YOGA: {
        id: 'yoga',
        name: 'Yoga',
        description: 'Mind-body practice combining poses, breathing, and meditation',
        examples: ['Hatha Yoga', 'Vinyasa Flow', 'Yin Yoga', 'Hot Yoga', 'Restorative Yoga']
      },
      PILATES: {
        id: 'pilates',
        name: 'Pilates',
        description: 'Core-focused exercises emphasizing control and precision',
        examples: ['Mat Pilates', 'Reformer Pilates', 'Core Work', 'Balance Training']
      }
    }
  },

  BALANCE: {
    id: 'balance',
    name: 'Balance & Stability',
    description: 'Exercises that improve balance, coordination, and stability',
    icon: '⚖️',
    color: '#8b5cf6',
    subcategories: {
      BALANCE_TRAINING: {
        id: 'balance_training',
        name: 'Balance Training',
        description: 'Exercises specifically targeting balance and proprioception',
        examples: ['Single Leg Stands', 'Balance Board', 'BOSU Ball', 'Stability Ball']
      },
      FUNCTIONAL_MOVEMENT: {
        id: 'functional_movement',
        name: 'Functional Movement',
        description: 'Movements that mimic everyday activities',
        examples: ['Farmer\'s Walk', 'Turkish Get-ups', 'Bear Crawls', 'Multi-planar Movements']
      },
      TAI_CHI: {
        id: 'tai_chi',
        name: 'Tai Chi',
        description: 'Gentle, flowing movements for balance and relaxation',
        examples: ['Tai Chi Forms', 'Qigong', 'Slow Movement Patterns']
      }
    }
  },

  SPORTS_SPECIFIC: {
    id: 'sports_specific',
    name: 'Sports-Specific Training',
    description: 'Training tailored to specific sports or activities',
    icon: '🏃',
    color: '#f59e0b',
    subcategories: {
      PLYOMETRICS: {
        id: 'plyometrics',
        name: 'Plyometrics',
        description: 'Explosive movements to develop power',
        examples: ['Box Jumps', 'Jump Squats', 'Burpees', 'Medicine Ball Throws', 'Depth Jumps']
      },
      AGILITY: {
        id: 'agility',
        name: 'Agility Training',
        description: 'Quick direction changes and coordination',
        examples: ['Ladder Drills', 'Cone Drills', 'Shuttle Runs', 'Reaction Training']
      },
      ENDURANCE: {
        id: 'endurance',
        name: 'Endurance Training',
        description: 'Building stamina for prolonged activities',
        examples: ['Long Distance Running', 'Cycling Endurance', 'Swimming Distance', 'Rowing']
      },
      CROSSFIT: {
        id: 'crossfit',
        name: 'CrossFit',
        description: 'Varied functional movements at high intensity',
        examples: ['WODs', 'Olympic Lifts', 'Gymnastics', 'Metabolic Conditioning']
      }
    }
  },

  RECOVERY: {
    id: 'recovery',
    name: 'Recovery & Regeneration',
    description: 'Activities focused on recovery and muscle regeneration',
    icon: '😌',
    color: '#64748b',
    subcategories: {
      ACTIVE_RECOVERY: {
        id: 'active_recovery',
        name: 'Active Recovery',
        description: 'Light activities to promote blood flow and recovery',
        examples: ['Easy Walking', 'Light Yoga', 'Gentle Swimming', 'Foam Rolling']
      },
      MOBILITY_WORK: {
        id: 'mobility_work',
        name: 'Mobility Work',
        description: 'Targeted movements to improve joint mobility',
        examples: ['Joint Circles', 'Hip Openers', 'Shoulder Mobility', 'Spine Mobility']
      },
      MEDITATION: {
        id: 'meditation',
        name: 'Meditation & Mindfulness',
        description: 'Mental recovery and stress reduction',
        examples: ['Breathing Exercises', 'Mindfulness Meditation', 'Progressive Relaxation']
      }
    }
  }
};

const INTENSITY_LEVELS = {
  LIGHT: {
    id: 'light',
    name: 'Light',
    description: 'Easy effort, can maintain conversation',
    color: '#22c55e',
    heartRateZone: '50-60%'
  },
  MODERATE: {
    id: 'moderate',
    name: 'Moderate',
    description: 'Somewhat hard effort, breathing increases',
    color: '#f59e0b',
    heartRateZone: '60-70%'
  },
  VIGOROUS: {
    id: 'vigorous',
    name: 'Vigorous',
    description: 'Hard effort, difficult to maintain conversation',
    color: '#ef4444',
    heartRateZone: '70-85%'
  },
  MAXIMUM: {
    id: 'maximum',
    name: 'Maximum',
    description: 'All-out effort, cannot maintain conversation',
    color: '#dc2626',
    heartRateZone: '85-100%'
  }
};

const MUSCLE_GROUPS = {
  CHEST: { id: 'chest', name: 'Chest', icon: '💪' },
  BACK: { id: 'back', name: 'Back', icon: '🔄' },
  SHOULDERS: { id: 'shoulders', name: 'Shoulders', icon: '🤷' },
  BICEPS: { id: 'biceps', name: 'Biceps', icon: '💪' },
  TRICEPS: { id: 'triceps', name: 'Triceps', icon: '💪' },
  CORE: { id: 'core', name: 'Core/Abs', icon: '⚡' },
  QUADRICEPS: { id: 'quadriceps', name: 'Quadriceps', icon: '🦵' },
  HAMSTRINGS: { id: 'hamstrings', name: 'Hamstrings', icon: '🦵' },
  GLUTES: { id: 'glutes', name: 'Glutes', icon: '🍑' },
  CALVES: { id: 'calves', name: 'Calves', icon: '🦵' },
  FULL_BODY: { id: 'full_body', name: 'Full Body', icon: '🏃' }
};

const EQUIPMENT_TYPES = {
  NONE: { id: 'none', name: 'No Equipment', icon: '🙅‍♂️' },
  DUMBBELLS: { id: 'dumbbells', name: 'Dumbbells', icon: '🏋️‍♂️' },
  BARBELL: { id: 'barbell', name: 'Barbell', icon: '🏋️‍♀️' },
  KETTLEBELL: { id: 'kettlebell', name: 'Kettlebell', icon: '⚖️' },
  RESISTANCE_BANDS: { id: 'resistance_bands', name: 'Resistance Bands', icon: '🔗' },
  MACHINES: { id: 'machines', name: 'Machines', icon: '🏭' },
  CARDIO_EQUIPMENT: { id: 'cardio_equipment', name: 'Cardio Equipment', icon: '🚴‍♂️' },
  SUSPENSION: { id: 'suspension', name: 'Suspension Trainer', icon: '🔗' },
  MEDICINE_BALL: { id: 'medicine_ball', name: 'Medicine Ball', icon: '⚽' },
  STABILITY_BALL: { id: 'stability_ball', name: 'Stability Ball', icon: '🏀' }
};

const ExerciseTypeHelper = {
  getMainCategories() {
    return Object.values(EXERCISE_TYPES);
  },

  getSubcategories(mainCategoryId) {
    const category = EXERCISE_TYPES[mainCategoryId.toUpperCase()];
    return category ? Object.values(category.subcategories) : [];
  },

  getCategoryById(categoryId) {
    for (const [key, category] of Object.entries(EXERCISE_TYPES)) {
      if (category.id === categoryId) {
        return category;
      }
      for (const [subKey, subcategory] of Object.entries(category.subcategories || {})) {
        if (subcategory.id === categoryId) {
          return { ...subcategory, parentCategory: category };
        }
      }
    }
    return null;
  },

  getPopularExercises(categoryId) {
    const category = this.getCategoryById(categoryId);
    return category?.examples || [];
  },

  searchExercises(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();

    for (const [key, category] of Object.entries(EXERCISE_TYPES)) {
      if (category.name.toLowerCase().includes(searchTerm) ||
          category.description.toLowerCase().includes(searchTerm)) {
        results.push({ type: 'category', data: category });
      }

      for (const [subKey, subcategory] of Object.entries(category.subcategories || {})) {
        if (subcategory.name.toLowerCase().includes(searchTerm) ||
            subcategory.description.toLowerCase().includes(searchTerm)) {
          results.push({ 
            type: 'subcategory', 
            data: { ...subcategory, parentCategory: category }
          });
        }

        if (subcategory.examples) {
          const matchingExercises = subcategory.examples.filter(exercise =>
            exercise.toLowerCase().includes(searchTerm)
          );
          if (matchingExercises.length > 0) {
            results.push({
              type: 'exercises',
              data: {
                category: subcategory,
                parentCategory: category,
                exercises: matchingExercises
              }
            });
          }
        }
      }
    }

    return results;
  },

  getProgressionTips(categoryId) {
    const progressions = {
      bodyweight: [
        "Start with easier variations (wall push-ups → knee push-ups → full push-ups)",
        "Increase repetitions gradually",
        "Add isometric holds",
        "Progress to single-limb variations"
      ],
      free_weights: [
        "Begin with lighter weights to master form",
        "Increase weight by 2.5-5% when you can complete all sets with good form",
        "Focus on compound movements first",
        "Add isolation exercises for weak points"
      ],
      cardio: [
        "Start with shorter durations at comfortable intensity",
        "Gradually increase duration before intensity",
        "Follow the 10% rule (increase weekly volume by max 10%)",
        "Include rest days for recovery"
      ],
      hiit: [
        "Begin with longer rest periods",
        "Start with 15-20 minute sessions",
        "Gradually decrease rest time",
        "Limit HIIT to 2-3 sessions per week"
      ]
    };

    return progressions[categoryId] || [
      "Start with basic variations",
      "Focus on proper form",
      "Progress gradually",
      "Listen to your body"
    ];
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EXERCISE_TYPES,
    INTENSITY_LEVELS,
    MUSCLE_GROUPS,
    EQUIPMENT_TYPES,
    ExerciseTypeHelper
  };
}

if (typeof window !== 'undefined') {
  window.ExerciseDatabase = {
    EXERCISE_TYPES,
    INTENSITY_LEVELS,
    MUSCLE_GROUPS,
    EQUIPMENT_TYPES,
    ExerciseTypeHelper
  };
}