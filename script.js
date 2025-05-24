// DOM Elements
const usernameInput = document.getElementById('username');
const searchBtn = document.getElementById('search-btn');
const userInfo = document.getElementById('user-info');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const searchSection = document.getElementById('search-section');
const userDropdown = document.getElementById('user-dropdown');
const dropdownUsername = document.getElementById('dropdown-username');
const dropdownTrigger = document.querySelector('.dropdown-trigger');
const dropdownMenu = document.querySelector('.dropdown-menu');
const changeUserBtn = document.getElementById('change-user-btn');
const settingsBtn = document.getElementById('settings-btn');
const showRatingGraphBtn = document.getElementById('show-rating-graph');
const ratingGraphModal = document.getElementById('rating-graph-modal');
const closeModalBtn = document.getElementById('close-modal');
const ratingChart = document.getElementById('rating-chart');
const prevYearBtn = document.getElementById('prev-year');
const nextYearBtn = document.getElementById('next-year');
const currentYearDisplay = document.getElementById('current-year');
const yearlyStatsSection = document.querySelector('.yearly-stats-section');

// Cache key
const CACHE_KEY = 'cf_username';
const YEAR_CACHE_KEY = 'cf_selected_year';

// Cache Keys
const USERNAME_CACHE_KEY = 'cf_last_username';
const COMPARE_CACHE_KEY = 'cf_compared_users';

// Chart instance
let ratingChartInstance = null;
let currentYear = new Date().getFullYear();

// Store user data globally
let userSubmissions = [];
let userRatingHistory = [];

// Load cached username and year on page load
document.addEventListener('DOMContentLoaded', () => {
    const cachedUsername = localStorage.getItem(CACHE_KEY);
    const cachedYear = localStorage.getItem(YEAR_CACHE_KEY);
    if (cachedYear) {
        currentYear = parseInt(cachedYear);
        currentYearDisplay.textContent = currentYear;
    }
    if (cachedUsername) {
        usernameInput.value = cachedUsername;
        fetchUserData(cachedUsername);
        showUserDropdown(cachedUsername);
        yearlyStatsSection.classList.remove('hidden');
    } else {
        showSearchSection();
        yearlyStatsSection.classList.add('hidden');
    }
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        fetchUserData(username);
    } else {
        showError('Please enter a username');
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Dropdown functionality
dropdownTrigger.addEventListener('click', () => {
    dropdownMenu.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('active');
    }
});

changeUserBtn.addEventListener('click', () => {
    showSearchSection();
    dropdownMenu.classList.remove('active');
});

// Rating Graph Modal functionality
showRatingGraphBtn.addEventListener('click', () => {
    ratingGraphModal.classList.remove('hidden');
    const username = localStorage.getItem(CACHE_KEY);
    fetchRatingHistory(username).then(response => {
        if (response.status === 'OK') {
            updateRatingChart(response.result);
        }
    }).catch(error => {
        console.error('Error fetching rating history:', error);
    });
});

closeModalBtn.addEventListener('click', () => {
    ratingGraphModal.classList.add('hidden');
});

ratingGraphModal.addEventListener('click', (e) => {
    if (e.target === ratingGraphModal) {
        ratingGraphModal.classList.add('hidden');
    }
});

// Year navigation
prevYearBtn.addEventListener('click', () => {
    currentYear--;
    currentYearDisplay.textContent = currentYear;
    localStorage.setItem(YEAR_CACHE_KEY, currentYear);
    updateYearlyStats(userSubmissions, userRatingHistory);
});

nextYearBtn.addEventListener('click', () => {
    if (currentYear < new Date().getFullYear()) {
        currentYear++;
        currentYearDisplay.textContent = currentYear;
        localStorage.setItem(YEAR_CACHE_KEY, currentYear);
        updateYearlyStats(userSubmissions, userRatingHistory);
    }
});

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const clearUsernameCache = document.getElementById('clear-username-cache');
const clearCompareCache = document.getElementById('clear-compare-cache');
const clearAllCache = document.getElementById('clear-all-cache');

// Settings Modal Event Listeners
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// Cache Management Functions
function showConfirmationDialog(message, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
        <h3>Confirm Action</h3>
        <p>${message}</p>
        <div class="confirmation-actions">
            <button class="cancel">Cancel</button>
            <button class="confirm">Confirm</button>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.cancel').addEventListener('click', () => {
        dialog.remove();
    });

    dialog.querySelector('.confirm').addEventListener('click', () => {
        onConfirm();
        dialog.remove();
        settingsModal.classList.add('hidden');
    });
}

