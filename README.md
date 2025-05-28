# 💻 Codeforces Profile Viewer

**Live Demo**: ([https://abhi17bgp.github.io/codeforces-Lookup/](https://abhi17bgp.github.io/Codeforces-Lookup/))

This is a simple web app that allows users to check any **Codeforces profile** by entering a handle. It displays key information like rating, rank, problems solved, and more — fetched directly from the official Codeforces API.

---

## ✨ Features

- 🔍 Search for any Codeforces user by handle
- 📊 View rating, max rating, and rank
- ✅ Shows number of contests and problems solved
- 🚀 Fast, lightweight, and responsive UI
- 🌐 Hosted on GitHub Pages (no backend needed)

---

## 🛠️ Tech Stack

| Technology     | Role                          |
|----------------|-------------------------------|
| HTML           | Page structure                |
| CSS            | Styling and responsiveness    |
| JavaScript     | Logic, DOM manipulation       |
| Codeforces API | Fetching real-time user data  |
| GitHub Pages   | Hosting the live website      |

---

## 📦 How It Works

1. User enters a **Codeforces handle**.
2. A request is made to:  
   `https://codeforces.com/api/user.info?handles=USERNAME`
3. Data is fetched from the API and displayed dynamically on the page.

---

## 📁 File Structure

