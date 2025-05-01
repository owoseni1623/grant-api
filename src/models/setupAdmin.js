require('dotenv').config();
const mongoose = require('mongoose');
const { createAdminUser } = require('./controllers/adminController');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    setupAdmin();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Ask for admin details
async function setupAdmin() {
  try {
    console.log('\n=== ADMIN USER SETUP ===\n');
    
    const firstName = await question('Enter admin first name: ');
    const lastName = await question('Enter admin last name: ');
    const email = await question('Enter admin email (will be used as username): ');
    const phone = await question('Enter admin phone number: ');
    const password = await question('Enter admin password (min 8 chars, uppercase, lowercase, number): ');
    
    console.log('\nCreating admin user...');
    
    const result = await createAdminUser({
      firstName,
      lastName,
      email,
      phone,
      password
    });
    
    if (result.success) {
      console.log('\n✅ Admin user created successfully!');
      console.log('Admin Details:');
      console.log(`- Name: ${firstName} ${lastName}`);
      console.log(`- Email: ${email}`);
      console.log('\nYou can now login to the admin panel using these credentials.');
    } else {
      console.log('\n❌ Failed to create admin user:');
      console.log(result.message);
      if (result.message === 'Admin user already exists') {
        console.log('\nIf you need to reset the admin password, use the database tools directly.');
      }
    }
    
    // Close connection and exit
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during admin setup:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Helper function to prompt for input
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}