clearUsernameCache.addEventListener('click', () => {
    showConfirmationDialog(
        'Are you sure you want to clear the username cache? This will remove the last searched username.',
        () => {
            localStorage.removeItem(USERNAME_CACHE_KEY);
            usernameInput.value = '';
            showError('Username cache cleared');
            yearlyStatsSection.classList.add('hidden');
        }
    );
});

clearCompareCache.addEventListener('click', () => {
    showConfirmationDialog(
        'Are you sure you want to clear the comparison cache? This will remove all compared users.',
        () => {
            localStorage.removeItem(COMPARE_CACHE_KEY);
            showError('Comparison cache cleared');
        }
    );
});

clearAllCache.addEventListener('click', () => {
    showConfirmationDialog(
        'Are you sure you want to clear all cache? This will remove all stored data.',
        () => {
            localStorage.clear();
            usernameInput.value = '';
            showError('All cache cleared');
            yearlyStatsSection.classList.add('hidden');
        }
    );
});

// UI Functions
function showUserDropdown(username) {
    userDropdown.classList.remove('hidden');
    searchSection.classList.add('hidden');
    dropdownUsername.textContent = username;
}

function showSearchSection() {
    userDropdown.classList.add('hidden');
    searchSection.classList.remove('hidden');
    userInfo.classList.add('hidden');
    yearlyStatsSection.classList.add('hidden');
    usernameInput.value = '';
    usernameInput.focus();
}

