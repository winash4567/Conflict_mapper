# GLOBAL CONFLICT ANALYZER

## Overview
The **Global Conflict Analyzer** is an automated, AI-driven Open Source Intelligence (OSINT) platform. It aggregates global conflict data, utilizes large language models to filter out noise, extracts precise geopolitical coordinates, and visualizes the intelligence on an interactive, real-time tactical map. 

In modern geopolitical conflicts, the primary challenge is information overload, fragmentation, and the "fog of war." Traditional news is slow, while social media is fast but unreliable. This platform serves as a centralized, programmatic command center that automatically tracks kinetic events, cyber warfare, diplomatic shifts, and civil unrest without requiring human manual data entry.

---

## The Tech Stack

**Frontend & Visualization**
*   **Next.js (React):** 
*   **Tailwind CSS:** 
*   **Leaflet.js & OpenStreetMap:** An open-source mapping solution replacing expensive commercial APIs (like Mapbox). It utilizes CartoDB dark tiles for a tactical aesthetic.

**Database & Storage**
*   **Supabase (PostgreSQL):** The central data vault. 
*   **PostGIS:** A database extension utilized to handle geographic coordinates and spatial queries.
*   **Row Level Security (RLS):** Secures the database by keeping the frontend read-only while reserving write-access strictly for the automated scraper.

**Backend**
*   **Python:** The core scripting language handling data ingestion and logic.
*   **Google Gemini 2.0 Flash-Lite API:** The intelligence engine. It reads raw text and is forced to return highly structured *JSON* data containing summaries, coordinates, and threat categories.
*   **GitHub Actions:** The serverless worker that acts as the heartbeat of the application, running the Python scripts on a scheduled cron job.
*   **Vercel:** Hosts the frontend dashboard, providing instant continuous deployment.

---

## How It Works: 
The architecture follows a strict, stateless pipeline designed to run autonomously in the background.

1.  **The Trigger:** Every 30 minutes, a GitHub Action wakes up and spins up a temporary virtual machine.
2.  **Ingestion:** A Python script uses `feedparser` to scrape global news RSS feeds (e.g., BBC, Al Jazeera).
3.  **AI Processing:** New, unseen articles are sent to the Gemini API. The AI acts as a filter. If the article is not about a geopolitical conflict, it is dropped. If it *is* a conflict, the AI is prompted to act as an OSINT analyst, extracting:
    *   A 2-sentence analytical summary.
    *   The precise Latitude and Longitude. *(If a specific city is not found, it falls back to the capital of the mentioned country).*
    *   A calculated Confidence Score (0-100).
    *   A standardized Attack Category *(e.g., Kinetic: Air & Missile, Cyber & Electronic Warfare, Civil Unrest).*
4.  **Storage:** The Python script parses the returned JSON and inserts it directly into the Supabase PostgreSQL table.
5.  **Visualization:** When a user opens the dashboard hosted on Vercel, it fetches the latest nodes from Supabase and renders them chronologically in the feed and spatially on the Leaflet map.

---

## The Zero-Cost Serverless Architecture
One of the most significant engineering achievements of this project is its hosting model. **This entire pipeline operates at a cost of $0.00/month.**

Traditional web scrapers require renting a private Virtual Private Server (VPS) running 24/7 on AWS, DigitalOcean, or Google Cloud. By utilizing a *Serverless Polling* approach, this project bypasses standard hosting fees completely:

*   **No VPS Required:** The 24/7 scraping requirement is offloaded to GitHub Actions. By utilizing cron jobs, GitHub provides the compute power for free, running the script and immediately shutting down.
*   **Free-Tier AI:** By utilizing the Gemini Flash-Lite API and incorporating a `time.sleep()` rate-limiter, the script stays well within Google's generous free tier requests-per-minute (RPM) limits. BUT IT DOESN"T I STILL GET GEMINI QUOTA REACHED 😭😭
*   **Open Source Mapping:** Instead of paying for map tile loads via commercial providers, the project utilizes Leaflet and OpenStreetMap, ensuring the frontend can scale to thousands of users without triggering API billing traps.
*   **Managed Database & Hosting:** Supabase and Vercel handle the heavy lifting of database hosting and frontend delivery entirely within their hobby/developer tiers.

---

## Future Improvements 
While the core pipeline is fully operational, this tool is designed to be scaled into a professional-grade intelligence platform. The following architectural upgrades are planned for future iterations:

**1. Semantic Deduplication (RAG / Vector Filtering)**
Currently, deduplication relies on exact URL or headline matching. Future versions will utilize `pgvector` in Supabase. The AI will generate a mathematical embedding of the news event. If a new RSS feed reports the same bombing with different words, the system will recognize the *semantic similarity* (e.g., > 92% match) and drop the duplicate, preventing map clutter.

**2. Advanced Ingestion & Tiered RSS Filtering**
General news feeds include high amounts of irrelevant data (sports, weather). The pipeline will be upgraded to include specialized OSINT, maritime, and flight-tracking feeds. A pre-filter regex script will discard non-military keywords before the data ever reaches the AI.

**3. Spatial Clustering (Overlapping Nodes)**
When multiple events occur in a single dense location (e.g., Kyiv or Tehran), map markers currently stack on top of one another. Implementation of Leaflet marker clustering will group nearby events into a single node that "spiderifies" or expands upon clicking.

**4. Synchronized UX Navigation (FlyTo)**
To improve the command-center feel, the frontend state management will be upgraded. Clicking an event card in the side-feed will trigger a smooth, animated camera flight (`map.flyTo`) directly to the corresponding coordinates on the map, opening its detailed intelligence modal automatically.
