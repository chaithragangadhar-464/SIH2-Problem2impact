# Problem2Impact (SIH26043) — Full Project Structure

Stack (from your deck, slide 8): **Frontend** HTML/CSS/JS · **Backend** Node.js + Express · **Database** MongoDB · **AI Service** Python + Sentence Transformers · **Integration** REST APIs.

Three independent codebases talking over REST:

```
Browser (HTML/CSS/JS)  →  Node/Express API  →  MongoDB
                                ↓  (REST call)
                        Python AI microservice
```

---

## 1. Top-level folder tree

```
problem2impact/
├── README.md
├── .gitignore
├── docker-compose.yml
│
├── frontend/
├── backend/
├── ai-service/
└── database/
```

---

## 2. FRONTEND — `frontend/`

```
frontend/
├── index.html
├── login.html
├── register.html
├── problems.html
├── problem-detail.html
├── post-problem.html
├── explore-challenges.html
├── profile.html
├── team.html
├── submit-solution.html
├── dashboard-gov.html
├── notifications.html
├── 404.html
│
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── forms.css
│   ├── dashboard.css
│   └── responsive.css
│
├── js/
│   ├── config.js
│   ├── api.js
│   ├── auth.js
│   ├── navbar.js
│   ├── home.js
│   ├── problems.js
│   ├── explore-challenges.js
│   ├── problem-detail.js
│   ├── post-problem.js
│   ├── profile.js
│   ├── team.js
│   ├── submit-solution.js
│   ├── dashboard-gov.js
│   ├── notifications.js
│   └── utils.js
│
└── assets/
    ├── icons/
    ├── images/
    └── logo.svg
```

### What each page does

| File | Purpose |
|---|---|
| `index.html` | Landing page — what the platform is, stats (problems posted, solved, teams formed), CTA to post a problem or explore challenges |
| `login.html` / `register.html` | Register asks: name, email, password, role (citizen / student / faculty / employee / gov-ngo / industry), **skills** (multi-select/tag input), and a "willing to solve problems" toggle |
| `problems.html` | Full problem feed — search bar, category filter chips, location filter, sort (newest/most-solutions/deadline) |
| `explore-challenges.html` | Same feed pre-filtered by category, reached via the "Explore Challenges" button — category grid (Education, Healthcare, Agriculture, Transportation, Industry, etc.) |
| `problem-detail.html` | Full problem view: title, description, evidence (images/docs), location, category, expected outcome, required skills, budget (if given), list of submitted solutions, "Form/Join a Team" button, AI-suggested collaborators panel |
| `post-problem.html` | Multi-step form: (1) Title + description, (2) Evidence upload, (3) Location + category, (4) Expected outcome + skills-needed (optional, shown only if poster marks "I have domain knowledge"), (5) Budget (optional) → review → submit |
| `profile.html` | User's skills, bio, problems posted, teams joined, solutions submitted, badges/awards won |
| `team.html` | Team workspace for one problem: members, each member's skill, task board, files, discussion thread, "invite AI-matched user" button |
| `submit-solution.html` | Form: prototype link/file, approach description, cost estimate, feasibility notes, implementation plan |
| `dashboard-gov.html` | For Government/NGO/Industry accounts only: incoming problems they posted, solutions received per problem, AI-flagged defective solutions (greyed out with reason), valid solutions to compare, "Finalize & Fund" action |
| `notifications.html` | Team invites, match suggestions, solution status updates, funding approvals |

### JS module responsibilities

| File | Purpose |
|---|---|
| `config.js` | `export const API_BASE_URL = "http://localhost:5000/api";` and AI service base URL |
| `api.js` | Single `fetch` wrapper — attaches JWT from localStorage, handles JSON parsing + error toasts |
| `auth.js` | `login()`, `register()`, `logout()`, `getCurrentUser()`, route-guarding for protected pages |
| `navbar.js` | Renders shared navbar/footer into every page (avoids duplicating markup), highlights active link, shows role-based menu items (e.g., "Dashboard" only for gov/industry) |
| `post-problem.js` | Step-by-step form state, client-side validation, `FormData` upload for evidence files, conditional skills field |
| `problems.js` / `explore-challenges.js` | Fetch problems list, render cards, wire up filter/search/category chip clicks |
| `problem-detail.js` | Fetch single problem, render evidence gallery, fetch AI-matched collaborators (`/api/match/:problemId`), handle "Join/Form Team" |
| `team.js` | Create team, invite by skill match, show skill-gap ("You need someone with IoT knowledge"), task CRUD |
| `submit-solution.js` | Submit solution form, poll/display AI validation result ("defective — better luck next time" vs "sent for review") |
| `dashboard-gov.js` | List problems posted by this org, list solutions per problem with AI validity flag, finalize + award action |
| `utils.js` | `debounce()`, `showToast()`, `formatDate()`, `truncate()` |

