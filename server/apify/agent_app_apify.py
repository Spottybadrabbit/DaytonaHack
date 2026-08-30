import asyncio
import os
import logging
from pprint import pprint
import json
import datetime

from apify_client import ApifyClientAsync
from apify_client._errors import ApifyApiError
from dotenv import load_dotenv

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def main():
    """
    Main async function to list actors and fetch their details.
    """
    # Load environment variables from .env file
    load_dotenv()
    apify_token = os.getenv('APIFY_TOKEN')

    if not apify_token:
        logging.error("APIFY_TOKEN not found in environment variables. Please create a .env file with APIFY_TOKEN=your_token_here.")
        return

    all_actor_details = []

    try:
        # Initialize the client directly, without async with
        client = ApifyClientAsync(token=apify_token)
        logging.info("Fetching list of actors...")
        actors_client = client.actors()

        # List all actors using pagination
        all_actors_list_items = []
        offset = 0
        limit = 100 # Adjust limit as needed, max is 1000
        while True:
            logging.info(f"Fetching actors from offset {offset}...")
            list_page = await actors_client.list(limit=limit, offset=offset)
            if not list_page.items:
                break
            all_actors_list_items.extend(list_page.items)
            # list_page doesn't directly have a 'total' or reliable 'count' for *all* actors, 
            # just for the current page. We stop when a page returns fewer items than the limit or is empty.
            if len(list_page.items) < limit: 
                 break
            offset += limit
            # Optional: Add a small delay to avoid hitting rate limits aggressively
            # await asyncio.sleep(0.1)


        logging.info(f"Found {len(all_actors_list_items)} actors. Fetching details...")

        # Create tasks to fetch details concurrently
        tasks = []
        for actor_item in all_actors_list_items:
            actor_id = actor_item.get('id')
            actor_name = actor_item.get('name')
            if actor_id:
                # Using actor_id is more reliable than name
                tasks.append(asyncio.create_task(fetch_actor_details(client, actor_id, actor_name)))
            else:
                 logging.warning(f"Actor item missing 'id': {actor_item}")


        # Gather results
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                # Log specific ApifyApiError details if available
                if isinstance(result, ApifyApiError):
                    logging.error(f"Apify API Error fetching details: {result.message} (Status: {result.status_code}, Type: {result.type})")
                else:
                    logging.error(f"Error fetching actor details: {result}")
            elif result:
                all_actor_details.append(result)

    except ApifyApiError as e:
        logging.error(f"Apify API Error during client operation: {e.message} (Status: {e.status_code}, Type: {e.type})")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

    # Print the collected details
    if all_actor_details:
        # logging.info(f"\n--- Collected Actor Details ({len(all_actor_details)}) ---")
        # pprint(all_actor_details) # Comment out pprint
        # Save the details to a JSON file that will be used by the frontend
        output_filename = 'server/apify/apify_actors.json'
        try:
            with open(output_filename, 'w', encoding='utf-8') as f:
                # Need to handle non-serializable types like datetime
                def default_serializer(obj):
                    if isinstance(obj, datetime.datetime):
                        return obj.isoformat()
                    raise TypeError(f'Object of type {obj.__class__.__name__} is not JSON serializable')
                
                json.dump(all_actor_details, f, indent=2, default=default_serializer)
            logging.info(f"Successfully saved {len(all_actor_details)} actor details to {output_filename}")
        except IOError as e:
            logging.error(f"Error writing actor details to {output_filename}: {e}")
        except TypeError as e:
             logging.error(f"Error serializing actor details to JSON: {e}")

    else:
        logging.info("No actor details were fetched.")

async def fetch_actor_details(client: ApifyClientAsync, actor_id: str, actor_name: str | None) -> dict | None:
    """
    Fetches details for a single actor by its ID.
    """
    try:
        # Add slight jitter/delay before each request to help with potential rate limits when fetching many details
        await asyncio.sleep(0.05 + 0.1 * os.urandom(1)[0] / 255) 
        logging.debug(f"Fetching details for actor ID: {actor_id} (Name: {actor_name or 'N/A'})...") # Changed to debug
        actor_client = client.actor(actor_id)
        details = await actor_client.get()
        if not details: # Check if details dict is empty or None
             logging.warning(f"Received empty details for actor ID: {actor_id}")
             return None
        # Select only some "important" fields, or return the whole dict
        important_details = {
            'id': details.get('id'),
            'name': details.get('name'),
            'username': details.get('username'),
            'title': details.get('title'),
            'description': details.get('description'),
            'thumbUrl': details.get('imageUrl') or details.get('thumbUrl'),
            'categories': details.get('categories'),
            'type': details.get('categoryMain') or 'Research',
            'stats': details.get('stats'), # Contains run counts etc.
            # 'versions': details.get('versions') # Often very large, uncomment if needed
        }
        return important_details
    except ApifyApiError as e:
        logging.error(f"API Error fetching details for {actor_id} ({actor_name}): {e.message} (Status: {e.status_code}, Type: {e.type})")
        return None
    except Exception as e:
         logging.error(f"Unexpected error fetching details for {actor_id} ({actor_name}): {e}")
         # Reraise or return None depending on desired behavior for unexpected errors
         # raise e # Uncomment to stop execution on unexpected errors
         return None

if __name__ == "__main__":
    # Need datetime for the serializer
    import datetime
    # Adjust logging level if desired (e.g., logging.DEBUG for more verbose output)
    # logging.getLogger().setLevel(logging.DEBUG)
    asyncio.run(main()) 