// migration-script.js
// Run this script to migrate existing workouts to be user-specific

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Workout = require('./models/Workout');

console.log('🔄 Starting user association migration...');

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/workout";

async function runMigration() {
    try {
        console.log('📶 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Check if there are any existing workouts without user association
        const workoutsWithoutUser = await Workout.countDocuments({
            $or: [
                { userId: { $exists: false } },
                { userEmail: { $exists: false } },
                { userId: null },
                { userEmail: null }
            ]
        });

        console.log(`📊 Found ${workoutsWithoutUser} workouts without user association`);

        if (workoutsWithoutUser === 0) {
            console.log('✅ No migration needed - all workouts already have user association');
            return;
        }

        // Get the first user to assign orphaned workouts to
        const firstUser = await User.findOne().sort({ createdAt: 1 });
        
        if (!firstUser) {
            console.log('❌ No users found in database. Please create a user account first.');
            console.log('💡 Suggestion: Go to the app and sign up/login, then run this migration again.');
            return;
        }

        console.log(`👤 Assigning orphaned workouts to user: ${firstUser.email}`);

        // Update workouts without user association
        const updateResult = await Workout.updateMany(
            {
                $or: [
                    { userId: { $exists: false } },
                    { userEmail: { $exists: false } },
                    { userId: null },
                    { userEmail: null }
                ]
            },
            {
                $set: {
                    userId: firstUser._id,
                    userEmail: firstUser.email.toLowerCase()
                }
            }
        );

        console.log(`✅ Migration completed successfully!`);
        console.log(`📊 Updated ${updateResult.modifiedCount} workouts`);
        console.log(`👤 All workouts now associated with: ${firstUser.email}`);

        // Verify migration
        const remainingOrphaned = await Workout.countDocuments({
            $or: [
                { userId: { $exists: false } },
                { userEmail: { $exists: false } },
                { userId: null },
                { userEmail: null }
            ]
        });

        if (remainingOrphaned === 0) {
            console.log('🎉 Migration verification passed - all workouts now have user association');
        } else {
            console.log(`⚠️ Warning: ${remainingOrphaned} workouts still without user association`);
        }

        // Show summary
        const totalWorkouts = await Workout.countDocuments();
        const workoutsByUser = await Workout.aggregate([
            {
                $group: {
                    _id: '$userEmail',
                    count: { $sum: 1 },
                    userId: { $first: '$userId' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        console.log('\n📊 Migration Summary:');
        console.log(`Total workouts: ${totalWorkouts}`);
        console.log('Workouts by user:');
        workoutsByUser.forEach(user => {
            console.log(`  ${user._id}: ${user.count} workouts`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('📶 Disconnected from MongoDB');
    }
}

// Alternative migration for multiple users
async function runAdvancedMigration() {
    try {
        console.log('📶 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find().sort({ createdAt: 1 });
        
        if (users.length === 0) {
            console.log('❌ No users found in database. Please create user accounts first.');
            return;
        }

        console.log(`👥 Found ${users.length} users`);

        // Get workouts without user association
        const orphanedWorkouts = await Workout.find({
            $or: [
                { userId: { $exists: false } },
                { userEmail: { $exists: false } },
                { userId: null },
                { userEmail: null }
            ]
        }).sort({ createdAt: 1 });

        if (orphanedWorkouts.length === 0) {
            console.log('✅ No orphaned workouts found');
            return;
        }

        console.log(`🏋️ Found ${orphanedWorkouts.length} orphaned workouts`);

        // Distribute workouts among users (or assign all to first user)
        console.log('\nChoose migration strategy:');
        console.log('1. Assign all workouts to first user (recommended)');
        console.log('2. Distribute workouts among all users');
        
        // For this script, we'll assign all to first user (safest option)
        const targetUser = users[0];
        console.log(`\n👤 Assigning all orphaned workouts to: ${targetUser.email}`);

        let updatedCount = 0;
        for (const workout of orphanedWorkouts) {
            workout.userId = targetUser._id;
            workout.userEmail = targetUser.email.toLowerCase();
            await workout.save();
            updatedCount++;
            
            if (updatedCount % 10 === 0) {
                console.log(`📊 Progress: ${updatedCount}/${orphanedWorkouts.length} workouts updated`);
            }
        }

        console.log(`✅ Successfully updated ${updatedCount} workouts`);

    } catch (error) {
        console.error('❌ Advanced migration failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('📶 Disconnected from MongoDB');
    }
}

// Run the migration
if (require.main === module) {
    console.log('🚀 FitTrack User Association Migration');
    console.log('=====================================\n');
    
    const args = process.argv.slice(2);
    const migrationMode = args[0] || 'basic';
    
    if (migrationMode === 'advanced') {
        console.log('🔧 Running advanced migration...\n');
        runAdvancedMigration()
            .then(() => {
                console.log('\n🎉 Advanced migration completed successfully!');
                console.log('💡 Your app is now ready for user-specific workouts');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n❌ Advanced migration failed:', error.message);
                process.exit(1);
            });
    } else {
        console.log('🔧 Running basic migration...\n');
        runMigration()
            .then(() => {
                console.log('\n🎉 Migration completed successfully!');
                console.log('💡 Your app is now ready for user-specific workouts');
                console.log('\n📚 Next steps:');
                console.log('1. Replace your Workout model with the updated version');
                console.log('2. Replace your API routes with the user-specific version');
                console.log('3. Update your frontend API.js file');
                console.log('4. Test the application with user authentication');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n❌ Migration failed:', error.message);
                console.log('\n🔧 Troubleshooting:');
                console.log('1. Make sure MongoDB is running');
                console.log('2. Check your .env file has the correct MONGODB_URI');
                console.log('3. Ensure you have at least one user account');
                process.exit(1);
            });
    }
}