const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  try {
    const activities = await mongoose.connection.collection('items').distinct("dynamicData.activity");
    const validActivities = activities.filter(a => a && a.trim() !== "");
    console.log(`Total unique activities: ${validActivities.length}`);
    console.log("List of activities:");
    validActivities.forEach(a => console.log(`- ${a}`));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
});
