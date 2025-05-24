# Codeforces User Analyzer

A modern web application that allows users to analyze Codeforces user data using the Codeforces API. The application provides a clean and intuitive interface to view user statistics, contest history, and problem-solving achievements.

## Features

- Search for any Codeforces user by their handle
- View user profile information including:
  - Profile picture
  - Current rank and rating
  - Contest statistics
  - Problem-solving statistics
- Automatic caching of last searched username
- Responsive design that works on both desktop and mobile devices
- Real-time data fetching from Codeforces API

## Setup

1. Clone this repository or download the files
2. Open `index.html` in a modern web browser
3. Enter a Codeforces username in the search box
4. Click "Analyze" or press Enter to view the user's statistics

## Technical Details

The application is built using:
- HTML5
- CSS3 (with modern features like Grid and Flexbox)
- Vanilla JavaScript (ES6+)
- Codeforces API

## API Endpoints Used

- `https://codeforces.com/api/user.info` - Fetches user profile information
- `https://codeforces.com/api/user.status` - Fetches user submission history

## Browser Support

The application works best in modern browsers that support:
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Local Storage API

## License

This project is open source and available under the MIT License. 