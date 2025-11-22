const User = require('../../schemas/user');
const bcrypt = require('bcryptjs');

async function createAdminUserForBoutique(boutique, password = 'helvos') {
  try {
    // Use boutique name as email
    const email = (boutique.boutiqueName || 'admin').toLowerCase();

    // Generate a default password (you can change this later)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role: 'admin',
      boutiqueId: boutique._id,
    });

    user.permissions.boutiques.create = true;
    user.permissions.boutiques.update = true;
    user.permissions.boutiques.delete = true;
    user.permissions.navigation.admin_dashboard = true;
    user.permissions.navigation.global_dashboard = true;

    const newUser = await user.save();
    console.log(`> Admin user created for boutique ${boutique.boutiqueName}: ${email}`);
    return newUser;
  } catch (err) {
    console.error('> Error creating admin user for boutique:', err);
    throw err;
  }
}

module.exports = { createAdminUserForBoutique };