// API Functions
async function fetchUserData(username) {
    try {
        showError('');
        const [userInfoResponse, userStatusResponse, ratingHistoryResponse] = await Promise.all([
            fetchUserInfo(username),
            fetchUserStatus(username),
            fetchRatingHistory(username)
        ]);
        
        if (userInfoResponse.status === 'OK' && userStatusResponse.status === 'OK') {
            const user = userInfoResponse.result[0];
            userSubmissions = userStatusResponse.result;
            userRatingHistory = ratingHistoryResponse.status === 'OK' ? ratingHistoryResponse.result : [];
            
            // Cache the username
            localStorage.setItem(CACHE_KEY, username);
            
            // Update UI with user data
            updateUserProfile(user);
            updateUserStats(user, userSubmissions, userRatingHistory);
            userInfo.classList.remove('hidden');
            yearlyStatsSection.classList.remove('hidden');
            showUserDropdown(username);
        } else {
            showError('User not found');
            yearlyStatsSection.classList.add('hidden');
        }
    } catch (error) {
        showError('Error fetching user data');
        yearlyStatsSection.classList.add('hidden');
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

// UI Update Functions
function updateUserProfile(user) {
    document.getElementById('user-avatar').src = user.titlePhoto || 'https://userpic.codeforces.com/no-avatar.jpg';
    document.getElementById('user-name').textContent = user.handle;
    document.getElementById('user-rank').textContent = user.rank || 'Unrated';
    document.getElementById('user-rating').textContent = `Rating: ${user.rating || '0'}`;
    document.getElementById('user-country').textContent = user.country || 'Not specified';
    document.getElementById('user-organization').textContent = user.organization || 'Not specified';

    // Update rank badge
    const rankBadge = document.getElementById('rank-badge');
    if (user.rank) {
        rankBadge.textContent = user.rank.charAt(0).toUpperCase();
        rankBadge.style.display = 'flex';
    } else {
        rankBadge.style.display = 'none';
    }
}

// Utility functions for statistics
function calculateRatingStats(ratingHistory) {
    if (ratingHistory.length === 0) {
        return {
            min: 0,
            max: 0,
            mean: 0,
            median: 0,
            stdDev: 0
        };
    }

    // Extract ratings and sort them for efficient calculations
    const ratings = ratingHistory.map(contest => contest.newRating).sort((a, b) => a - b);
    
    // Calculate min and max (already sorted)
    const min = ratings[0];
    const max = ratings[ratings.length - 1];
    
    // Calculate mean
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    const mean = Math.round(sum / ratings.length);
    
    // Calculate median
    const mid = Math.floor(ratings.length / 2);
    const median = ratings.length % 2 === 0
        ? Math.round((ratings[mid - 1] + ratings[mid]) / 2)
        : ratings[mid];
    
    // Calculate standard deviation
    const squareDiffs = ratings.map(rating => Math.pow(rating - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((acc, val) => acc + val, 0) / ratings.length;
    const stdDev = Math.round(Math.sqrt(avgSquareDiff));
    
    return { min, max, mean, median, stdDev };
}

function updateUserStats(user, submissions, ratingHistory) {
    // Contest Statistics
    const contestSet = new Set();
    submissions.forEach(submission => {
        if (submission.author.participantType === 'CONTESTANT' || 
            submission.author.participantType === 'VIRTUAL' || 
            submission.author.participantType === 'OUT_OF_COMPETITION') {
            contestSet.add(submission.contestId);
        }
    });
    
    // Calculate all rating statistics at once
    const ratingStats = calculateRatingStats(ratingHistory);
    
    document.getElementById('total-contests').textContent = contestSet.size;
    document.getElementById('best-rank').textContent = user.maxRank || 'N/A';
    document.getElementById('max-rating').textContent = ratingStats.max;
    document.getElementById('min-rating').textContent = ratingStats.min;
    document.getElementById('mean-rating').textContent = ratingStats.mean;
    document.getElementById('median-rating').textContent = ratingStats.median;
    document.getElementById('std-rating').textContent = ratingStats.stdDev;

    // Problem Statistics
    const solvedProblems = new Set();
    let totalSubmissions = submissions.length;
    let successfulSubmissions = 0;
    let highestRatedSolved = 0;
    let lowestRatedSolved = Infinity;

    submissions.forEach(submission => {
        if (submission.verdict === 'OK') {
            solvedProblems.add(submission.problem.name);
            successfulSubmissions++;
            
            const problemRating = submission.problem.rating;
            if (problemRating) {
                highestRatedSolved = Math.max(highestRatedSolved, problemRating);
                lowestRatedSolved = Math.min(lowestRatedSolved, problemRating);
            }
        }
    });

    document.getElementById('solved-problems').textContent = solvedProblems.size;
    document.getElementById('total-submissions').textContent = totalSubmissions;
    document.getElementById('success-rate').textContent = 
        `${((successfulSubmissions / totalSubmissions) * 100).toFixed(1)}%`;
    
    // Display highest and lowest rated problems
    document.getElementById('highest-rated-solved').textContent = 
        highestRatedSolved > 0 ? highestRatedSolved : 'N/A';
    document.getElementById('lowest-rated-solved').textContent = 
        lowestRatedSolved < Infinity ? lowestRatedSolved : 'N/A';

    // Update yearly statistics
    updateYearlyStats(submissions, ratingHistory);
}

function updateYearlyStats(submissions, ratingHistory) {
    if (!submissions.length || !ratingHistory.length) return;

    const yearStart = new Date(currentYear, 0, 1).getTime() / 1000;
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).getTime() / 1000;

    // Filter submissions for current year
    const yearlySubmissions = submissions.filter(sub => {
        const submissionTime = sub.creationTimeSeconds;
        return submissionTime >= yearStart && submissionTime <= yearEnd;
    });

    // Filter rating history for current year
    const yearlyRatingHistory = ratingHistory.filter(contest => {
        const contestTime = contest.ratingUpdateTimeSeconds;
        return contestTime >= yearStart && contestTime <= yearEnd;
    });

    // Calculate yearly statistics
    const solvedProblems = new Set();
    let successfulSubmissions = 0;
    let highestRatedSolved = 0;
    let contestSet = new Set();
    let bestRank = Infinity;

    yearlySubmissions.forEach(submission => {
        if (submission.verdict === 'OK') {
            solvedProblems.add(submission.problem.name);
            successfulSubmissions++;
            
            const problemRating = submission.problem.rating;
            if (problemRating) {
                highestRatedSolved = Math.max(highestRatedSolved, problemRating);
            }
        }

        if (submission.author.participantType === 'CONTESTANT' || 
            submission.author.participantType === 'VIRTUAL' || 
            submission.author.participantType === 'OUT_OF_COMPETITION') {
            contestSet.add(submission.contestId);
        }
    });

    yearlyRatingHistory.forEach(contest => {
        if (contest.rank < bestRank) {
            bestRank = contest.rank;
        }
    });

    // Update UI
    document.getElementById('yearly-solved').textContent = solvedProblems.size;
    document.getElementById('yearly-submissions').textContent = yearlySubmissions.length;
    document.getElementById('yearly-success-rate').textContent = 
        yearlySubmissions.length > 0 
            ? `${((successfulSubmissions / yearlySubmissions.length) * 100).toFixed(1)}%`
            : '0%';
    document.getElementById('yearly-highest-rated').textContent = 
        highestRatedSolved > 0 ? highestRatedSolved : 'N/A';
    document.getElementById('yearly-contests').textContent = contestSet.size;
    document.getElementById('yearly-best-rank').textContent = 
        bestRank < Infinity ? bestRank : 'N/A';
}

function updateRatingChart(ratingHistory) {
    // Destroy existing chart if it exists
    if (ratingChartInstance) {
        ratingChartInstance.destroy();
    }

    const labels = ratingHistory.map(contest => {
        const date = new Date(contest.ratingUpdateTimeSeconds * 1000);
        return date.toLocaleDateString();
    });

    const ratings = ratingHistory.map(contest => contest.newRating);
    const contestNames = ratingHistory.map(contest => contest.contestName);
    
    // Calculate color based on rating
    const getColorForRating = (rating) => {
        if (rating >= 2400) return '#FF0000'; // Red
        if (rating >= 2200) return '#FF8C00'; // Orange
        if (rating >= 1900) return '#AA00AA'; // Purple
        if (rating >= 1600) return '#0000FF'; // Blue
        if (rating >= 1400) return '#03A89E'; // Cyan
        if (rating >= 1200) return '#008000'; // Green
        return '#808080'; // Gray
    };

    const backgroundColors = ratings.map(rating => {
        const color = getColorForRating(rating);
        return `${color}33`; // Add 20% opacity
    });

    const borderColors = ratings.map(rating => getColorForRating(rating));

    ratingChartInstance = new Chart(ratingChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rating',
                data: ratings,
                borderColor: borderColors,
                backgroundColor: backgroundColors,
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: borderColors,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointStyle: 'circle',
                segment: {
                    borderColor: ctx => {
                        const index = ctx.p1DataIndex;
                        return borderColors[index];
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: (items) => {
                            const index = items[0].dataIndex;
                            return contestNames[index];
                        },
                        label: (item) => {
                            const rating = item.raw;
                            const color = getColorForRating(rating);
                            return [
                                `Rating: ${rating}`,
                                `Color: ${color}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: (value) => {
                            return value.toLocaleString();
                        },
                        font: {
                            size: 12
                        },
                        padding: 10
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        },
                        padding: 10
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            elements: {
                line: {
                    borderWidth: 3
                }
            }
        }
    });
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.toggle('hidden', !message);
} 