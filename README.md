# BigQuery Release Radar 📡

A modern web application that aggregates, parses, and formats official Google Cloud BigQuery release notes. It features a custom **X / Twitter Composer** to help developer relations, cloud architects, and engineers easily draft and share BigQuery updates with their audience.

---

## 🚀 Features

* **Real-time Aggregation**: Fetches and parses the official BigQuery Atom feed XML directly from Google.
* **Resilient Cache Layer**: Implements server-side in-memory caching (5-minute TTL) to optimize request load, with automatic fallback to stale cache data if the external feed is offline.
* **Search & Filter**: Instant client-side search indexing and category filters (`Features`, `Announcements`, `Changes`, `Deprecated`).
* **Interactive Tweet Composer**: Select a release note and auto-draft an optimized tweet. Includes:
  * Dynamic URL-aware character counter (conforms to X/Twitter's 23-character link policy).
  * Auto-truncation to fit the 280-character limit.
  * One-click copy-to-clipboard and direct-share intent launch.

---

## 🛠 Tech Stack

* **Backend**: Python, Flask, Beautiful Soup 4, Requests, XML ElementTree
* **Frontend**: HTML5, Vanilla JavaScript, CSS3 (featuring responsive glassmorphism aesthetics and modern typography)

---

## 📁 Project Structure

```
.
├── README.md               # Project documentation
├── .gitignore              # Git ignore rules for Python, Flask, & IDEs
├── news.txt                # Cached raw release summaries
├── summary.txt             # Project summaries
└── bq-release-notes/       # Main Flask Application
    ├── app.py              # Server routes, parsing, and caching
    ├── templates/
    │   └── index.html      # UI Skeleton structure
    └── static/
        ├── css/
        │   └── style.css   # Main layout and theme variables
        └── js/
            └── app.js      # Global state, UI events, & drafting logic
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 2. Configure Virtual Environment
Navigate to the `bq-release-notes` directory and initialize a virtual environment:
```bash
cd bq-release-notes
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

### 3. Install Dependencies
Install the required libraries:
```bash
pip install Flask requests beautifulsoup4
```

### 4. Run the Application
Start the Flask development server:
```bash
python app.py
```
Open your browser and navigate to **`http://localhost:5001`**.

---

## 💡 How it Works (Under the Hood)

1. **Server Fetch**: When a user loads the page, `app.py` triggers an HTTP GET request to the Google XML Atom feed.
2. **Category Extraction**: The raw HTML block inside each Atom entry is split up by `<h3>` tags using Beautiful Soup, mapping updates to distinct types.
3. **Draft Compilation**: When a user selects a note on the UI, `app.js` computes the character footprint (`Length(text) - Length(URLs) + (23 * Count(URLs))`). If the text exceeds the limit, it is cleanly truncated with `...` before appending the official reference link.
