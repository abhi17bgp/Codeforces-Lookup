// Select the necessary DOM elements
const cfForm = document.getElementById('cfForm');
const inputBox = document.querySelector('.inputBox');
const userInfoContainer = document.querySelector('.user-info-container');

// Function to fetch user information from Codeforces API
const getUserInfo = async (handle) => {
    try {
        const url = `https://codeforces.com/api/user.info?handles=${handle}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to fetch user data");
        }

        const data = await response.json();

        if (data.status === "OK") {
            showUserData(data.result[0]);
            await getUserSubmissions(handle); // Fetch the number of solved problems
        } else {
            showErrorMessage("No user found with this handle!");
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
};

// Function to fetch user submissions and count unique problems solved
const getUserSubmissions = async (handle) => {
    try {
        const url = `https://codeforces.com/api/user.status?handle=${handle}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to fetch user submissions");
        }

        const data = await response.json();
        console.log(data.result);

        if (data.status === "OK") {
            const solvedProblemsCount = countSolvedProblems(data.result);
            showSolvedProblemsCount(solvedProblemsCount);
        } else {
            showErrorMessage("Failed to fetch submissions. Please check the handle.");
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
};

// Function to count unique problems solved by the user
const countSolvedProblems = (submissions) => {
    const solvedProblems = new Set();

    submissions.forEach(submission => {
        if (submission.verdict === "OK") {
            const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
            solvedProblems.add(problemId);
        }
    });

    return solvedProblems.size;
};

// Function to display user data on the screen
const showUserData = (user) => {
    const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `https:${user.avatar}`;
    userInfoContainer.innerHTML = `
            <img src="${avatarUrl}" alt="${user.handle}'s avatar" class="user-avatar" />

        <h2>${user.handle}</h2>
        <p><strong>Rating:</strong> ${user.rating || "N/A"}</p>
        <p><strong>Max Rating:</strong> ${user.maxRating || "N/A"}</p>
        <p><strong>Rank:</strong> ${user.rank || "N/A"}</p>
        <p><strong>Max Rank:</strong> ${user.maxRank || "N/A"}</p>
        <p><strong>Contribution:</strong> ${user.contribution}</p>
        <p><strong>Friends:</strong> ${user.friendOfCount || "N/A"}</p>
    `;
};

// Function to display the count of solved problems on the screen
const showSolvedProblemsCount = (count) => {
    userInfoContainer.innerHTML += `<p><strong>Number of problems solved:</strong> ${count}</p>`;
};

// Function to display error messages
const showErrorMessage = (message) => {
    userInfoContainer.innerHTML = `<h2>${message}</h2>`;
};

// Function to handle the form submission
const handleFormSubmission = (e) => {
    e.preventDefault();
    const handle = inputBox.value.trim();
    
    if (handle) {
        showErrorMessage("Fetching user information...");
        getUserInfo(handle);
    } else {
        showErrorMessage("Please enter a Codeforces handle");
    }
};

// Add an event listener to the form for submission
cfForm.addEventListener('submit', handleFormSubmission);
