const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/regrade_lms';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB at', MONGO_URI);
    seedDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Helper for IDs
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ────────────────────────────────────────────────────────
// SCHEMAS & MODELS
// ────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor'], required: true },
  email: { type: String, required: true },
  avatar: { type: String, required: true },
  password: { type: String, required: true }
});

const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  maxScore: { type: Number, required: true },
  course: { type: String, required: true },
  publishedAt: { type: Date, required: true },
  instructorId: { type: String, required: true }
});

const GradeSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  assignmentId: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true }
});
GradeSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

const RequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  assignmentId: { type: String, required: true },
  originalGrade: { type: Number, required: true },
  claimedGrade: { type: Number, required: true },
  reason: { type: String, required: true },
  reasonDetail: { type: String, required: true },
  evidenceType: { type: String, enum: ['text', 'url'], required: true },
  evidence: { type: String, required: true },
  status: { type: String, enum: ['Submitted', 'Under Review', 'Accepted', 'Rejected', 'Closed'], default: 'Submitted' },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  reopenCount: { type: Number, default: 0 },
  finalGrade: { type: Number, default: null }
});

const DecisionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  requestId: { type: String, required: true },
  instructorId: { type: String, required: true },
  decision: { type: String, enum: ['Accepted', 'Rejected'], required: true },
  justification: { type: String, required: true },
  revisedGrade: { type: Number, default: null },
  decidedAt: { type: Date, default: Date.now }
});

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  requestId: { type: String, required: true },
  actorId: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  fromState: { type: String, default: null },
  toState: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  requestId: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Grade = mongoose.model('Grade', GradeSchema);
