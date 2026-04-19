# frontend — Next.js Web Application

## Overview

This folder is the **user-facing web application** for XplainaV301. It is a Next.js 14 application (App Router) that provides a complete end-to-end interface for the explainable course recommendation system. Users can sign up, log in, browse all 307 courses, select courses they have taken, view AI-generated course recommendations with match scores and genre tags, and drill into detailed SHAP/LIME explanations for any recommended course.

The frontend talks exclusively to the FastAPI backend (`http://localhost:8000`). It never queries Supabase or the ML models directly.

Start the development server with:

```bash
npm run dev   # runs on http://localhost:3000
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | React framework with server/client component model |
| React | 18 | UI rendering |
| NextAuth.js | v4 | Session management (JWT strategy) |
| Tailwind CSS | v4 | Utility-first styling |
| Lucide React | latest | Icon library |
| Recharts | latest | Interactive SHAP/LIME bar charts |
| Axios | latest | HTTP client for API calls |

---

## Folder Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.jsx                  # Root layout — SessionProvider wrapper
│   │   ├── page.jsx                    # Root redirect → /login
│   │   ├── globals.css                 # Design system tokens + Tailwind
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/
│   │   │       └── route.js            # NextAuth configuration
│   │   ├── login/
│   │   │   └── page.jsx                # Login form
│   │   ├── signup/
│   │   │   └── page.jsx                # Signup form
│   │   ├── select-courses/
│   │   │   └── page.jsx                # Course picker (initial + edit mode)
│   │   └── dashboard/
│   │       ├── layout.jsx              # Dashboard layout wrapper
│   │       └── page.jsx                # Main recommendations view
│   ├── components/
│   │   ├── ExplainModal.jsx            # SHAP/LIME explanation drawer
│   │   └── Sidebar.jsx                 # (Sidebar component — available for use)
│   ├── services/
│   │   └── api.js                      # Centralised API client (Axios wrappers)
│   ├── lib/
│   │   └── supabase.js                 # Supabase browser client (for direct DB reads if needed)
│   └── providers/
│       └── (session providers)
├── .env.local                           # NEXTAUTH_SECRET + NEXTAUTH_URL
└── package.json
```

---

## Design System (`globals.css`)

The entire application uses a dark theme built with CSS custom properties, making the design consistent and easily themeable.

```css
:root {
  --background:       #000000;
  --foreground:       #EDEDED;
  --surface:          #0a0a0a;       /* Card backgrounds */
  --surface-raised:   #111111;       /* Hover states, badge backgrounds */
  --surface-overlay:  #1a1a1a;
  --border:           rgba(255,255,255,0.10);
  --border-subtle:    rgba(255,255,255,0.05);
  --brand:            #ffffff;       /* Primary action colour */
  --brand-foreground: #000000;
  --accent:           #3b82f6;       /* Blue — match % badges, links */
}
```

**Custom utilities:**
- `.text-gradient` — white-to-zinc gradient text, used on headlines.
- `.glass-panel` — frosted-glass effect (`backdrop-filter: blur(16px)`) for sticky footers and overlays.

---

## Authentication Flow (`app/api/auth/[...nextauth]/route.js`)

Authentication is handled by **NextAuth.js v4** using the `CredentialsProvider` strategy. NextAuth is used purely as a **session manager** — it does not handle authentication logic itself. All credential validation is forwarded to the FastAPI backend.

### Login flow

```
User submits form
  └─ Next.js: POST /api/auth/callback/credentials
       └─ NextAuth CredentialsProvider.authorize()
            └─ fetch("http://127.0.0.1:8000/auth/login", { identifier, password })
                 ├─ dataset user (numeric ID + "test000") → JWT with type="dataset_user"
                 └─ real user (email + password) → JWT with type="real_user"

                 ↓ on success
            return { id, name, userType, apiToken }

  └─ NextAuth JWT callback: persists id, userType, apiToken in the signed session token
  └─ NextAuth session callback: exposes id, userType, apiToken on session.user

  └─ Dashboard/other pages: read session.user.apiToken to authenticate backend calls
     read session.user.userType to choose the correct code path
```

### Key session fields after login

| Field | Value | Used for |
|---|---|---|
| `session.user.id` | Numeric string (dataset) or UUID (real) | Passed to `/recommend/{id}`, `/explain/{id}/{course}` |
| `session.user.userType` | `"dataset_user"` or `"real_user"` | Routing decisions throughout the app |
| `session.user.apiToken` | FastAPI JWT | `Authorization: Bearer <token>` on every protected request |
| `session.user.isDatasetUser` | Derived boolean | Guards dataset-user-only UI elements |

