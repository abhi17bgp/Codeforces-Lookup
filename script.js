// Theme management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.toggleButton = document.getElementById('themeToggle');
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.toggleButton.addEventListener('click', () => this.toggleTheme());
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
        localStorage.setItem('theme', theme);
        
        // Update toggle button aria-label
        const isDark = theme === 'dark';
        this.toggleButton.setAttribute('aria-label', 
            isDark ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Select the necessary DOM elements
const cfForm = document.getElementById('cfForm');
const inputBox = document.querySelector('.inputBox');
const userInfoContainer = document.querySelector('.user-info-container');
const profileForm = document.getElementById('cfForm');

// Cache for user data to improve performance
const userCache = new Map();

// Function to fetch user information from Codeforces API
const getUserInfo = async (handle) => {
    try {
        // Check cache first
        const cacheKey = `user_${handle.toLowerCase()}`;
        if (userCache.has(cacheKey)) {
            const cachedData = userCache.get(cacheKey);
            // Use cached data if it's less than 5 minutes old
            if (Date.now() - cachedData.timestamp < 300000) {
                showUserData(cachedData.user);
                await getUserSubmissions(handle);
                return;
            }
        }

        const url = `https://codeforces.com/api/user.info?handles=${handle}`;
        const response = await fetch(url);
        
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (!response.ok) {
            // For 400 errors, try to get the response body to check if it's an invalid handle
            if (response.status === 400) {
                try {
                    const errorData = await response.json();
                    console.log("Error data for 400 status:", errorData);
                    if (errorData.status === "FAILED" && errorData.comment) {
                        if (errorData.comment.toLowerCase().includes('not found') ||
                            errorData.comment.toLowerCase().includes('invalid') ||
                            errorData.comment.toLowerCase().includes('illegal handle')) {
                            throw new Error(`Handle "${handle}" does not exist. Please check the handle and try again.`);
                        }
                    }
                } catch (parseError) {
                    // Only catch JSON parsing errors, not our thrown errors
                    if (parseError.message && parseError.message.includes('Handle') && parseError.message.includes('does not exist')) {
                        throw parseError; // Re-throw our custom error
                    }
                    console.log("Parse error for 400 response:", parseError);
                    // If we can't parse the response, fall back to generic message
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("User info API response:", data);

        // Check if the API returned an error (this is the key fix)
        if (data.status === "FAILED") {
            // Handle API-level errors (like invalid handle)
            const errorMessage = data.comment || "Invalid handle or API error occurred.";
            if (errorMessage.toLowerCase().includes('not found') || 
                errorMessage.toLowerCase().includes('no data') ||
                errorMessage.toLowerCase().includes('invalid') ||
                errorMessage.toLowerCase().includes('incorrect') ||
                errorMessage.toLowerCase().includes('handles: illegal handle')) {
                throw new Error(`Handle "${handle}" does not exist. Please check the handle and try again.`);
            } else {
                throw new Error(errorMessage);
            }
        }

        if (data.status === "OK" && data.result && data.result.length > 0) {
            const userData = data.result[0];
            
            // Cache the user data
            userCache.set(cacheKey, {
                user: userData,
                timestamp: Date.now()
            });
            
            showUserData(userData);
            await getUserSubmissions(handle);
        } else {
            throw new Error(`Handle "${handle}" does not exist. Please check the handle and try again.`);
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
        showErrorMessage(getErrorMessage(error, 'user info'));
    }
};

// Function to fetch user submissions and count unique problems solved
const getUserSubmissions = async (handle) => {
    try {
        const url = `https://codeforces.com/api/user.status?handle=${handle}`;
        const response = await fetch(url);
        console.log("Submissions API response:", response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Submissions API response:", data);

        // Check if the API returned an error
        if (data.status === "FAILED") {
            const errorMessage = data.comment || "Failed to fetch submissions.";
            console.error("Submissions API error:", errorMessage);
            // Don't throw error for submissions, just show 0 problems
            showSolvedProblemsCount(0);
            return;
        }

        if (data.status === "OK") {
            const solvedProblemsCount = countSolvedProblems(data.result);
            showSolvedProblemsCount(solvedProblemsCount);
        } else {
            console.error("Unexpected submissions API response:", data);
            showSolvedProblemsCount(0);
        }
    } catch (error) {
        console.error("Error fetching submissions:", error);
        // Don't show error for submissions if user data was loaded successfully
        showSolvedProblemsCount(0);
    }
};

// Function to count unique problems solved by the user
const countSolvedProblems = (submissions) => {
    const solvedProblems = new Set();

    submissions.forEach(submission => {
        if (submission.verdict === "OK" && submission.problem) {
            const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
            solvedProblems.add(problemId);
        }
    });

    return solvedProblems.size;
};

// Helper function to get user-friendly error messages
const getErrorMessage = (error, context = 'general') => {
    const message = error.message || "An unexpected error occurred.";
    
    // Check for specific error types
    if (message.includes('Handle') && message.includes('does not exist')) {
        return message; // Return the specific handle error as-is
    }
    
    if (message.includes('HTTP error')) {
        const statusMatch = message.match(/status: (\d+)/);
        const status = statusMatch ? statusMatch[1] : 'unknown';
        
        switch (status) {
            case '404':
                return "Codeforces API endpoint not found. Please try again later.";
            case '429':
                return "Too many requests. Please wait a moment and try again.";
            case '500':
            case '502':
            case '503':
                return "Codeforces API is temporarily unavailable. Please try again later.";
            default:
                return `Unable to connect to Codeforces API (Error ${status}). Please check your internet connection and try again.`;
        }
    }
    
    if (message.includes('NetworkError') || 
        message.includes('Failed to fetch') || 
        message.includes('ERR_NETWORK') ||
        message.includes('ERR_INTERNET_DISCONNECTED')) {
        return "Network error occurred. Please check your internet connection and try again.";
    }
    
    if (message.includes('TypeError') && message.includes('fetch')) {
        return "Unable to connect to Codeforces API. Please check your internet connection and try again.";
    }
    
    // If it's an API error message, return it directly
    if (context === 'user info' && !message.includes('HTTP') && !message.includes('Network')) {
        return message;
    }
    
    return message;
};

// Helper: Show loading spinner
const showLoading = () => {
    userInfoContainer.innerHTML = `
        <div class="spinner" role="status" aria-live="polite" aria-label="Loading user data"></div>
        <p style="text-align: center; margin-top: 1rem; color: hsl(var(--welcome-text));">
            Fetching user data...
        </p>
    `;
};

// Helper: Show info message
const showInfoMessage = (message) => {
    userInfoContainer.innerHTML = `<div class="info-message" role="status">${escapeHtml(message)}</div>`;
};

// Helper: Show error message
const showErrorMessage = (message) => {
    userInfoContainer.innerHTML = `
        <div class="error-message" role="alert">
            <i class="fa-solid fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
            ${escapeHtml(message)}
        </div>
    `;
    showSearchBar();
    setTimeout(() => inputBox.focus(), 100);
};

// Helper: Escape HTML to prevent XSS
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Function to hide the search bar
const hideSearchBar = () => {
    profileForm.style.display = 'none';
};

// Function to show the search bar
const showSearchBar = () => {
    profileForm.style.display = '';
    inputBox.value = '';
    setTimeout(() => inputBox.focus(), 100);
};

// Function to format numbers with commas
const formatNumber = (num) => {
    return num ? num.toLocaleString() : "N/A";
};

// Function to format date
const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Function to get rank color class
const getRankColor = (rank) => {
    const rankColors = {
        'newbie': '#808080',
        'pupil': '#008000',
        'specialist': '#03A89E',
        'expert': '#0000FF',
        'candidate master': '#AA00AA',
        'master': '#FF8C00',
        'international master': '#FF8C00',
        'grandmaster': '#FF0000',
        'international grandmaster': '#FF0000',
        'legendary grandmaster': '#FF0000'
    };
    return rankColors[rank?.toLowerCase()] || '#808080';
};

// Function to display user data on the screen
let lastSolvedCount = 0;
const showUserData = (user) => {
    hideSearchBar();
    
    // Fallback for missing avatar
    let avatarUrl = user.avatar || user.titlePhoto;
    if (!avatarUrl) {
        avatarUrl = "https://codeforces.org/s/0/images/user-avatar.png";
    } else if (!avatarUrl.startsWith('http')) {
        avatarUrl = `https:${avatarUrl}`;
    }

    // Build stats HTML
    const statsHtml = `
        <div class="stat-item">
            <i class="fa-solid fa-trophy" aria-hidden="true"></i>
            <span>Rating: <b>${formatNumber(user.rating)}</b></span>
        </div>
        <div class="stat-item">
            <i class="fa-solid fa-medal" aria-hidden="true"></i>
            <span>Max Rating: <b>${formatNumber(user.maxRating)}</b></span>
        </div>
        <div class="stat-item">
            <i class="fa-solid fa-ranking-star" aria-hidden="true"></i>
            <span>Rank: <b style="color: ${getRankColor(user.rank)}">${user.rank || "N/A"}</b></span>
        </div>
        <div class="stat-item">
            <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
            <span>Max Rank: <b style="color: ${getRankColor(user.maxRank)}">${user.maxRank || "N/A"}</b></span>
        </div>
        <div class="stat-item">
            <i class="fa-solid fa-user-group" aria-hidden="true"></i>
            <span>Friends: <b>${formatNumber(user.friendOfCount) || "0"}</b></span>
        </div>
        <div class="stat-item">
            <i class="fa-solid fa-hand-holding-heart" aria-hidden="true"></i>
            <span>Contribution: <b>${user.contribution || "0"}</b></span>
        </div>
        ${user.organization ? `
            <div class="stat-item">
                <i class="fa-solid fa-building" aria-hidden="true"></i>
                <span>Organization: <b>${escapeHtml(user.organization)}</b></span>
            </div>
        ` : ''}
        ${user.city ? `
            <div class="stat-item">
                <i class="fa-solid fa-city" aria-hidden="true"></i>
                <span>City: <b>${escapeHtml(user.city)}</b></span>
            </div>
        ` : ''}
        ${user.country ? `
            <div class="stat-item">
                <i class="fa-solid fa-flag" aria-hidden="true"></i>
                <span>Country: <b>${escapeHtml(user.country)}</b></span>
            </div>
        ` : ''}
        ${user.registrationTimeSeconds ? `
            <div class="stat-item">
                <i class="fa-solid fa-calendar" aria-hidden="true"></i>
                <span>Registered: <b>${formatDate(user.registrationTimeSeconds)}</b></span>
            </div>
        ` : ''}
    `;

    userInfoContainer.innerHTML = `
        <img 
            src="${avatarUrl}" 
            alt="${escapeHtml(user.handle)}'s avatar" 
            class="user-avatar"
            onerror="this.src='https://codeforces.org/s/0/images/user-avatar.png'"
        />
        <h2>${escapeHtml(user.handle)}</h2>
        <div class="stats-grid">
            ${statsHtml}
        </div>
        <div id="progress-bar-section" aria-live="polite"></div>
        <button class="search-again-btn" type="button">
            <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
            Search Again
        </button>
    `;

    // If we already have the solved count, show the progress bar
    if (lastSolvedCount > 0) {
        showSolvedProblemsCount(lastSolvedCount);
    }

    // Add event listener for 'Search Again' button
    const searchAgainBtn = document.querySelector('.search-again-btn');
    if (searchAgainBtn) {
        searchAgainBtn.addEventListener('click', () => {
            userInfoContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="fa-solid fa-search welcome-icon" aria-hidden="true"></i>
                    <h2>Welcome to Codeforces Lookup</h2>
                    <p>Enter a Codeforces handle above to view detailed profile statistics and progress.</p>
                </div>
            `;
            showSearchBar();
        });
    }
};

// Function to display the count of solved problems on the screen
const showSolvedProblemsCount = (count) => {
    lastSolvedCount = count;
    
    // Determine max problems based on user's level
    const maxProblems = Math.max(3000, Math.ceil(count / 100) * 100);
    const percent = Math.min(100, ((count / maxProblems) * 100));
    
    const progressBar = `
        <div class="progress-bar-container" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width: ${percent}%;"></div>
        </div>
        <div class="progress-label">
            Problems Solved: <b>${formatNumber(count)}</b> / ${formatNumber(maxProblems)} (${percent.toFixed(1)}%)
        </div>
    `;
    
    const section = document.getElementById('progress-bar-section');
    if (section) {
        section.innerHTML = progressBar;
    }
};

// Form submission event listener
cfForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const handle = inputBox.value.trim();
    if (!handle) {
        showErrorMessage("Please enter a Codeforces handle.");
        inputBox.focus();
        return;
    }

    // Validate handle format (basic validation)
    if (!/^[a-zA-Z0-9_.-]+$/.test(handle)) {
        showErrorMessage("Invalid handle format. Handle can only contain letters, numbers, dots, hyphens, and underscores.");
        inputBox.focus();
        return;
    }

    if (handle.length > 24) {
        showErrorMessage("Handle is too long. Codeforces handles are typically 24 characters or less.");
        inputBox.focus();
        return;
    }

    showLoading();
    await getUserInfo(handle);
});

// Auto-focus on input when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => inputBox.focus(), 100);
});

// Handle Enter key in input field
inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        cfForm.dispatchEvent(new Event('submit'));
    }
});
