# ReGrade — LMS Regrading Request Workflow
### Developer Documentation (Day 1–3 Deliverables)

ReGrade is a lightweight, pure client-side Single Page Application (SPA) designed to handle grade disputes systematically. It replaces chaotic email/DM exchanges between students and instructors with a structured, auditable, and state-governed regrading workflow.

---

## 📂 Project Architecture

```
lms-regrade/
├── index.html              # Main App Shell & Navigation Markup
├── README.md               # Developer & User Documentation
├── css/
│   ├── index.css           # Global tokens, typography, colors, Reset & utility classes
│   ├── components.css      # Reusable components (buttons, badges, toast, notifications, form inputs)
│   └── views.css           # Layouts for login, dashboard, queue, details, and tables
├── js/
│   ├── app.js              # Client-side hash-based router, navigation, & shell management
│   ├── store.js            # Mock DB (localStorage), pre-seeded data, and CRUD functions
│   ├── auth.js             # Current session (sessionStorage) & role simulation
│   ├── audit.js            # Immutable audit logger helper
│   ├── notifications.js    # In-app toast messages and notification drawer rendering
│   └── views/
│       ├── login.js        # User login simulation view
│       ├── dashboard.js    # Statistics and status summaries for students and instructors
│       ├── grade-view.js   # Grade table listing assignments with "Request Regrade" CTAs
│       ├── request-form.js # Form submission view for students and student's detail view
│       ├── queue.js        # Searchable and filterable queue of requests for instructors
│       └── review.js       # Instructor detail view with action tools and decision entry
```

---

## ⚙️ State Machine & Roles

### 1. Request States
There are 5 principal states tracked in the database `status` column, plus a reopening flag:
* **`Submitted`**: Student has filed the request.
* **`Under Review`**: Automatically changes to this state when an instructor opens the request detail view for the first time.
* **`Accepted`**: Grade revised upward by the instructor.
* **`Rejected`**: Original grade stands.
* **`Closed`**: Re-evaluation process completed.
* **`Reopened (UI Flag)`**: If a request is rejected, the student may dispute it once (1× limit). This resets the status back to `Submitted` for the instructor to review again and increments the `reopenCount` flag.

### 2. User Roles
* **Student**: Can view published grades, submit a regrade request for eligible assignments, track active requests, and reopen a rejected request.
* **Instructor**: Can view the full request queue, search/filter by status and student name, review evidence, submit final decisions with explanations, and view system-wide logs.

---

## 💾 Local Database Schema (`localStorage`)

Data is managed purely client-side through the mock DB wrapper (`js/store.js`). There are 7 localStorage tables:

### `lms_users`
```json
[
  { "id": "u1", "name": "Anirudh Bhatt", "role": "student", "email": "anirudh@upes.edu", "avatar": "AB" },
  { "id": "u2", "name": "Himanshu Kadyan", "role": "student", "email": "himanshu@upes.edu", "avatar": "HK" },
  { "id": "u3", "name": "Yashasvi Dutt Sharma", "role": "student", "email": "yashasvi@upes.edu", "avatar": "YS" },
  { "id": "u4", "name": "Raygun Jose", "role": "instructor", "email": "raygun.jose@upes.edu", "avatar": "RJ" }
]
```

### `lms_assignments`
```json
[
  {
    "id": "a1",
    "title": "Midterm Exam",
    "description": "Chapters 1–6 comprehensive assessment",
    "maxScore": 100,
    "course": "CS301 — Data Structures",
    "publishedAt": "2026-05-25T18:00:00.000Z"
  }
]
```

### `lms_grades`
```json
[
  {
    "studentId": "u1",
    "assignmentId": "a1",
    "score": 72,
    "maxScore": 100
  }
]
```

### `lms_regrade_requests`
```json
{
  "id": "req_12345",
  "studentId": "u1",
  "assignmentId": "a1",
  "originalGrade": 72,
  "claimedGrade": 85,
  "reason": "calculation_error",
  "reasonDetail": "Question 3 partial credit was not awarded...",
  "evidenceType": "text",
  "evidence": "Detailed explanation of grading criteria match...",
  "status": "Submitted",
  "submittedAt": "2026-06-03T18:00:00.000Z",
  "updatedAt": "2026-06-03T18:00:00.000Z",
  "reopenCount": 0
}
```

### `lms_decisions`
```json
{
  "id": "dec_67890",
  "requestId": "req_12345",
  "instructorId": "u4",
  "decision": "Accepted",
  "justification": "Revised after checking original submission.",
  "revisedGrade": 85,
  "decidedAt": "2026-06-03T19:00:00.000Z"
}
```

### `lms_audit_log`
```json
{
  "id": "aud_12345",
  "requestId": "req_12345",
  "actorId": "u1",
  "actorRole": "student",
  "action": "SUBMITTED",
  "fromState": null,
  "toState": "Submitted",
  "metadata": {},
  "timestamp": "2026-06-03T18:00:00.000Z"
}
```

### `lms_notifications`
```json
{
  "id": "n_12345",
  "userId": "u1",
  "type": "success",
  "message": "Your regrade request for Midterm Exam has been accepted!",
  "requestId": "req_12345",
  "read": false,
  "createdAt": "2026-06-03T19:00:00.000Z"
}
```

---

## 🚀 Core Features Implemented

### 1. Unified Router (`js/app.js`)
* Configures routing based on URL Hash (`#/dashboard`, `#/grades`, `#/queue`, etc.).
* Enforces role-based path protections (students cannot access the instructor review queue).

### 2. Request Form & Validation (`js/views/request-form.js`)
* Handles new request submission with robust client-side validation.
* Ensures explanation text is at least 30 characters.
* Implements duplicate checks to block a student from submitting multiple requests for the same assignment.

### 3. Instructor Action Controls (`js/views/review.js`)
* Auto-transitions a request from `Submitted` to `Under Review` when opened by an instructor.
* Captures decision context: accepts/rejects, logs justification (min 20 chars), and automatically updates grades if accepted.

### 4. Real-time Notification System (`js/views/notifications.js`)
* Bell icon with active badge updates.
* Toast messages for real-time state alerts.
* Interactive notification drawer to jump directly to specific requests.

---

## 🧪 Verification & Demo Walkthrough

1. **Accessing the App**: Open [http://localhost:3456](http://localhost:3456) in your browser.
2. **Student Submission Flow**:
   * Log in as **Anirudh Bhatt** (Student).
   * Navigate to **My Grades**, and click **Request Regrade** for the *Final Project*.
   * Enter a claimed grade, provide justification/evidence, and submit.
3. **Instructor Evaluation Flow**:
   * Click **Switch Role** in the bottom left, and log in as **Raygun Jose** (Instructor).
   * Check the **Request Queue** to review the newly submitted request.
   * Enter a decision and click submit. The student will be instantly notified of the resolution.
