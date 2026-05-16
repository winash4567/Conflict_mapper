import os
import json
import time
import feedparser
import google.generativeai as genai
from supabase import create_client, Client
from datetime import datetime

# Configuration: Add your target RSS feeds here
RSS_FEEDS = [
    "http://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"
    # Insert more RSS URLs here as needed
]

ALLOWED_CATEGORIES = [
    'Kinetic: Air & Missile', 
    'Kinetic: Ground Combat', 
    'Kinetic: Naval', 
    'Unmanned / Drone Activity', 
    'Cyber & Electronic Warfare', 
    'Terrorism & Insurgency', 
    'Infrastructure & Sabotage', 
    'Military Movement & Buildup', 
    'Civil Unrest & Protest', 
    'Diplomatic & Economic', 
    'Humanitarian Crisis', 
    'Other'
]

def init_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the environment.")
    return create_client(url, key)

def init_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY must be set in the environment.")
    genai.configure(api_key=api_key)
    
    # We use gemini-1.5-flash natively suited for fast & structured JSON output
    return genai.GenerativeModel(
        model_name="gemini-2.5-flash-lite",
        generation_config={"response_mime_type": "application/json"}
    )

def is_already_processed(supabase: Client, url: str) -> bool:
    """Checks if the URL is already present in the Supabase database."""
    try:
        response = supabase.table("conflict_events").select("primary_source_url").eq("primary_source_url", url).limit(1).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking Supabase for URL {url}: {e}")
        # Default to True to prevent accidental duplicates if the request fails
        return True

def analyze_event(model, title: str, summary: str, published_date: str):
    """Uses Gemini to determine if a news item is a conflict event and extracts structured data."""
    prompt = prompt = f"""
    You are an elite OSINT and geopolitical intelligence analyst. Analyze the following news article title and summary.
    
    Title: {title}
    Summary: {summary}
    
    1. Determine if this describes a 'conflict event' (military action, terrorism, civil unrest, major geopolitical movement).
       If NO, return an empty JSON object: {{}}
    
    2. If YES, extract the information into a JSON object with these exact keys:
       - "event_timestamp": ISO format timestamp.
       - "latitude": Float. 
       - "longitude": Float.
       - "area_name": Name of the city, region, or country.
       - "location_precision": MUST be one of ["Exact", "City", "Region", "Country"].
       - "attack_category": MUST be exactly one of: {json.dumps(ALLOWED_CATEGORIES)}.
       - "ai_score": Confidence score 0-100.
       - "summary": 1-2 sentence summary.

    GEOLOCATION RULES:
    - If a specific city/location is mentioned, provide its coordinates and set precision to "Exact" or "City".
    - IF THE SPECIFIC LOCATION IS UNKNOWN: Use the coordinates of the country's Capital City or the center of the Region mentioned.
    - If you use a Capital City because the specific location is vague, set "location_precision" to "Country".
    - NEVER return null for latitude/longitude if a country is known.
    
    Only return raw JSON.
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        
        return json.loads(text)
    except Exception as e:
        print(f"Error analyzing with Gemini: {e}")
        return None
    
def main():
    print(f"[{datetime.utcnow().isoformat()}] Starting news scraper pipeline...")
    
    try:
        supabase = init_supabase()
        model = init_gemini()
    except Exception as e:
        print(f"Initialization Error: {e}")
        return

    processed_count = 0
    added_count = 0

    for feed_url in RSS_FEEDS:
        print(f"\nFetching RSS feed: {feed_url}")
        feed = feedparser.parse(feed_url) 
        
        for entry in feed.entries:
            url = getattr(entry, 'link', '')
            title = getattr(entry, 'title', '')
            summary = getattr(entry, 'description', getattr(entry, 'summary', ''))
            published_date = getattr(entry, 'published', '')
            
            if not url or not title:
                continue
                
            if is_already_processed(supabase, url):
                print(f"  [SKIP] Already processed: {title}")
                continue
            
            print(f"  [ANALYZE] New article: {title}")

            analysis = analyze_event(model, title, summary, published_date)

            time.sleep(4)
            
            # If the dict is not empty and contains attack_category, insert it
            if analysis and analysis.get("attack_category"):
                insert_data = analysis.copy()
                insert_data["primary_source_url"] = url
                
                try:
                    supabase.table("conflict_events").insert(insert_data).execute()
                    print(f"  [✔ SUCCESS] Inserted conflict event!")
                    added_count += 1
                except Exception as e:
                    print(f"  [✖ ERROR] Failed to insert into Supabase: {e}")
            else:
                print("  [IGNORE] Not considered a conflict event.")
                
            processed_count += 1

    print(f"\nPipeline finished. Processed {processed_count} new articles, found and stored {added_count} events.")
    
if __name__ == "__main__":
    main()