---

## 3. BACKEND — `backend/` (Node.js + Express)

```
backend/
├── package.json
├── server.js
├── app.js
├── .env.example
│
├── config/
│   ├── db.js
│   └── env.js
│
├── models/
│   ├── User.js
│   ├── Problem.js
│   ├── Team.js
│   ├── Solution.js
│   ├── Category.js
│   └── Notification.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── problemRoutes.js
│   ├── teamRoutes.js
│   ├── solutionRoutes.js
│   ├── matchRoutes.js
│   └── adminRoutes.js
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── problemController.js
│   ├── teamController.js
│   ├── solutionController.js
│   ├── matchController.js
│   └── adminController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── uploadMiddleware.js
│   └── errorHandler.js
│
├── services/
│   ├── aiServiceClient.js
│   ├── emailService.js
│   └── notificationService.js
│
└── utils/
    ├── validators.js
    └── responseFormatter.js
```

### Key routes (REST API surface)

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/users/:id
PATCH  /api/users/:id/skills

POST   /api/problems                 (create — citizen posts a problem)
GET    /api/problems                 (list, filter by category/location/search)
GET    /api/problems/:id
GET    /api/problems/category/:cat   (Explore Challenges)

POST   /api/teams                    (create team for a problem)
POST   /api/teams/:id/invite
GET    /api/teams/:id

POST   /api/solutions                (submit solution for a problem)
GET    /api/solutions/problem/:id    (all solutions for a problem)
PATCH  /api/solutions/:id/finalize   (gov/industry approves + funds — role-protected)

GET    /api/match/:problemId         (proxies to AI service → ranked collaborator list)
POST   /api/match/validate-solution  (proxies to AI service → defect check)

GET    /api/admin/dashboard          (gov/industry only, via roleMiddleware)
```

---

## 4. AI SERVICE — `ai-service/` (Python + Sentence Transformers)

```
ai-service/
├── requirements.txt
├── main.py
├── config.py
│
├── models/
│   └── embedding_model.py
│
├── routes/
│   ├── extract_skills.py
│   ├── match_teams.py
│   ├── validate_solution.py
│   └── detect_duplicate.py
│
├── utils/
│   ├── text_cleaning.py
│   └── similarity.py
│
└── data/
    └── skills_taxonomy.json
```

| File | Purpose |
|---|---|
| `embedding_model.py` | Loads a pretrained `SentenceTransformer` (e.g. `all-MiniLM-L6-v2`) once at startup |
| `extract_skills.py` | NLP endpoint — takes problem description text, returns extracted domain + skill tags |
| `match_teams.py` | Embeds the problem + all candidate user profiles, cosine-similarity ranks them, returns top matches with % score (mirrors your "AI Match → Team AgriVision: 94%" example) |
| `validate_solution.py` | Checks a submitted solution against the problem embedding + a rubric (completeness, relevance, feasibility keywords) — flags low-similarity/incoherent submissions as defective |
| `detect_duplicate.py` | Compares a new problem's embedding against existing ones to flag likely duplicates |
| `skills_taxonomy.json` | Canonical skill list used to normalize free-text skills (e.g. "py" → "Python") |

`requirements.txt`:
```
fastapi==0.115.0
uvicorn==0.30.6
sentence-transformers==3.0.1
scikit-learn==1.5.1
numpy==1.26.4
pydantic==2.8.2
python-multipart==0.0.9
```

---

## 5. DATABASE — `database/` (MongoDB — schemas as JSON for reference)

```
database/
├── schemas/
│   ├── user.schema.json
│   ├── problem.schema.json
│   ├── team.schema.json
│   └── solution.schema.json
└── seed/
    ├── categories.seed.json
    └── skills.seed.json
