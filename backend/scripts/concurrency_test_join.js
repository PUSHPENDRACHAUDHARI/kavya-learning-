require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Schema } = mongoose;

async function main() {
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri, { dbName: 'kavyalearn' });
  console.log('Connected for concurrency test');

  const Event = mongoose.model('Event', new Schema({}, { strict: false, collection: 'events' }));
  const Attendance = mongoose.model('Attendance', new Schema({}, { strict: false, collection: 'attendances' }));

  // Create or reset a test event
  let event = await Event.findOne({ title: 'Concurrency Test Event' }).lean();
  if (!event) {
    const created = await Event.create({ title: 'Concurrency Test Event', maxStudents: 3, joinedCount: 0 });
    event = created.toObject();
  } else {
    await Event.updateOne({ _id: event._id }, { $set: { maxStudents: 3, joinedCount: 0 } });
    event = await Event.findById(event._id).lean();
  }

  console.log('Test event id:', event._id.toString(), 'maxStudents:', event.maxStudents);

  // create 8 fake student ids
  const students = Array.from({ length: 8 }).map(() => new mongoose.Types.ObjectId());

  // worker function to attempt join using same logic as controller (transaction + allocation)
  async function tryJoin(studentId) {
    const session = await mongoose.startSession();
    try {
      let success = false;
      await session.withTransaction(async () => {
        // allocate slot atomically
        const allocated = await Event.findOneAndUpdate(
          { _id: event._id, $expr: { $lt: ['$joinedCount', '$maxStudents'] } },
          { $inc: { joinedCount: 1 } },
          { session, new: true }
        );
        if (!allocated) {
          success = false;
          return;
        }
        // insert attendance
        await Attendance.create([{ eventId: event._id, studentId, joinedAt: new Date(), status: 'present' }], { session });
        success = true;
      });
      return { studentId: studentId.toString(), success };
    } catch (e) {
      return { studentId: studentId.toString(), success: false, error: e.message };
    } finally {
      await session.endSession();
    }
  }

  // Run concurrently
  const promises = students.map(s => tryJoin(s));
  const results = await Promise.all(promises);
  console.log('Results:', results);

  // Show final joinedCount and attendance count
  const finalEvent = await Event.findById(event._id).lean();
  const attendanceCount = await Attendance.countDocuments({ eventId: event._id, joinedAt: { $ne: null } });
  console.log('Final joinedCount:', finalEvent.joinedCount, 'attendanceCount:', attendanceCount);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
