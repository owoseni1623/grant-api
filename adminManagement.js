require('dotenv').config();
const mongoose = require('mongoose');
const { createAdminUser, listAdminUsers } = require('./src/controllers/adminController');
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
    showMainMenu();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Main menu
async function showMainMenu() {
  console.log('\n===== ADMIN USER MANAGEMENT =====');
  console.log('1. Create new admin user');
  console.log('2. List existing admin users');
  console.log('3. Exit');
  
  const choice = await question('\nSelect an option (1-3): ');
  
  switch (choice) {
    case '1':
      await createNewAdmin();
      break;
    case '2':
      await listAdmins();
      break;
    case '3':
      console.log('Exiting...');
      mongoose.connection.close();
      process.exit(0);
      break;
    default:
      console.log('Invalid option. Please try again.');
      await showMainMenu();
  }
}

// Create new admin
async function createNewAdmin() {
  try {
    console.log('\n=== CREATE NEW ADMIN USER ===\n');
    
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
    }
    
    await showMainMenu();
  } catch (error) {
    console.error('Error during admin creation:', error);
    await showMainMenu();
  }
}

// List existing admins
async function listAdmins() {
  try {
    console.log('\n=== EXISTING ADMIN USERS ===');
    
    const result = await listAdminUsers();
    
    if (result.success) {
      console.log(`\nTotal Admins: ${result.adminCount} / ${result.maxAdmins} (maximum)\n`);
      
      if (result.adminCount === 0) {
        console.log('No admin users found. You can create one from the main menu.');
      } else {
        console.log('Admin Users:');
        result.admins.forEach((admin, index) => {
          console.log(`\n${index + 1}. ${admin.firstName} ${admin.lastName}`);
          console.log(`   Email: ${admin.email}`);
          console.log(`   Created: ${new Date(admin.createdAt).toLocaleString()}`);
        });
      }
    } else {
      console.log('\n❌ Failed to list admin users:');
      console.log(result.message);
    }
    
    await showMainMenu();
  } catch (error) {
    console.error('Error listing admins:', error);
    await showMainMenu();
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