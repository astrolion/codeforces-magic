// DOM Elements
const usernameInput = document.getElementById('username-input');
const addUserBtn = document.getElementById('add-user-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const comparisonTableBody = document.getElementById('comparison-table-body');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Cache key for storing users
const USERS_CACHE_KEY = 'cf_compared_users';

// Rank Constants
const RANK_INFO = {
    'legendary grandmaster': { short: 'LGM', color: '#FF0000' },
    'international grandmaster': { short: 'IGM', color: '#FF0000' },
    'grandmaster': { short: 'GM', color: '#FF0000' },
    'international master': { short: 'IM', color: '#FF8C00' },
    'master': { short: 'M', color: '#FF8C00' },
    'candidate master': { short: 'CM', color: '#AA00AA' },
    'expert': { short: 'E', color: '#0000FF' },
    'specialist': { short: 'S', color: '#03A89E' },
    'pupil': { short: 'P', color: '#008000' },
    'newbie': { short: 'N', color: '#808080' }
};

// Load cached users on page load
document.addEventListener('DOMContentLoaded', () => {
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || '[]');
    cachedUsers.forEach(username => fetchUserData(username));
});

// Event Listeners
addUserBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        fetchUserData(username);
        usernameInput.value = '';
    } else {
        showError('Please enter a username');
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addUserBtn.click();
    }
});

clearAllBtn.addEventListener('click', () => {
    comparisonTableBody.innerHTML = '';
    localStorage.removeItem(USERS_CACHE_KEY);
});

// API Functions
async function fetchUserData(username) {
    try {
        showError('');
        
        // First check if user exists
        const userInfoResponse = await fetchUserInfo(username);
        if (userInfoResponse.status !== 'OK' || !userInfoResponse.result || userInfoResponse.result.length === 0) {
            showError(`User "${username}" not found`);
            return;
        }

        const user = userInfoResponse.result[0];
        
        // Fetch additional data
        const [userStatusResponse, ratingHistoryResponse] = await Promise.all([
            fetchUserStatus(username),
            fetchRatingHistory(username)
        ]);
        
        if (userStatusResponse.status === 'OK') {
            const submissions = userStatusResponse.result;
            const ratingHistory = ratingHistoryResponse.status === 'OK' ? ratingHistoryResponse.result : [];
            
            // Add user to cache
            addUserToCache(username);
            
            // Create user row
            createUserRow(user, submissions, ratingHistory);
        } else {
            showError(`Error fetching data for user "${username}"`);
        }
    } catch (error) {
        showError(`Error fetching data for user "${username}"`);
        console.error('Error:', error);
    }
}

async function fetchUserInfo(username) {
    const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
    return response.json();
}

async function fetchUserStatus(username) {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}`);
    return response.json();
}

async function fetchRatingHistory(username) {
    const response = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
    return response.json();
}

// UI Functions
function createUserRow(user, submissions, ratingHistory) {
    // Check if user row already exists
    if (document.getElementById(`user-row-${user.handle}`)) {
        showError(`User "${user.handle}" is already in the comparison`);
        return;
    }

    const stats = calculateUserStats(submissions, ratingHistory);
    const rankInfo = getRankInfo(user.rank);
    
    const row = document.createElement('tr');
    row.id = `user-row-${user.handle}`;
    
    row.innerHTML = `
        <td>${user.handle}</td>
        <td><span style="color: ${rankInfo.color}; font-weight: 500;">${rankInfo.short}</span></td>
        <td>${user.rating || '0'}</td>
        <td>${stats.minRating}</td>
        <td>${stats.maxRating}</td>
        <td>${stats.solvedProblems}</td>
        <td>${stats.totalSubmissions}</td>
        <td>${stats.successRate}%</td>
        <td>${stats.totalContests}</td>
        <td>${stats.bestRank}</td>
        <td>${stats.maxRatedSolved}</td>
        <td>${stats.minRatedSolved}</td>
        <td>
            <button class="remove-row-btn" onclick="removeUser('${user.handle}')" title="Remove user">
                <span class="material-icons">delete</span>
            </button>
        </td>
    `;
    
    comparisonTableBody.appendChild(row);
}

function calculateUserStats(submissions, ratingHistory) {
    // Problem Statistics
    const solvedProblems = new Set();
    let totalSubmissions = submissions.length;
    let successfulSubmissions = 0;
    let contestSet = new Set();
    let bestRank = Infinity;
    let maxRatedSolved = 0;
    let minRatedSolved = Infinity;

    submissions.forEach(submission => {
        if (submission.verdict === 'OK') {
            solvedProblems.add(submission.problem.name);
            successfulSubmissions++;
            
            // Track problem ratings
            if (submission.problem.rating) {
                maxRatedSolved = Math.max(maxRatedSolved, submission.problem.rating);
                minRatedSolved = Math.min(minRatedSolved, submission.problem.rating);
            }
        }

        if (submission.author.participantType === 'CONTESTANT' || 
            submission.author.participantType === 'VIRTUAL' || 
            submission.author.participantType === 'OUT_OF_COMPETITION') {
            contestSet.add(submission.contestId);
        }
    });

    // Contest Statistics
    let minRating = Infinity;
    let maxRating = 0;
    
    ratingHistory.forEach(contest => {
        if (contest.rank < bestRank) {
            bestRank = contest.rank;
        }
        minRating = Math.min(minRating, contest.newRating);
        maxRating = Math.max(maxRating, contest.newRating);
    });

    return {
        solvedProblems: solvedProblems.size,
        totalSubmissions,
        successRate: totalSubmissions > 0 
            ? ((successfulSubmissions / totalSubmissions) * 100).toFixed(1)
            : '0.0',
        totalContests: contestSet.size,
        maxRating: maxRating || 'N/A',
        minRating: minRating < Infinity ? minRating : 'N/A',
        bestRank: bestRank < Infinity ? bestRank : 'N/A',
        maxRatedSolved: maxRatedSolved || 'N/A',
        minRatedSolved: minRatedSolved < Infinity ? minRatedSolved : 'N/A'
    };
}

function getRankInfo(rank) {
    if (!rank) return { short: 'Unrated', color: '#808080' };
    
    const rankLower = rank.toLowerCase();
    return RANK_INFO[rankLower] || { short: rank, color: '#808080' };
}

function removeUser(username) {
    const row = document.getElementById(`user-row-${username}`);
    if (row) {
        row.remove();
        removeUserFromCache(username);
    }
}

// Cache Functions
function addUserToCache(username) {
    const users = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || '[]');
    if (!users.includes(username)) {
        users.push(username);
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    }
}

function removeUserFromCache(username) {
    const users = JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || '[]');
    const index = users.indexOf(username);
    if (index > -1) {
        users.splice(index, 1);
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    }
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.toggle('hidden', !message);
} 