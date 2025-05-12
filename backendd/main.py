from fastapi import FastAPI
from datetime import datetime
import asyncio
import httpx
from typing import List, Dict
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Initialize Firebase Admin SDK
cred = credentials.Certificate("/Users/adityachand/Documents/AdityaStore/BigProject/jobkrfill/backend/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.get("/")
async def root():
    return {"message": "✅ API Monitoring System is running!"}

async def ping_until_success(url: str, max_attempts: int = 10, delay: int = 5):
    """Ping URL until we get 200 OK or max attempts reached"""
    attempt = 1
    async with httpx.AsyncClient(timeout=10) as client:
        while attempt <= max_attempts:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    print(f"✅ Successfully pinged {url} (attempt {attempt})")
                    return True
                else:
                    print(f"⚠️ Attempt {attempt}: {url} returned {response.status_code}")
            except Exception as e:
                print(f"❌ Attempt {attempt}: Error pinging {url} - {str(e)}")
            
            attempt += 1
            await asyncio.sleep(delay)
    
    print(f"🚨 Failed to get successful ping for {url} after {max_attempts} attempts")
    return False

async def ping_single_api_and_update(user_id: str, api: Dict):
    url = api['url']
    doc_ref = db.collection('users').document(user_id)

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(url)
            status = '✅ UP' if response.status_code == 200 else f'⚠️ {response.status_code}'
        except Exception as e:
            status = f'❌ DOWN ({str(e)})'

    # Update Firestore
    user_doc = doc_ref.get().to_dict()
    updated_apis = []
    for item in user_doc.get('apis', []):
        if item['id'] == api['id']:
            item['status'] = status
            item['lastPing'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        updated_apis.append(item)

    doc_ref.update({'apis': updated_apis})
    print(f"[{user_id}] 🔁 Updated {url} as '{status}'")

async def initialize_monitoring():
    """First pass: print all URLs and ping until success"""
    print("\n🔍 Initializing API Monitoring System...")
    users_ref = db.collection('users')
    users = users_ref.stream()

    all_apis = []
    for user in users:
        user_data = user.to_dict()
        user_id = user.id
        apis = user_data.get('apis', [])
        
        if apis:
            print(f"\n👤 User {user_id} has {len(apis)} APIs:")
            for api in apis:
                print(f"  - {api['url']}")
                all_apis.append((user_id, api))
    
    print("\n🚦 Initial ping test (will retry until 200 OK or max attempts reached)")
    for user_id, api in all_apis:
        await ping_until_success(api['url'])
    
    print("\n🎉 All APIs initialized. Starting regular monitoring...")

async def regular_monitoring():
    """Regular 5-minute interval monitoring"""
    while True:
        print(f"\n🔄 Regular monitoring cycle at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        users_ref = db.collection('users')
        users = users_ref.stream()

        tasks = []
        for user in users:
            user_data = user.to_dict()
            user_id = user.id
            apis = user_data.get('apis', [])

            if apis:
                print(f"👤 Monitoring {len(apis)} APIs for user {user_id}")
                for api in apis:
                    tasks.append(ping_single_api_and_update(user_id, api))
        
        await asyncio.gather(*tasks)
        await asyncio.sleep(5 * 60)  # Wait 5 minutes

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting API Monitoring System...")
    await initialize_monitoring()
    asyncio.create_task(regular_monitoring())