---

## Pages

### `app/login/page.jsx` — Login

- Single form with an `identifier` field (accepts numeric dataset ID or email) and a `password` field.
- Calls `signIn("credentials", { identifier, password })` from NextAuth.
- On success, NextAuth redirects to `/dashboard`.
- On failure, displays the error returned by the FastAPI backend.
- Link at the bottom routes new users to `/signup`.

---

### `app/signup/page.jsx` — Signup

- Email + password form exclusively for **real (new) users**.
- On submit, directly calls `POST http://localhost:8000/auth/signup` (bypasses NextAuth for the signup action itself).
- On 201 success, immediately calls `signIn()` to establish a session without asking the user to log in again.
- Validates: password must be ≥ 8 characters (client-side); uniqueness is enforced server-side.

---

### `app/select-courses/page.jsx` — Course Picker

This page serves two distinct roles controlled by the URL query parameter `?edit=1`:

| Mode | Trigger | Behaviour |
|---|---|---|
| **Initial setup** | Redirect from dashboard when user has 0 courses | "Build Your Profile" heading, "Continue" button |
| **Edit mode** | "Edit Courses" button on dashboard | "Edit Your Courses" heading, pre-ticked existing selections, "Save Changes" + "Cancel" buttons |

#### Features

**Full catalogue loading:**  
On mount, calls `api.getAllCourses()` which fetches all 307 courses via `GET /courses?limit=9999`. The full list is stored in component state — never paginated at the fetch level.

**Pre-population of existing selections:**  
Before loading the course list, the page fetches `GET /courses/my-courses` (authenticated) and pre-ticks all courses the user has already selected. This works identically for both initial setup (empty set) and edit mode (existing selections).

**Client-side search (searches ALL courses, not just current page):**

```javascript
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase()
  return allCourses.filter(c =>
    c.TITLE.toLowerCase().includes(q) ||
    c.COURSE_ID.toLowerCase().includes(q) ||
    c.genres?.some(g => g.toLowerCase().includes(q))
  )
}, [allCourses, query])
```

The `useMemo` runs across the full 307-course array every time the query changes. Pagination is applied **after** filtering, so searching always finds results across the entire catalogue, not just the visible page.

When the search query changes, the page automatically resets to page 1:
```javascript
useEffect(() => { setPage(1) }, [query])
```

**Pagination (12 courses per page):**

```
totalPages = ceil(filtered.length / 12)
pageCourses = filtered.slice((page-1)*12, page*12)
```

The pagination bar (rendered as a floating element above the sticky footer) shows a smart window: `1 … [p-2] [p-1] [p] [p+1] [p+2] … last`, collapsing middle sections with ellipses when the catalogue is large.

**Selection toggle:**  
Each course card is a click target. A `Set<string>` tracks selected IDs. Clicking toggles the course in/out of the set. The visual state (border highlight, checkmark, icon tint) updates instantly.

**Save:**  
On "Continue" / "Save Changes":
1. Serialises the selected set to `localStorage` (for legacy code that reads it).
2. `POST /courses/my-courses` with the full array of selected IDs (backend does a delete-then-insert).
3. Navigates to `/dashboard`.

---

### `app/dashboard/page.jsx` — Main Dashboard

The central screen. On load it fetches the user's taken courses and then immediately fetches recommendations.

#### Code paths by user type

```
userType === "dataset_user"
  └─ GET /recommend/{user_id}?top_n=10&alpha=0.5
       Uses pre-computed KNN CF predictions from models/
       Returns hybrid scores from the full trained model

userType === "real_user"
  └─ POST /recommend/dynamic { selected_courses, top_n, alpha }
       Derives CF signal at runtime via Jaccard-weighted neighbour blending
       Returns hybrid scores using identical scoring formula
```

Both paths return `List[RecommendationOut]` with identical structure, so the rendering code is the same for both user types.

#### Recommendation Card

Each card displays:
```
[#N rank badge]          [XX% Match badge]
Course Title
ID: COURSE_ID

[Genre tag] [Genre tag] [Genre tag] [+N]

[View explanation →]
```

- **Rank badge**: 1-indexed position in the top-10 list.
- **Match %**: `hybrid_score * 100`, rounded to the nearest integer.
- **Genre tags**: up to 4 shown; overflow collapsed to `+N`. Tags come directly from the `genres` field in `RecommendationOut` — populated by the backend from `final_courses.csv` genre columns.
- **View explanation**: opens the `ExplainModal` for this course.