```

### `user.schema.json`
```json
{
  "title": "User",
  "type": "object",
  "properties": {
    "_id": { "type": "string" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "passwordHash": { "type": "string" },
    "role": {
      "type": "string",
      "enum": ["citizen", "student", "faculty", "employee", "government", "ngo", "industry"]
    },
    "skills": {
      "type": "array",
      "items": { "type": "string" }
    },
    "availableToSolve": { "type": "boolean" },
    "university": { "type": "string", "description": "optional, for students/faculty" },
    "organization": { "type": "string", "description": "optional, for gov/ngo/industry" },
    "location": { "type": "string" },
    "profileEmbedding": {
      "type": "array",
      "items": { "type": "number" },
      "description": "vector generated by AI service from skills/bio, cached for fast matching"
    },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["name", "email", "passwordHash", "role"]
}
```

### `problem.schema.json`
```json
{
  "title": "Problem",
  "type": "object",
  "properties": {
    "_id": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "URLs/paths to uploaded images or documents"
    },
    "location": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["Education", "Healthcare", "Agriculture", "Transportation", "Industry", "Environment", "Water & Sanitation", "Other"]
    },
    "expectedOutcome": { "type": "string" },
    "skillsRequired": {
      "type": "array",
      "items": { "type": "string" },
      "description": "optional — only set if poster has domain knowledge"
    },
    "budget": { "type": "number", "description": "optional" },
    "postedBy": { "type": "string", "description": "User._id" },
    "status": {
      "type": "string",
      "enum": ["open", "in_progress", "under_review", "solved", "closed"]
    },
    "descriptionEmbedding": {
      "type": "array",
      "items": { "type": "number" }
    },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["title", "description", "location", "category", "expectedOutcome", "postedBy"]
}
```

### `team.schema.json`
```json
{
  "title": "Team",
  "type": "object",
  "properties": {
    "_id": { "type": "string" },
    "problemId": { "type": "string" },
    "name": { "type": "string" },
    "members": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "skillContribution": { "type": "string" },
          "role": { "type": "string", "enum": ["lead", "member"] }
        }
      }
    },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["problemId", "members"]
}
```

### `solution.schema.json`
```json
{
  "title": "Solution",
  "type": "object",
  "properties": {
    "_id": { "type": "string" },
    "problemId": { "type": "string" },
    "teamId": { "type": "string" },
    "approach": { "type": "string" },
    "prototypeUrl": { "type": "string" },
    "costEstimate": { "type": "number" },
    "feasibilityNotes": { "type": "string" },
    "aiValidation": {
      "type": "object",
      "properties": {
        "isValid": { "type": "boolean" },
        "similarityScore": { "type": "number" },
        "flaggedReason": { "type": "string", "description": "e.g. 'low relevance to problem statement'" }
      }
    },
    "reviewStatus": {
      "type": "string",
      "enum": ["ai_rejected", "pending_review", "finalized", "not_selected"]
    },
    "awardAmount": { "type": "number" },
    "submittedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["problemId", "teamId", "approach"]
}
```

### `seed/categories.seed.json`
```json
[
  { "name": "Education" },
  { "name": "Healthcare" },
  { "name": "Agriculture" },
  { "name": "Transportation" },
  { "name": "Industry" },
  { "name": "Environment" },
  { "name": "Water & Sanitation" },
  { "name": "Other" }
]
```

### `seed/skills.seed.json`
```json
["Python", "JavaScript", "React", "Node.js", "IoT", "Machine Learning",
 "Computer Vision", "NLP", "UI/UX Design", "Data Analysis", "Civil Engineering",
 "Public Health", "Agronomy", "Embedded Systems", "Cloud/DevOps"]
```

---

## 6. Root config files

### `backend/package.json`
```json
{
  "name": "problem2impact-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.5.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

### `backend/.env.example`
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/problem2impact
JWT_SECRET=replace_with_a_long_random_string
AI_SERVICE_URL=http://localhost:8000
```

---

## Suggested build order (matches your deck's phased plan)

1. **UI** — static HTML/CSS pages with mock data first
2. **Backend APIs** — auth, problems CRUD, teams, solutions (MongoDB wired in)
3. **AI service** — skill extraction + matching endpoint, call it from `matchRoutes.js`
4. **Solution validation AI** — plug into solution submission flow
5. **Integration + testing** — connect all three, test end to end

Want me to actually generate the starter code (real HTML/CSS/JS files, Express boilerplate, and the FastAPI AI service) instead of just the structure? I can scaffold a working skeleton next.
