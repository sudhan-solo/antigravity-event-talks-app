import os
import requests
import time
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
# Structure: { "data": [...], "timestamp": float }
cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION_SECS = 300 # 5 minutes

def parse_html_content(content_html, entry_id):
    if not content_html:
        return []
    soup = BeautifulSoup(content_html, 'html.parser')
    items = []
    
    current_type = "Update"
    current_elements = []
    
    for child in soup.contents:
        if getattr(child, 'name', None) == 'h3':
            if current_elements:
                items.append(create_item_dict(current_type, current_elements, entry_id, len(items)))
                current_elements = []
            current_type = child.get_text().strip()
        else:
            current_elements.append(child)
            
    if current_elements:
        items.append(create_item_dict(current_type, current_elements, entry_id, len(items)))
        
    return items

def create_item_dict(type_name, elements, entry_id, index):
    html_parts = []
    text_parts = []
    for el in elements:
        if hasattr(el, 'name'):
            html_parts.append(str(el))
            text_parts.append(el.get_text())
        else:
            html_parts.append(str(el))
            text_parts.append(str(el))
            
    html_content = "".join(html_parts).strip()
    text_content = " ".join("".join(text_parts).split()).strip()
    
    return {
        "id": f"{entry_id}-{index}",
        "type": type_name,
        "html": html_content,
        "text": text_content
    }

def fetch_and_parse_feed(force_refresh=False):
    global cache
    now = time.time()
    
    # Return cache if valid and refresh not forced
    if not force_refresh and cache["data"] is not None and (now - cache["timestamp"]) < CACHE_DURATION_SECS:
        return cache["data"], "cache_hit"
    
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        parsed_entries = []
        for entry in entries:
            title = entry.find('atom:title', ns).text
            entry_id = entry.find('atom:id', ns).text.split('#')[-1] if entry.find('atom:id', ns) is not None else title.replace(' ', '_')
            updated = entry.find('atom:updated', ns).text if entry.find('atom:updated', ns) is not None else ""
            link_elem = entry.find('atom:link', ns)
            link = link_elem.attrib.get('href', '') if link_elem is not None else ''
            content_html = entry.find('atom:content', ns).text if entry.find('atom:content', ns) is not None else ""
            
            parsed_items = parse_html_content(content_html, entry_id)
            
            parsed_entries.append({
                "date": title,
                "id": entry_id,
                "updated": updated,
                "link": link,
                "items": parsed_items
            })
            
        # Update cache
        cache["data"] = parsed_entries
        cache["timestamp"] = now
        return parsed_entries, "fetch_success"
        
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If fetch fails but we have stale cache, return it with a warning
        if cache["data"] is not None:
            return cache["data"], "fetch_failed_using_stale_cache"
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        data, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "source": status,
            "count": len(data),
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
