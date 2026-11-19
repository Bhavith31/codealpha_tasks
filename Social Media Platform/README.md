# Circle: Mini Social Media App

A small full-stack social app: profiles, posts, comments, likes and follows.

## Project structure
```
Simple E-commerce Store/
├── backend/            Express.js API + SQLite database
│   ├── server.js       REST routes (auth, posts, comments, likes, follows)
│   ├── db.js           Table definitions
│   └── package.json
└── frontend/           HTML, CSS, JavaScript (no framework)
    ├── index.html
    ├── style.css
    └── app.js
```

## Run it
```
cd backend
npm install
npm start
```
Open http://localhost:3000 (the backend also serves the frontend).

## Database tables
| Table | Purpose |
|-------|---------|
| users | username, hashed password, bio |
| posts | content written by a user |
| comments | replies attached to a post |
| likes | (user, post) pairs, one like per user per post |
| follows | (follower, following) pairs |

## API summary
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/register, /api/login | Get a JWT token |
| GET | /api/posts?scope=all\|following | Feed |
| POST / DELETE | /api/posts, /api/posts/:id | Create / delete own post |
| POST | /api/posts/:id/like | Toggle like |
| GET / POST | /api/posts/:id/comments | List / add comments |
| GET | /api/users/:username | Profile, counts, posts |
| POST | /api/users/:username/follow | Toggle follow |
| PUT | /api/me | Update bio |

## How it works (for explaining)
1. Passwords are hashed with bcrypt; login returns a JWT the browser stores.
2. The frontend sends the token in the `Authorization` header; protected routes check it.
3. Likes and follows are toggles: the same endpoint adds or removes the row.
4. Counts (likes, comments, followers) are computed with SQL, so they are never out of sync.
5. All user text is escaped in the browser to prevent XSS.
