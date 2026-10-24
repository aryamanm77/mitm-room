import streamlit as st
import json
import os
import requests
import streamlit.components.v1 as components

# Streamlit Page Configuration
st.set_page_config(
    page_title="LOCOROM • Campus Indoor Navigation",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

GITHUB_REPO = "2005lakshmi/locorom"
BRANCH = "main"
BASE_PATH = "Rooms"

# Premium CSS Theme Injection
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    /* Header Gradient & Hero */
    .hero-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%);
        border: 1px solid rgba(99, 102, 241, 0.25);
        border-radius: 18px;
        padding: 20px 28px;
        margin-bottom: 24px;
        backdrop-filter: blur(12px);
    }
    
    .hero-title-box h1 {
        font-family: 'Outfit', sans-serif;
        font-size: 32px;
        font-weight: 800;
        background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1.1;
    }
    
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #10b981;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 4px;
    }
    
    .hero-badge .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: #10b981;
        box-shadow: 0 0 8px #10b981;
    }
    
    .logo-img {
        width: 64px;
        height: 64px;
        border-radius: 14px;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 4px;
    }
    
    /* Card Styling */
    .room-card-header {
        background: rgba(17, 24, 39, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
    }
    
    .room-title-text {
        font-family: 'Outfit', sans-serif;
        font-size: 26px;
        font-weight: 700;
        color: #f8fafc;
        margin-bottom: 8px;
    }
    
    .floor-badge {
        background: rgba(99, 102, 241, 0.15);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 9999px;
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .wayfinding-box {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05));
        border: 1px solid rgba(99, 102, 241, 0.25);
        border-radius: 14px;
        padding: 16px 20px;
        margin: 16px 0;
    }
    
    .wayfinding-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #38bdf8;
        margin-bottom: 4px;
    }
    
    .wayfinding-text {
        font-size: 15px;
        font-weight: 500;
        color: #f1f5f9;
        line-height: 1.5;
    }
    
    /* Hide Streamlit default branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# Helper: Load repository index
@st.cache_data(ttl=3600)
def load_rooms_catalog():
    # 1. Try local rooms_data.json
    local_json_path = os.path.join(os.path.dirname(__file__), "rooms_data.json")
    if os.path.exists(local_json_path):
        try:
            with open(local_json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
            
    # 2. Try remote raw GitHub
    raw_json_url = f"https://raw.githubusercontent.com/{GITHUB_REPO}/{BRANCH}/rooms_data.json"
    try:
        resp = requests.get(raw_json_url, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
        
    return {}

def resolve_url(path):
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"https://raw.githubusercontent.com/{GITHUB_REPO}/{BRANCH}/{path}"

def render_swiper_carousel(files, carousel_id="locorom_sw"):
    if not files:
        st.info("No media walkthrough available for this route.")
        return
        
    slides_html = ""
    thumbs_html = ""
    for idx, f in enumerate(files):
        url = resolve_url(f)
        is_video = f.lower().endswith((".mp4", ".webm"))
        
        if is_video:
            media_elem = f'<video controls playsinline preload="metadata" style="max-height: 480px; width: 100%; border-radius: 12px;"><source src="{url}" type="video/mp4"></video>'
        else:
            media_elem = f'<img src="{url}" alt="Step {idx+1}" style="max-height: 480px; width: 100%; object-fit: contain; border-radius: 12px;">'
            
        slides_html += f'<div class="swiper-slide">{media_elem}</div>'
        thumbs_html += f'<div class="swiper-slide"><img src="{url}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;"></div>'

    html_code = f"""
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <style>
        .swiper-container-wrap {{
            background: #090d16;
            border-radius: 16px;
            padding: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            margin: 12px 0 24px 0;
        }}
        .swiper-main {{
            width: 100%;
            height: 480px;
            border-radius: 12px;
            background: #030712;
        }}
        .swiper-slide {{
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        .swiper-button-next, .swiper-button-prev {{
            color: #ffffff;
            background: rgba(15, 23, 42, 0.7);
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.2s;
        }}
        .swiper-button-next:hover, .swiper-button-prev:hover {{
            background: #6366f1;
            border-color: transparent;
        }}
        .swiper-button-next:after, .swiper-button-prev:after {{
            font-size: 16px;
            font-weight: bold;
        }}
        .swiper-thumbs {{
            height: 70px;
            margin-top: 12px;
        }}
        .swiper-thumbs .swiper-slide {{
            opacity: 0.4;
            cursor: pointer;
            border-radius: 6px;
            border: 2px solid transparent;
            overflow: hidden;
            transition: all 0.2s;
        }}
        .swiper-thumbs .swiper-slide:hover {{
            opacity: 0.8;
        }}
        .swiper-thumbs .swiper-slide-thumb-active {{
            opacity: 1;
            border-color: #6366f1;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
        }}
        .step-counter-badge {{
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 10;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(8px);
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }}
    </style>
    
    <div class="swiper-container-wrap">
        <div style="position:relative;">
            <div class="step-counter-badge" id="stepBadge_{carousel_id}">Photo Walkthrough</div>
            <div class="swiper swiper-main myMain_{carousel_id}">
                <div class="swiper-wrapper">
                    {slides_html}
                </div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-pagination"></div>
            </div>
        </div>
        
        <div class="swiper swiper-thumbs myThumbs_{carousel_id}">
            <div class="swiper-wrapper">
                {thumbs_html}
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    <script>
        const totalSlides = {len(files)};
        const thumbs = new Swiper('.myThumbs_{carousel_id}', {{
            spaceBetween: 8,
            slidesPerView: 5,
            freeMode: true,
            watchSlidesProgress: true,
        }});
        
        const main = new Swiper('.myMain_{carousel_id}', {{
            spaceBetween: 10,
            navigation: {{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            }},
            pagination: {{
                el: '.swiper-pagination',
                type: 'progressbar',
            }},
            thumbs: {{
                swiper: thumbs,
            }},
            on: {{
                slideChange: function () {{
                    const cur = this.realIndex + 1;
                    const b = document.getElementById('stepBadge_{carousel_id}');
                    if (b) b.textContent = 'Step ' + cur + ' of ' + totalSlides;
                }}
            }}
        }});
        document.getElementById('stepBadge_{carousel_id}').textContent = 'Step 1 of ' + totalSlides;
    </script>
    """
    components.html(html_code, height=620)

# ----------------- APP HEADER -----------------
st.markdown("""
<div class="hero-container">
    <div class="hero-title-box">
        <h1>LOCOROM</h1>
        <div class="hero-badge">
            <span class="dot"></span>
            <span>MITM Campus Indoor Navigation</span>
        </div>
    </div>
    <div>
        <img class="logo-img" src="https://raw.githubusercontent.com/2005lakshmi/locorom/main/logo_locorom.png" alt="Locorom Logo">
    </div>
</div>
""", unsafe_allow_html=True)

# Load catalog
rooms_data = load_rooms_catalog()

if not rooms_data:
    st.error("Could not load campus rooms catalog. Please check network connection.")
    st.stop()

# ----------------- SIDEBAR: SEARCH & FILTERS -----------------
with st.sidebar:
    st.markdown("### 🔍 Search Destinations")
    search_query = st.text_input("Room or Lab Name", "", placeholder="e.g. 415B, 205, CSBS, DSP").strip().lower()
    
    floor_options = [
        "All Floors",
        "Basement & Ground",
        "1st Floor",
        "2nd Floor",
        "3rd Floor",
        "4th Floor",
        "5th Floor",
        "Mechanical Block",
        "Campus Amenities"
    ]
    selected_floor = st.selectbox("Filter by Floor / Block", floor_options)
    
    # Filter rooms
    all_room_keys = list(rooms_data.keys())
    
    def matches_filter(key):
        room = rooms_data[key]
        if search_query:
            q_match = (
                search_query in key.lower() or
                (room.get("info") and search_query in room["info"].lower()) or
                (room.get("dept") and search_query in room["dept"].lower())
            )
            if not q_match:
                return False
                
        if selected_floor != "All Floors":
            if room.get("floor") != selected_floor:
                return False
                
        return True

    filtered_keys = [k for k in all_room_keys if matches_filter(k)]
    
    st.markdown(f"**Found {len(filtered_keys)} Destinations**")
    
    if filtered_keys:
        selected_room_name = st.radio("Select Destination", filtered_keys, label_visibility="collapsed")
    else:
        st.warning("No destinations match your search.")
        selected_room_name = None

# ----------------- MAIN VIEW -----------------
if selected_room_name:
    room = rooms_data[selected_room_name]
    
    # Destination Card Header
    dept_str = f" • <span style='color:#38bdf8;'>{room['dept']}</span>" if room.get("dept") else ""
    st.markdown(f"""
    <div class="room-card-header">
        <div class="room-title-text">📍 {room['name']}</div>
        <span class="floor-badge">{room.get('floor', 'MITM Campus')}</span>{dept_str}
    </div>
    """, unsafe_allow_html=True)

    access_points = room.get("accessPoints", [])
    direct_photos = room.get("photos", [])

    if access_points:
        # Multiple starting points tab selector
        if len(access_points) > 1:
            ap_names = [ap["name"] for ap in access_points]
            selected_ap_name = st.selectbox("Select Starting Access Point", ap_names)
            chosen_ap = next(ap for ap in access_points if ap["name"] == selected_ap_name)
        else:
            chosen_ap = access_points[0]

        # Wayfinding instructions banner
        info_text = chosen_ap.get("info") or room.get("info") or "Follow the visual photo path below."
        st.markdown(f"""
        <div class="wayfinding-box">
            <div class="wayfinding-label">Route Instructions from {chosen_ap['name']}:</div>
            <div class="wayfinding-text">{info_text}</div>
        </div>
        """, unsafe_allow_html=True)

        # Walkthrough Carousel
        render_swiper_carousel(chosen_ap.get("photos", []), carousel_id="ap_view")

    elif direct_photos:
        # Direct room photos
        info_text = room.get("info") or "Follow the visual corridor path to destination."
        st.markdown(f"""
        <div class="wayfinding-box">
            <div class="wayfinding-label">Route Instructions:</div>
            <div class="wayfinding-text">{info_text}</div>
        </div>
        """, unsafe_allow_html=True)
        render_swiper_carousel(direct_photos, carousel_id="direct_view")
    else:
        info_text = room.get("info") or "No walkthrough media currently uploaded."
        st.markdown(f"""
        <div class="wayfinding-box">
            <div class="wayfinding-label">Information:</div>
            <div class="wayfinding-text">{info_text}</div>
        </div>
        """, unsafe_allow_html=True)
else:
    st.info("👈 Use the search bar in the sidebar or select a floor to browse destinations.")
