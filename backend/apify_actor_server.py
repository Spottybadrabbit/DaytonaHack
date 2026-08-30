# apify_actor_server.py
import json
import logging
import os
import sys
from typing import List, Dict, Any, Optional

from mcp.server.fastmcp import FastMCP

# Import actor filters
import apify_actor_filters as filters
# Import the function to get actor details
from get_actor import get_actor_details

# --- Global variable to hold actor data ---
ALL_ACTORS: List[Dict[str, Any]] = []

# --- Logging Setup ---
if not logging.getLogger().hasHandlers():
    logging.basicConfig(stream=sys.stderr, level=logging.INFO, format='Apify Actor MCP Server - %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# --- MCP Server Setup ---
mcp = FastMCP("Apify Actor Filtering Server")

# --- Helper to format results ---
def format_actor_result(data: List[Dict[str, Any]], tool_name: str, limit: int = 20) -> str:
    """Formats actor tool results as JSON, handling potential errors and limiting results."""
    total_found = len(data)
    summary = f"Found {total_found} matching actors."
    results_to_show = data
    if total_found > limit:
        summary += f" Showing the first {limit}."
        # Limit the fields shown for brevity in the list display
        results_to_show = [
            {
                "title": actor.get('title'),
                "username": actor.get('username'),
                "name": actor.get('name'),
                "rating": actor.get('actorReviewRating'), # Simplified field access
                "runs": filters.get_nested_value(actor, ['stats', 'totalRuns']),
                "users": filters.get_nested_value(actor, ['stats', 'totalUsers']),
                "category": actor.get('categories', [])[:1], # Show first category
                "pricing": filters.get_nested_value(actor, ['currentPricingInfo', 'pricingModel'])
            }
            for actor in data[:limit]
        ]
    else:
         # Show slightly more detail if fewer results
         results_to_show = [
            {
                "title": actor.get('title'),
                "username": actor.get('username'),
                "name": actor.get('name'),
                "rating": actor.get('actorReviewRating'),
                "runs": filters.get_nested_value(actor, ['stats', 'totalRuns']),
                "users": filters.get_nested_value(actor, ['stats', 'totalUsers']),
                "category": actor.get('categories', []), # Show all categories
                "pricing": filters.get_nested_value(actor, ['currentPricingInfo', 'pricingModel']),
                "lastRun": filters.get_nested_value(actor, ['stats', 'lastRunStartedAt'])
            }
            for actor in data
         ]

    response_content = {
        "summary": summary,
        "total_found": total_found,
        "results": results_to_show
    }
    try:
        # Use indent for slightly better readability if inspected, but not strictly needed
        return json.dumps(response_content, indent=2)
    except TypeError as e:
        logger.error(f"Error serializing results for tool {tool_name}: {e}")
        return json.dumps({"error": f"Could not serialize results for {tool_name}."})
    except Exception as e:
        logger.error(f"Unexpected error formatting results for tool {tool_name}: {e}", exc_info=True)
        return json.dumps({"error": f"Unexpected error formatting results for {tool_name}."})

# --- Actor Data Loading ---
def load_data(file_path="apify_actors.json") -> None:
    """Loads actor data from the JSON file into the global variable."""
    global ALL_ACTORS
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            ALL_ACTORS = json.load(f)
        if not isinstance(ALL_ACTORS, list):
            logger.error(f"Error: Data in {file_path} is not a list. Found {type(ALL_ACTORS)}.")
            ALL_ACTORS = []
        logger.info(f"Successfully loaded {len(ALL_ACTORS)} actors from {file_path}.")
    except FileNotFoundError:
        logger.error(f"Error: Actors file not found at {file_path}.")
        ALL_ACTORS = []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from {file_path}: {e}")
        ALL_ACTORS = []
    except Exception as e:
        logger.error(f"An unexpected error occurred during data loading: {e}", exc_info=True)
        ALL_ACTORS = []

# --- MCP Tool Definitions ---

@mcp.tool()
def find_actors_by_category(category: str) -> str:
    """
    Finds actors belonging to a specific category (case-insensitive).
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        category: The category to filter by (e.g., 'AI', 'DEVELOPER_TOOLS').
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_category(ALL_ACTORS, category)
    return format_actor_result(filtered, "find_actors_by_category")

@mcp.tool()
def find_actors_by_username(username: str) -> str:
    """
    Finds actors published by a specific username (case-insensitive).
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        username: The username to filter by (e.g., 'apify').
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_username(ALL_ACTORS, username)
    return format_actor_result(filtered, "find_actors_by_username")

@mcp.tool()
def find_actor_by_name(name: str) -> str:
    """
    Finds an actor by its exact name (case-insensitive).
    Returns a JSON string containing a summary and the matching actor (or empty list).
    Args:
        name: The exact actor name to search for (e.g., 'website-content-crawler').
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_name(ALL_ACTORS, name)
    # Usually expects 0 or 1 result for exact match
    return format_actor_result(filtered, "find_actor_by_name", limit=1)

@mcp.tool()
def find_actor_by_id(actor_id: str) -> str:
    """
    Finds an actor by its exact ID (case-sensitive).
    Returns a JSON string containing a summary and the matching actor (or empty list).
    Args:
        actor_id: The exact actor ID to search for (e.g., 'aYG0l9s7dbB7j3gbS').
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_id(ALL_ACTORS, actor_id)
    # Expects 0 or 1 result
    return format_actor_result(filtered, "find_actor_by_id", limit=1)

@mcp.tool()
def find_actors_by_user_full_name(user_full_name: str) -> str:
    """
    Finds actors published by a specific user's full name (case-insensitive).
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        user_full_name: The publisher's full name (e.g., 'Apify').
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_user_full_name(ALL_ACTORS, user_full_name)
    return format_actor_result(filtered, "find_actors_by_user_full_name")

@mcp.tool()
def filter_actors_by_notice(notice: str) -> str:
    """
    Filters actors based on their notice field (e.g., 'NONE', 'BETA'). Case-insensitive.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        notice: The notice value to filter by.
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_notice(ALL_ACTORS, notice)
    return format_actor_result(filtered, "filter_actors_by_notice")

@mcp.tool()
def filter_actors_by_pricing(pricing_model: str) -> str:
    """
    Filters actors based on their pricing model (e.g., 'FREE'). Case-insensitive.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        pricing_model: The pricing model to filter by.
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_pricing_model(ALL_ACTORS, pricing_model)
    return format_actor_result(filtered, "filter_actors_by_pricing")

@mcp.tool()
def filter_actors_by_min_runs(min_runs: int) -> str:
    """
    Filters actors that have at least a minimum number of total runs.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_runs: The minimum number of total runs required.
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_min_runs(ALL_ACTORS, min_runs)
    return format_actor_result(filtered, "filter_actors_by_min_runs")

@mcp.tool()
def filter_actors_by_min_users(min_users: int) -> str:
    """
    Filters actors that have at least a minimum number of total users.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_users: The minimum number of total users required.
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_min_users(ALL_ACTORS, min_users)
    return format_actor_result(filtered, "filter_actors_by_min_users")

@mcp.tool()
def filter_actors_by_min_rating(min_rating: float) -> str:
    """
    Filters actors that have at least a minimum review rating (0.0 to 5.0).
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_rating: The minimum review rating required.
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_min_rating(ALL_ACTORS, min_rating)
    return format_actor_result(filtered, "filter_actors_by_min_rating")

@mcp.tool()
def search_actors_by_keyword(keyword: str) -> str:
    """
    Searches for actors where the keyword appears in the title or description (case-insensitive).
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        keyword: The keyword to search for.
    """
    if not ALL_ACTORS: 
        return json.dumps({"error": "No actor data loaded."})
    
    try:
        if keyword is None:
            return json.dumps({"error": "No keyword provided. Please specify a search term."})
            
        filtered = filters.filter_by_keyword(ALL_ACTORS, keyword)
        return format_actor_result(filtered, "search_actors_by_keyword")
    except Exception as e:
        logger.error(f"Error in search_actors_by_keyword with keyword '{keyword}': {e}", exc_info=True)
        return json.dumps({"error": f"An error occurred while searching actors: {str(e)}"})

@mcp.tool()
def filter_actors_by_last_run(start_date_iso: Optional[str] = None, end_date_iso: Optional[str] = None) -> str:
    """
    Filters actors based on the date they were last run. Dates should be in YYYY-MM-DD format or full ISO 8601.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        start_date_iso: The start date of the range (inclusive).
        end_date_iso: The end date of the range (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    filtered = filters.filter_by_last_run_date_range(ALL_ACTORS, start_date_iso, end_date_iso)
    return format_actor_result(filtered, "filter_actors_by_last_run")

@mcp.tool()
def rank_actors_by_runs(descending: bool = True) -> str:
    """
    Sorts all actors by their total number of runs.
    Returns a JSON string containing a summary and a list of all actors sorted by runs (up to 20 shown).
    Args:
        descending: Sort from highest to lowest runs if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    ranked = filters.rank_by_total_runs(ALL_ACTORS, descending)
    return format_actor_result(ranked, "rank_actors_by_runs")

@mcp.tool()
def rank_actors_by_users(descending: bool = True) -> str:
    """
    Sorts all actors by their total number of users.
    Returns a JSON string containing a summary and a list of all actors sorted by users (up to 20 shown).
    Args:
        descending: Sort from highest to lowest users if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    ranked = filters.rank_by_total_users(ALL_ACTORS, descending)
    return format_actor_result(ranked, "rank_actors_by_users")

@mcp.tool()
def rank_actors_by_rating(descending: bool = True) -> str:
    """
    Sorts all actors by their review rating.
    Returns a JSON string containing a summary and a list of all actors sorted by rating (up to 20 shown).
    Args:
        descending: Sort from highest to lowest rating if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    ranked = filters.rank_by_actor_rating(ALL_ACTORS, descending)
    return format_actor_result(ranked, "rank_actors_by_rating")

@mcp.tool()
def rank_actors_by_bookmarks(descending: bool = True) -> str:
    """
    Sorts all actors by their bookmark count.
    Returns a JSON string containing a summary and a list of all actors sorted by bookmarks (up to 20 shown).
    Args:
        descending: Sort from highest to lowest bookmark count if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    ranked = filters.rank_by_bookmark_count(ALL_ACTORS, descending)
    return format_actor_result(ranked, "rank_actors_by_bookmarks")

@mcp.tool()
def rank_actors_by_last_run(descending: bool = True) -> str:
    """
    Sorts all actors by the date they were last run.
    Returns a JSON string containing a summary and a list of all actors sorted by last run date (up to 20 shown).
    Args:
        descending: Sort from newest to oldest last run date if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    ranked = filters.rank_by_last_run_date(ALL_ACTORS, descending)
    return format_actor_result(ranked, "rank_actors_by_last_run")

@mcp.tool()
def filter_actors_by_total_runs(min_runs: Optional[int] = None, max_runs: Optional[int] = None) -> str:
    """
    Filters actors that have total runs within a specified range [min_runs, max_runs].
    Provide at least one of min_runs or max_runs.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_runs: The minimum number of total runs required (inclusive).
        max_runs: The maximum number of total runs allowed (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_runs is None and max_runs is None:
        return json.dumps({"error": "Please provide at least min_runs or max_runs."})
    filtered = filters.filter_by_min_runs(ALL_ACTORS, min_runs, max_runs)
    return format_actor_result(filtered, "filter_actors_by_total_runs")

@mcp.tool()
def filter_actors_by_total_users(min_users: Optional[int] = None, max_users: Optional[int] = None) -> str:
    """
    Filters actors that have total users within a specified range [min_users, max_users].
    Provide at least one of min_users or max_users.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_users: The minimum number of total users required (inclusive).
        max_users: The maximum number of total users allowed (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_users is None and max_users is None:
        return json.dumps({"error": "Please provide at least min_users or max_users."})
    filtered = filters.filter_by_min_users(ALL_ACTORS, min_users, max_users)
    return format_actor_result(filtered, "filter_actors_by_total_users")

@mcp.tool()
def filter_actors_by_rating(min_rating: Optional[float] = None, max_rating: Optional[float] = None) -> str:
    """
    Filters actors that have a review rating within a specified range [min_rating, max_rating].
    Provide at least one of min_rating or max_rating.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_rating: The minimum review rating required (inclusive, 0.0-5.0).
        max_rating: The maximum review rating allowed (inclusive, 0.0-5.0).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_rating is None and max_rating is None:
        return json.dumps({"error": "Please provide at least min_rating or max_rating."})
    # Basic validation for rating range
    if min_rating is not None and (min_rating < 0 or min_rating > 5):
         return json.dumps({"error": "min_rating must be between 0.0 and 5.0"})
    if max_rating is not None and (max_rating < 0 or max_rating > 5):
         return json.dumps({"error": "max_rating must be between 0.0 and 5.0"})
    if min_rating is not None and max_rating is not None and min_rating > max_rating:
         return json.dumps({"error": "min_rating cannot be greater than max_rating"})

    filtered = filters.filter_by_min_rating(ALL_ACTORS, min_rating, max_rating)
    return format_actor_result(filtered, "filter_actors_by_rating")

@mcp.tool()
def filter_actors_by_total_builds(min_builds: Optional[int] = None, max_builds: Optional[int] = None) -> str:
    """
    Filters actors by total builds within a specified range [min_builds, max_builds].
    Provide at least one of min_builds or max_builds.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_builds: Minimum total builds (inclusive).
        max_builds: Maximum total builds (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_builds is None and max_builds is None:
        return json.dumps({"error": "Please provide at least min_builds or max_builds."})
    filtered = filters.filter_by_total_builds(ALL_ACTORS, min_builds, max_builds)
    return format_actor_result(filtered, "filter_actors_by_total_builds")

@mcp.tool()
def filter_actors_by_users_7_days(min_users: Optional[int] = None, max_users: Optional[int] = None) -> str:
    """
    Filters actors by users in the last 7 days within a specified range [min_users, max_users].
    Provide at least one of min_users or max_users.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_users: Minimum users in last 7 days (inclusive).
        max_users: Maximum users in last 7 days (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_users is None and max_users is None:
        return json.dumps({"error": "Please provide at least min_users or max_users."})
    filtered = filters.filter_by_users_7_days(ALL_ACTORS, min_users, max_users)
    return format_actor_result(filtered, "filter_actors_by_users_7_days")

@mcp.tool()
def filter_actors_by_users_30_days(min_users: Optional[int] = None, max_users: Optional[int] = None) -> str:
    """
    Filters actors by users in the last 30 days within a specified range [min_users, max_users].
    Provide at least one of min_users or max_users.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_users: Minimum users in last 30 days (inclusive).
        max_users: Maximum users in last 30 days (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_users is None and max_users is None:
        return json.dumps({"error": "Please provide at least min_users or max_users."})
    filtered = filters.filter_by_users_30_days(ALL_ACTORS, min_users, max_users)
    return format_actor_result(filtered, "filter_actors_by_users_30_days")

@mcp.tool()
def filter_actors_by_users_90_days(min_users: Optional[int] = None, max_users: Optional[int] = None) -> str:
    """
    Filters actors by users in the last 90 days within a specified range [min_users, max_users].
    Provide at least one of min_users or max_users.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_users: Minimum users in last 90 days (inclusive).
        max_users: Maximum users in last 90 days (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_users is None and max_users is None:
        return json.dumps({"error": "Please provide at least min_users or max_users."})
    filtered = filters.filter_by_users_90_days(ALL_ACTORS, min_users, max_users)
    return format_actor_result(filtered, "filter_actors_by_users_90_days")

@mcp.tool()
def filter_actors_by_total_metamorphs(min_metamorphs: Optional[int] = None, max_metamorphs: Optional[int] = None) -> str:
    """
    Filters actors by total metamorphs within a specified range [min_metamorphs, max_metamorphs].
    Provide at least one of min_metamorphs or max_metamorphs.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_metamorphs: Minimum total metamorphs (inclusive).
        max_metamorphs: Maximum total metamorphs (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_metamorphs is None and max_metamorphs is None:
        return json.dumps({"error": "Please provide at least min_metamorphs or max_metamorphs."})
    filtered = filters.filter_by_total_metamorphs(ALL_ACTORS, min_metamorphs, max_metamorphs)
    return format_actor_result(filtered, "filter_actors_by_total_metamorphs")

@mcp.tool()
def filter_actors_by_bookmark_count(min_bookmarks: Optional[int] = None, max_bookmarks: Optional[int] = None) -> str:
    """
    Filters actors by bookmark count within a specified range [min_bookmarks, max_bookmarks].
    Provide at least one of min_bookmarks or max_bookmarks.
    Returns a JSON string containing a summary and a list of matching actors (up to 20 shown).
    Args:
        min_bookmarks: Minimum bookmark count (inclusive).
        max_bookmarks: Maximum bookmark count (inclusive).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})
    if min_bookmarks is None and max_bookmarks is None:
        return json.dumps({"error": "Please provide at least min_bookmarks or max_bookmarks."})
    filtered = filters.filter_by_bookmark_count(ALL_ACTORS, min_bookmarks, max_bookmarks)
    return format_actor_result(filtered, "filter_actors_by_bookmark_count")

# New combined ranking and limiting tool
@mcp.tool()
def top_n(field_name: str, n: int, descending: bool = True) -> str:
    """
    Gets the top N actors ranked by a specific field.
    Returns a JSON string containing a summary and the top N actors.
    Args:
        field_name: The field to rank by. Valid options: 'runs', 'users', 'rating', 'bookmarks', 'lastRun'.
        n: The number of top actors to return (e.g., 10).
        descending: Sort from highest/newest to lowest/oldest if true (default: true).
    """
    if not ALL_ACTORS: return json.dumps({"error": "No actor data loaded."})

    valid_fields = {
        'runs': filters.rank_by_total_runs,
        'users': filters.rank_by_total_users,
        'users7d': filters.rank_by_users_7_days,
        'users30d': filters.rank_by_users_30_days,
        'users90d': filters.rank_by_users_90_days,
        'builds': filters.rank_by_total_builds,
        'metamorphs': filters.rank_by_total_metamorphs,
        'rating': filters.rank_by_actor_rating,
        'bookmarks': filters.rank_by_bookmark_count,
        'lastRun': filters.rank_by_last_run_date,
    }

    field_name_lower = field_name.lower()
    if field_name_lower not in valid_fields:
        return json.dumps({"error": f"Invalid field_name '{field_name}'. Valid options are: {list(valid_fields.keys())}"})

    if not isinstance(n, int) or n <= 0:
        return json.dumps({"error": f"Invalid value for n: '{n}'. Must be a positive integer."})

    # Get the appropriate ranking function
    rank_function = valid_fields[field_name_lower]

    try:
        # Rank all actors
        ranked_actors = rank_function(ALL_ACTORS, descending)
        # Format the result, limiting to N
        # Ensure the format function respects the limit 'n'
        tool_name = f"top_{n}_{field_name}"
        return format_actor_result(ranked_actors, tool_name, limit=n)
    except Exception as e:
        logger.error(f"Error executing top_n(field='{field_name}', n={n}): {e}", exc_info=True)
        return json.dumps({"error": f"An unexpected error occurred while ranking actors by {field_name}."})

@mcp.tool()
def get_single_actor_details(actor_id_or_name: str) -> str:
    """
    Fetches detailed information for a specific actor using its ID or name (username/name).
    This includes description, readme, input schema, etc.
    Returns the full JSON response from the Apify API.
    Args:
        actor_id_or_name: The actor's unique ID (e.g., 'aYG0l9s7dbB7j3gbS') or its full name (e.g., 'apify/website-content-crawler').
    """
    logger.info(f"Received request to fetch details for actor: {actor_id_or_name}")
    # The get_actor_details function handles the API call and token internally
    actor_details = get_actor_details(actor_id_or_name)

    if actor_details:
        try:
            # Return the 'data' part of the response which contains the actual actor details
            data_to_return = actor_details.get('data', actor_details) # Fallback to full response if 'data' key is missing
            # Limit the readme length for brevity in some cases, but for now return full
            # Consider adding a 'limit_readme' parameter if needed
            logger.info(f"Successfully fetched details for {actor_id_or_name}")
            return json.dumps(data_to_return, indent=2)
        except TypeError as e:
            logger.error(f"Error serializing details for actor {actor_id_or_name}: {e}")
            return json.dumps({"error": f"Could not serialize details for actor {actor_id_or_name}."})
        except Exception as e:
            logger.error(f"Unexpected error formatting details for {actor_id_or_name}: {e}", exc_info=True)
            return json.dumps({"error": f"Unexpected error formatting details for {actor_id_or_name}."})
    else:
        logger.warning(f"Failed to fetch details for actor {actor_id_or_name} (returned None from get_actor_details).")
        return json.dumps({"error": f"Failed to fetch details for actor '{actor_id_or_name}'. It might not exist or there was an API issue."})

# --- Main Server Execution ---
if __name__ == '__main__':
    # Load the actor data when the server starts
    load_data() # Load actor data

    if not ALL_ACTORS:
         logger.warning("No actor data loaded. Actor tools may return empty results or errors.")
    else:
        logger.info(f"Loaded {len(ALL_ACTORS)} actors.")

    # Start FastMCP server
    logger.info(f"Starting Apify Actor Filtering MCP server (STDIO)...")
    mcp.run() 