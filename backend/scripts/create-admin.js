require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function seedAdmin() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = "pranitbijave27@gmail.com";
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    existing.role = "admin";
    existing.password = "admin123";
    await existing.save();
    console.log("✓ Updated existing user to admin:", adminEmail);
  } else {
    await User.create({
      name: "System Administrator",
      email: adminEmail,
      password: "admin123",
      role: "admin",
    });
    console.log("✓ Created new admin user:", adminEmail);
  }

  await mongoose.disconnect();
  console.log(`Done! Credentials -> ${adminEmail} / admin123`);
}

seedAdmin().catch((err) => {
  console.error("Error creating admin:", err.message);
  process.exit(1);
});