#### Edit Courses button (real users only)

```jsx
{session?.user?.userType !== "dataset_user" && (
  <Link href="/select-courses?edit=1">
    <BookOpen /> Edit Courses
  </Link>
)}
```

Only visible for real users. Dataset users cannot modify their historical course data.

---

### `components/ExplainModal.jsx` — Explanation Modal

Opens as a full-screen overlay when the user clicks "View explanation" on a recommendation card.

#### Data fetching

```javascript
if (userType === "dataset_user") {
  GET /explain/{userId}/{courseId}?alpha=0.5
} else {
  POST /explain/dynamic { selected_courses, course_id, alpha }
}
```

Returns an `ExplanationOut` with SHAP values, LIME values, CF score, content score, matched genres, and similar courses.

#### Layout

**Header:**
- Course title
- Match % | CF % | Content % scores side by side

**Recommendation Insight panel:**
- Plain-English summary: lists matched genres + most similar course from history
- Template: *"This course was recommended primarily because of your interest in [genres]. It is heavily related to courses like '[similar course]'."*

**Tab switcher — SHAP Analysis / LIME Local Explainer:**

Both views use the same `<BarChart>` component from Recharts:
```javascript
<BarChart layout="vertical" data={shapData or limeData}>
  <YAxis dataKey="name" />
  <Bar dataKey="value">
    <Cell fill={value >= 0 ? '#EDEDED' : '#333333'} />
  </Bar>
</BarChart>
```

- White bars = positive contribution (genre pushed the score up).
- Dark bars = negative contribution (genre pulled the score down).
- Top 7 features by absolute value are shown.

**Why two explainers?**

| SHAP | LIME |
|---|---|
| Global feature importance (Shapley values — consistent, additive) | Local linear approximation (perturbs the instance — intuitive coefficients) |
| Answers "what drives the model globally for this feature?" | Answers "how would changing this genre locally change the score?" |
| Computationally exact for tree models | Approximate — based on random perturbation sampling |

Showing both gives the user cross-validation: if SHAP and LIME agree that `MachineLearning` is the most important feature, the explanation is robust.

---

## `services/api.js` — Centralised API Client

All HTTP calls go through a single Axios-based module. This prevents URLs from being scattered across components.

```javascript
export const api = {
  getCourses(limit = 50)              // GET /courses?limit=N
  getAllCourses()                      // GET /courses?limit=9999
  getMyCourses(token)                 // GET /courses/my-courses (authenticated)
  getRecommendations(userId, topN, alpha)       // GET /recommend/{id}
  getDynamicRecommendations(courses, topN, alpha) // POST /recommend/dynamic
  getExplanation(userId, courseId, alpha)       // GET /explain/{id}/{course}
  getDynamicExplanation(courses, courseId, alpha) // POST /explain/dynamic
}
```

---

## Environment Variables (`.env.local`)

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random 32-byte hex string>
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`NEXTAUTH_SECRET` is required by NextAuth to sign session JWTs — without it the server refuses to start.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| NextAuth with CredentialsProvider (no Supabase Auth) | The backend issues its own JWTs to handle two completely different user types (dataset vs real). Supabase Auth cannot model dataset users, so authentication was centralised in FastAPI. NextAuth is used only as a session manager around the FastAPI JWT. |
| Client-side search on full course list | With only 307 courses, sending a search query to the server would add unnecessary round-trip latency. The filtered array is computed in < 1 ms on the client, and `useMemo` prevents redundant recomputation. |
| Pagination after filtering | Ensures search results span the full catalogue, not just the 12 courses on the current page. This is a common pitfall with server-side pagination left on the client. |
| `?edit=1` query parameter for edit mode | Reuses the course picker page for both initial onboarding and mid-session editing without duplicating the component. The single page reads the query param and adjusts its headings, buttons, and pre-population logic accordingly. |
| `Suspense` wrapper on `SelectCoursesInner` | `useSearchParams()` (from Next.js App Router) requires the component to be wrapped in `<Suspense>` during SSR. The wrapper provides a loading spinner fallback and prevents build-time errors. |
| `Set<string>` for selection state | O(1) membership tests for toggling and checking `isSelected`. Converted to `Array` only when serialising for the API call. |
| Recharts for SHAP/LIME | Declarative React-native charting; horizontal bar layout is the clearest visual representation of positive/negative feature attributions without requiring a custom D3 implementation. |
