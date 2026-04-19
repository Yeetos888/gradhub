# Student Portal

A full-stack web application for managing student and mentor interactions with course scheduling and enrollment features.

## Features

- **Student Dashboard**: View enrolled courses and schedule
- **Mentor Dashboard**: Manage courses and student schedules
- **User Authentication**: Secure signup/login for students and mentors
- **Course Management**: Enroll in courses and manage course content
- **Scheduling System**: Create and manage schedules

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Database**: MySQL
- **Authentication**: bcryptjs for password hashing
- **Session Management**: express-session

## Prerequisites

- Node.js (v14+)
- MySQL database
- npm or yarn

## Local Installation

1. Clone the repository:
```bash
git clone https://github.com/Yeetos888/gradhub.git
cd gradhub
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials:
```
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=your_database_port
PORT=3000
NODE_ENV=development
```

5. Run setup script to initialize the database:
```bash
node setup_database.js
```

6. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

7. Open your browser and navigate to `http://localhost:3000`

## Deployment on Render

### Prerequisites

- Render account (https://render.com)
- MySQL database (Aiven or other cloud provider)
- GitHub account with the repository

### Steps

1. **Push code to GitHub**:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

2. **Connect to Render**:
   - Go to https://dashboard.render.com
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the gradhub repository

3. **Configuration**:
   - **Name**: student-portal
   - **Environment**: Node
   - **Region**: Choose your region
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or upgrade as needed)

4. **Set Environment Variables**:
   - In the Render dashboard, go to "Environment"
   - Add the following variables:
     - `DB_HOST`: Your MySQL database host
     - `DB_USER`: Your database user
     - `DB_PASSWORD`: Your database password
     - `DB_NAME`: Your database name
     - `DB_PORT`: Your database port (typically 22894 for Aiven)
     - `NODE_ENV`: production

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically deploy your application
   - Your app will be available at `https://<your-app-name>.onrender.com`

## Project Structure

```
.
├── app.js                 # Main Express application
├── setup_database.js      # Database initialization script
├── package.json          # Dependencies and scripts
├── render.yaml           # Render deployment configuration
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
└── public/             # Frontend files
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── courses.html
    ├── schedule.html
    ├── mentor_dashboard.html
    ├── mentor_courses.html
    ├── mentor_schedules.html
    └── styles.css
```

## API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - Login user

### Dashboard Routes
- `GET /dashboard` - Student dashboard
- `GET /mentor/dashboard` - Mentor dashboard
- `GET /schedule` - View schedule
- `GET /courses` - View courses

## Notes

- Database credentials should never be committed to the repository
- Always use environment variables for sensitive information
- The `.env` file is included in `.gitignore` and will not be pushed
- Use `.env.example` as a template for setting up environment variables

## License

ISC