const RegradeRequest = mongoose.model('RegradeRequest', RequestSchema);
const Decision = mongoose.model('Decision', DecisionSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// ────────────────────────────────────────────────────────
// DATABASE SEEDING
// ────────────────────────────────────────────────────────

const daysAgo = (d) => new Date(Date.now() - d * 86400000);

const SEED_DATA = {
  users: [
    { id: 'u1', name: 'Anirudh Bhatt', role: 'student', email: 'anirudh@upes.edu', avatar: 'AB', password: 'password123' },
    { id: 'u2', name: 'Himanshu Kadyan', role: 'student', email: 'himanshu@upes.edu', avatar: 'HK', password: 'password123' },
    { id: 'u3', name: 'Yashasvi Dutt Sharma', role: 'student', email: 'yashasvi@upes.edu', avatar: 'YS', password: 'password123' },
    { id: 'u4', name: 'Raygun Jose', role: 'instructor', email: 'raygun.jose@upes.edu', avatar: 'RJ', password: 'password123' }
  ],
  assignments: [
    { id: 'a1', title: 'Midterm Exam', description: 'Chapters 1–6 comprehensive assessment', maxScore: 100, course: 'CS301 — Data Structures', publishedAt: daysAgo(10), instructorId: 'u4' },
    { id: 'a2', title: 'Final Project', description: 'End-to-end application development project', maxScore: 150, course: 'CS301 — Data Structures', publishedAt: daysAgo(5), instructorId: 'u4' },
    { id: 'a3', title: 'Lab Report 3', description: 'Binary search trees implementation + analysis', maxScore: 50, course: 'CS301 — Data Structures', publishedAt: daysAgo(8), instructorId: 'u4' }
  ],
  grades: [
    { studentId: 'u1', assignmentId: 'a1', score: 72, maxScore: 100 },
    { studentId: 'u1', assignmentId: 'a2', score: 118, maxScore: 150 },
    { studentId: 'u1', assignmentId: 'a3', score: 38, maxScore: 50 },
    { studentId: 'u2', assignmentId: 'a1', score: 85, maxScore: 100 },
    { studentId: 'u2', assignmentId: 'a2', score: 130, maxScore: 150 },
    { studentId: 'u2', assignmentId: 'a3', score: 42, maxScore: 50 },
    { studentId: 'u3', assignmentId: 'a1', score: 64, maxScore: 100 },
    { studentId: 'u3', assignmentId: 'a2', score: 95, maxScore: 150 },
    { studentId: 'u3', assignmentId: 'a3', score: 35, maxScore: 50 }
  ],
  requests: [
    { id: 'rr1', studentId: 'u1', assignmentId: 'a1', originalGrade: 72, claimedGrade: 85, reason: 'calculation_error', reasonDetail: 'Question 3 partial credit was not awarded. I showed all work for parts (a) and (b) but only received credit for (a). The merge sort derivation on page 4 is complete.', evidenceType: 'text', evidence: 'In my answer for Q3(b), I correctly applied the merge sort algorithm and showed O(n log n) time complexity with the full derivation on page 4 of my exam booklet. The recurrence T(n)=2T(n/2)+O(n) was solved correctly.', status: 'Accepted', submittedAt: daysAgo(5), updatedAt: daysAgo(2), reopenCount: 0, finalGrade: 85 },
    { id: 'rr2', studentId: 'u2', assignmentId: 'a1', originalGrade: 85, claimedGrade: 92, reason: 'rubric_mismatch', reasonDetail: 'My answer for Q5 matches the expected output per the rubric but was marked incorrect.', evidenceType: 'url', evidence: 'https://docs.google.com/document/d/example', status: 'Rejected', submittedAt: daysAgo(6), updatedAt: daysAgo(3), reopenCount: 0, finalGrade: null },
    { id: 'rr3', studentId: 'u3', assignmentId: 'a1', originalGrade: 64, claimedGrade: 75, reason: 'missing_credit', reasonDetail: 'Several bonus questions on algorithmic optimization were not counted in my final total score.', evidenceType: 'text', evidence: 'The rubric mentioned 5 bonus points for the algorithm optimization section. My answer on page 6 shows a valid time-space tradeoff using memoization that reduces complexity from O(2^n) to O(n). This was not awarded.', status: 'Under Review', submittedAt: daysAgo(1), updatedAt: daysAgo(1), reopenCount: 0, finalGrade: null },
    { id: 'rr4', studentId: 'u1', assignmentId: 'a3', originalGrade: 38, claimedGrade: 45, reason: 'grading_error', reasonDetail: 'Test case 4 passes on my local environment. The autograder may have had a configuration issue with the null-pointer edge case.', evidenceType: 'text', evidence: 'My implementation handles null nodes correctly. The BST traversal function returns -1 for empty trees as specified in the requirements. I suspect the autograder was using a different version of the test suite.', status: 'Submitted', submittedAt: daysAgo(0.3), updatedAt: daysAgo(0.3), reopenCount: 0, finalGrade: null },
    { id: 'rr5', studentId: 'u2', assignmentId: 'a3', originalGrade: 42, claimedGrade: 48, reason: 'calculation_error', reasonDetail: 'The time complexity analysis for AVL tree rotations in Task 2 was marked wrong, but my derivation is correct.', evidenceType: 'url', evidence: 'https://en.wikipedia.org/wiki/AVL_tree#Rotations', status: 'Closed', submittedAt: daysAgo(8), updatedAt: daysAgo(4), reopenCount: 0, finalGrade: 48 }
  ],
  decisions: [
    { id: 'dec1', requestId: 'rr1', instructorId: 'u4', decision: 'Accepted', justification: 'After reviewing the physical exam booklet, I confirmed that Question 3(b) was graded incorrectly. The student demonstrated the correct merge sort derivation with proper recurrence relation on page 4. Full credit deserved. Grade revised from 72 to 85.', revisedGrade: 85, decidedAt: daysAgo(2) },
    { id: 'dec2', requestId: 'rr2', instructorId: 'u4', decision: 'Rejected', justification: 'Upon careful review of Question 5, the student\'s answer did not satisfy all three test cases in the rubric — specifically test case 2 involving cyclic inputs. The linked document does not address this case. Original grade of 85 stands.', revisedGrade: null, decidedAt: daysAgo(3) },
    { id: 'dec3', requestId: 'rr5', instructorId: 'u4', decision: 'Accepted', justification: 'The complexity analysis for AVL rotations was graded too strictly. The student\'s approach using amortized analysis is a valid alternative derivation. Grade revised from 42 to 48.', revisedGrade: 48, decidedAt: daysAgo(4) }
  ],
  audit: [
    { id: 'aud_1', requestId: 'rr1', actorId: 'u1', actorRole: 'student', action: 'SUBMITTED', fromState: null, toState: 'Submitted', metadata: {}, timestamp: daysAgo(5) },
    { id: 'aud_2', requestId: 'rr1', actorId: 'u4', actorRole: 'instructor', action: 'STATUS_CHANGED', fromState: 'Submitted', toState: 'Under Review', metadata: {}, timestamp: daysAgo(4.5) },
    { id: 'aud_3', requestId: 'rr1', actorId: 'u4', actorRole: 'instructor', action: 'DECISION_MADE', fromState: 'Under Review', toState: 'Accepted', metadata: { decision: 'Accepted', revisedGrade: 85 }, timestamp: daysAgo(2) },
    { id: 'aud_4', requestId: 'rr2', actorId: 'u2', actorRole: 'student', action: 'SUBMITTED', fromState: null, toState: 'Submitted', metadata: {}, timestamp: daysAgo(6) },
    { id: 'aud_5', requestId: 'rr2', actorId: 'u4', actorRole: 'instructor', action: 'STATUS_CHANGED', fromState: 'Submitted', toState: 'Under Review', metadata: {}, timestamp: daysAgo(5.5) },
    { id: 'aud_6', requestId: 'rr2', actorId: 'u4', actorRole: 'instructor', action: 'DECISION_MADE', fromState: 'Under Review', toState: 'Rejected', metadata: { decision: 'Rejected' }, timestamp: daysAgo(3) },
    { id: 'aud_7', requestId: 'rr3', actorId: 'u3', actorRole: 'student', action: 'SUBMITTED', fromState: null, toState: 'Submitted', metadata: {}, timestamp: daysAgo(1) },
    { id: 'aud_8', requestId: 'rr3', actorId: 'u4', actorRole: 'instructor', action: 'STATUS_CHANGED', fromState: 'Submitted', toState: 'Under Review', metadata: {}, timestamp: daysAgo(0.8) },
    { id: 'aud_9', requestId: 'rr4', actorId: 'u1', actorRole: 'student', action: 'SUBMITTED', fromState: null, toState: 'Submitted', metadata: {}, timestamp: daysAgo(0.3) },
    { id: 'aud_10', requestId: 'rr5', actorId: 'u2', actorRole: 'student', action: 'SUBMITTED', fromState: null, toState: 'Submitted', metadata: {}, timestamp: daysAgo(8) },
    { id: 'aud_11', requestId: 'rr5', actorId: 'u4', actorRole: 'instructor', action: 'STATUS_CHANGED', fromState: 'Submitted', toState: 'Under Review', metadata: {}, timestamp: daysAgo(7) },
    { id: 'aud_12', requestId: 'rr5', actorId: 'u4', actorRole: 'instructor', action: 'DECISION_MADE', fromState: 'Under Review', toState: 'Accepted', metadata: { decision: 'Accepted', revisedGrade: 48 }, timestamp: daysAgo(4) },
    { id: 'aud_13', requestId: 'rr5', actorId: 'u4', actorRole: 'instructor', action: 'CLOSED', fromState: 'Accepted', toState: 'Closed', metadata: {}, timestamp: daysAgo(4) }
  ],
  notifications: [
    { id: 'not_1', userId: 'u1', type: 'success', message: 'Your regrade request for Midterm Exam has been accepted! Grade updated to 85/100.', requestId: 'rr1', read: false, createdAt: daysAgo(2) },
    { id: 'not_2', userId: 'u2', type: 'warning', message: 'Your regrade request for Midterm Exam has been reviewed and rejected. See decision details for full justification.', requestId: 'rr2', read: true, createdAt: daysAgo(3) },
    { id: 'not_3', userId: 'u4', type: 'info', message: 'New regrade request submitted by Yashasvi Dutt Sharma for Midterm Exam.', requestId: 'rr3', read: false, createdAt: daysAgo(1) },
    { id: 'not_4', userId: 'u4', type: 'info', message: 'New regrade request submitted by Anirudh Bhatt for Lab Report 3.', requestId: 'rr4', read: false, createdAt: daysAgo(0.3) },
    { id: 'not_5', userId: 'u3', type: 'info', message: 'Your regrade request for Midterm Exam is now under review by the instructor.', requestId: 'rr3', read: false, createdAt: daysAgo(0.8) }
  ]
};

async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already populated. Skipping seed.');
      return;
    }

    console.log('Database empty. Running seed script...');
    await User.insertMany(SEED_DATA.users);
    await Assignment.insertMany(SEED_DATA.assignments);
    await Grade.insertMany(SEED_DATA.grades);
    await RegradeRequest.insertMany(SEED_DATA.requests);
    await Decision.insertMany(SEED_DATA.decisions);
    await AuditLog.insertMany(SEED_DATA.audit);
    await Notification.insertMany(SEED_DATA.notifications);
    console.log('Database successfully seeded!');
  } catch (error) {
    console.error('Seeding database failed:', error);
  }
}

// Reset Database API Helper
async function clearAndSeedDatabase() {
  try {
    await User.deleteMany({});
    await Assignment.deleteMany({});
    await Grade.deleteMany({});
    await RegradeRequest.deleteMany({});
    await Decision.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});
    console.log('Collections cleared.');

    await User.insertMany(SEED_DATA.users);
    await Assignment.insertMany(SEED_DATA.assignments);
    await Grade.insertMany(SEED_DATA.grades);
    await RegradeRequest.insertMany(SEED_DATA.requests);
    await Decision.insertMany(SEED_DATA.decisions);
    await AuditLog.insertMany(SEED_DATA.audit);
    await Notification.insertMany(SEED_DATA.notifications);
    console.log('Database re-seeded successfully.');
  } catch (err) {
    console.error('Resetting database failed:', err);
    throw err;
  }
}

// ────────────────────────────────────────────────────────
// API ROUTES
// ────────────────────────────────────────────────────────

// Reset / Seed Database
app.post('/api/reset', async (req, res) => {
  try {
    await clearAndSeedDatabase();
    res.json({ success: true, message: 'Database reset and seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database reset failed: ' + err.message });
  }
});

// Users APIs
app.get('/api/users', async (req, res) => {
  try {
    const list = await User.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const item = await User.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'User not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, name, role, email, avatar, password } = req.body;
    const existing = await User.findOne({
      $or: [{ id }, { email }]
    });
    if (existing) {
      return res.status(400).json({ error: 'A user with this ID or Email already exists.' });
    }

    const newUser = new User({
      id,
      name,
      role,
      email,
      avatar: avatar || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      password
    });
    await newUser.save();

    if (role === 'student') {
      const assignments = await Assignment.find({});
      const grades = assignments.map(a => ({
        studentId: id,
        assignmentId: a.id,
        score: Math.round(a.maxScore * 0.7),
        maxScore: a.maxScore
      }));
      if (grades.length > 0) {
        await Grade.insertMany(grades);
      }
    }

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { loginId, password, isGoogle } = req.body;
    const user = await User.findOne({
      $or: [{ id: loginId }, { email: loginId }]
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid user ID or Email.' });
    }
    if (!isGoogle && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assignments APIs
app.get('/api/assignments', async (req, res) => {
  try {
    const list = await Assignment.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments', async (req, res) => {
  try {
    const { id, title, description, maxScore, course, instructorId } = req.body;
    const newAsgn = new Assignment({
      id: id || uid('a'),
      title,
      description: description || '',
      maxScore,
      course,
      instructorId,
      publishedAt: new Date()
    });
    await newAsgn.save();

    const students = await User.find({ role: 'student' });
    const grades = students.map(s => ({
      studentId: s.id,
      assignmentId: newAsgn.id,
      score: Math.round(maxScore * 0.8),
      maxScore
    }));
    if (grades.length > 0) {
      await Grade.insertMany(grades);
    }

    res.status(201).json(newAsgn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grades APIs
app.get('/api/grades/:studentId', async (req, res) => {
  try {
    const list = await Grade.find({ studentId: req.params.studentId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regrade Requests APIs
app.get('/api/requests', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const list = await RegradeRequest.find(filter).sort({ submittedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const item = await RegradeRequest.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Request not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { studentId, assignmentId, originalGrade, claimedGrade, reason, reasonDetail, evidenceType, evidence } = req.body;

    // Duplicate active request guard
    const active = await RegradeRequest.findOne({
      studentId,
      assignmentId,
      status: { $ne: 'Closed' }
    });
    if (active) {
      return res.status(400).json({ error: 'An active regrade request already exists for this assignment. Only one request is allowed per assignment at a time.' });
    }

    const reqId = uid('rr');
    const newReq = new RegradeRequest({
      id: reqId,
      studentId,
      assignmentId,
      originalGrade,
      claimedGrade,
      reason,
      reasonDetail,
      evidenceType,
      evidence,
      status: 'Submitted',
      submittedAt: new Date(),
      updatedAt: new Date(),
      reopenCount: 0
    });

    await newReq.save();
    res.status(201).json(newReq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update request status + logs status change audit log
app.post('/api/requests/:id/status', async (req, res) => {
  try {
    const { status, actorId, actorRole } = req.body;
    const item = await RegradeRequest.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Request not found' });

    const fromState = item.status;
    item.status = status;
    item.updatedAt = new Date();
    await item.save();

    // Log status change audit
    const newLog = new AuditLog({
      id: uid('aud'),
      requestId: item.id,
      actorId,
      actorRole,
      action: 'STATUS_CHANGED',
      fromState,
      toState: status,
      metadata: {},
      timestamp: new Date()
    });
    await newLog.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reopen request (1x reopen limit check) + logs reopen audit log
app.post('/api/requests/:id/reopen', async (req, res) => {
  try {
    const { studentId } = req.body;
    const item = await RegradeRequest.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Request not found' });

    if (item.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (item.status !== 'Rejected') {
      return res.status(400).json({ error: 'Only Rejected requests can be reopened.' });
    }
    if (item.reopenCount >= 1) {
      return res.status(400).json({ error: 'Reopen limit reached. Each request may only be reopened once.' });
    }

    const fromState = item.status;
    item.status = 'Submitted';
    item.reopenCount += 1;
    item.updatedAt = new Date();
    await item.save();

    // Log Reopened audit
    const newLog = new AuditLog({
      id: uid('aud'),
      requestId: item.id,
      actorId: studentId,
      actorRole: 'student',
      action: 'REOPENED',
      fromState,
      toState: 'Submitted',
      metadata: {},
      timestamp: new Date()
    });
    await newLog.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decisions APIs
app.get('/api/decisions', async (req, res) => {
  try {
    const filter = {};
    if (req.query.requestId) {
      filter.requestId = req.query.requestId;
    }
    const list = await Decision.find(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decisions APIs (Submit decision, update request state, update student grade, log decision audit)
app.post('/api/decisions', async (req, res) => {
  try {
    const { requestId, instructorId, decision, justification, revisedGrade } = req.body;

    if (!justification || justification.trim().length < 20) {
      return res.status(400).json({ error: 'Justification must be at least 20 characters.' });
    }

    const request = await RegradeRequest.findOne({ id: requestId });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const decId = uid('dec');
    const newDec = new Decision({
      id: decId,
      requestId,
      instructorId,
      decision,
      justification: justification.trim(),
      revisedGrade: decision === 'Accepted' ? (revisedGrade || null) : null,
      decidedAt: new Date()
    });
    await newDec.save();

    // Update request state
    const fromState = request.status;
    request.status = decision;
    request.updatedAt = new Date();
    if (decision === 'Accepted') {
      request.finalGrade = revisedGrade || null;

      // Update student grade in gradebook
      await Grade.findOneAndUpdate(
        { studentId: request.studentId, assignmentId: request.assignmentId },
        { score: revisedGrade }
      );
    }
    await request.save();

    // Log decision audit entry
    const newLog = new AuditLog({
      id: uid('aud'),
      requestId,
      actorId: instructorId,
      actorRole: 'instructor',
      action: 'DECISION_MADE',
      fromState,
      toState: decision,
      metadata: { decision, revisedGrade: decision === 'Accepted' ? (revisedGrade || null) : null },
      timestamp: new Date()
    });
    await newLog.save();

    res.status(201).json(newDec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Log APIs
app.post('/api/audit', async (req, res) => {
  try {
    const { requestId, actorId, actorRole, action, fromState, toState, metadata } = req.body;
    const newLog = new AuditLog({
      id: uid('aud'),
      requestId,
      actorId,
      actorRole,
      action,
      fromState: fromState || null,
      toState: toState || null,
      metadata: metadata || {},
      timestamp: new Date()
    });
    await newLog.save();
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit', async (req, res) => {
  try {
    const filter = {};
    if (req.query.requestId) {
      filter.requestId = req.query.requestId;
    }
    const list = await AuditLog.find(filter).sort({ timestamp: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications APIs
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { userId, type, message, requestId } = req.body;
    const newNotif = new Notification({
      id: uid('not'),
      userId,
      type,
      message,
      requestId: requestId || null,
      read: false,
      createdAt: new Date()
    });
    await newNotif.save();
    res.status(201).json(newNotif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const item = await Notification.findOneAndUpdate(
      { id: req.params.id },
      { read: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    await Notification.updateMany({ userId }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
