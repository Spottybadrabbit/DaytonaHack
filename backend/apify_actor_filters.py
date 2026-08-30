import datetime
import math
from typing import List, Dict, Any, Optional
import pytz  # Import pytz for timezone handling

# Define type aliases for clarity
ActorType = Dict[str, Any]
ActorStatsType = Dict[str, Any]
ActorPricingType = Dict[str, Any]

# --- Helper Functions ---

def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime.datetime]:
    """Safely parse ISO 8601 datetime strings, handling potential None values and 'Z'."""
    if not dt_str:
        return None
    try:
        # Handle 'Z' for UTC timezone explicitly
        if dt_str.endswith('Z'):
            dt_str = dt_str[:-1] + '+00:00'
        dt_obj = datetime.datetime.fromisoformat(dt_str)
        # Ensure the datetime object is timezone-aware (assume UTC if no tzinfo)
        if dt_obj.tzinfo is None:
             dt_obj = dt_obj.replace(tzinfo=pytz.utc) # Use pytz for robust timezone handling
        return dt_obj
    except (ValueError, TypeError):
        # print(f"Warning: Could not parse datetime string: {dt_str}")
        return None

def get_nested_value(data: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
    """Safely get a nested value from a dictionary."""
    temp = data
    for key in keys:
        if isinstance(temp, dict) and key in temp:
            temp = temp[key]
        else:
            return default
    return temp

# --- Filtering Functions ---

def filter_by_category(
    actors: List[ActorType],
    category: str
) -> List[ActorType]:
    """Filters actors belonging to a specific category (case-insensitive)."""
    if not category: return actors
    target_category = category.lower()
    filtered_actors = []
    for actor in actors:
        categories = actor.get('categories', [])
        if isinstance(categories, list):
            if any(cat.lower() == target_category for cat in categories if isinstance(cat, str)):
                filtered_actors.append(actor)
    return filtered_actors

def filter_by_username(
    actors: List[ActorType],
    username: str
) -> List[ActorType]:
    """Filters actors by their username (case-insensitive)."""
    if not username: return actors
    target_username = username.lower()
    filtered_actors = []
    for actor in actors:
        actor_username = actor.get('username')
        if isinstance(actor_username, str) and actor_username.lower() == target_username:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_name(
    actors: List[ActorType],
    name: str
) -> List[ActorType]:
    """Filters actors by their exact name (case-insensitive)."""
    if not name: return actors
    target_name = name.lower()
    filtered_actors = []
    for actor in actors:
        actor_name = actor.get('name')
        if isinstance(actor_name, str) and actor_name.lower() == target_name:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_id(
    actors: List[ActorType],
    actor_id: str
) -> List[ActorType]:
    """Filters actors by their exact ID (case-sensitive)."""
    if not actor_id: return actors
    filtered_actors = []
    for actor in actors:
        act_id = actor.get('id')
        if isinstance(act_id, str) and act_id == actor_id:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_user_full_name(
    actors: List[ActorType],
    user_full_name: str
) -> List[ActorType]:
    """Filters actors by the publisher's full name (case-insensitive)."""
    if not user_full_name: return actors
    target_name = user_full_name.lower()
    filtered_actors = []
    for actor in actors:
        full_name = actor.get('userFullName')
        if isinstance(full_name, str) and full_name.lower() == target_name:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_notice(
    actors: List[ActorType],
    notice: str
) -> List[ActorType]:
    """Filters actors by their notice field (case-insensitive, e.g., 'NONE', 'BETA')."""
    if not notice: return actors
    target_notice = notice.lower()
    filtered_actors = []
    for actor in actors:
        actor_notice = actor.get('notice')
        if isinstance(actor_notice, str) and actor_notice.lower() == target_notice:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_pricing_model(
    actors: List[ActorType],
    pricing_model: str
) -> List[ActorType]:
    """Filters actors by their pricing model (case-insensitive). E.g., 'FREE'."""
    if not pricing_model: return actors
    target_model = pricing_model.lower()
    filtered_actors = []
    for actor in actors:
        model = get_nested_value(actor, ['currentPricingInfo', 'pricingModel'])
        if isinstance(model, str) and model.lower() == target_model:
            filtered_actors.append(actor)
    return filtered_actors

def filter_by_min_runs(
    actors: List[ActorType],
    min_runs: Optional[int] = None,
    max_runs: Optional[int] = None
) -> List[ActorType]:
    """Filters actors with total runs within the specified range [min_runs, max_runs]."""
    if min_runs is None and max_runs is None:
        return actors # No filter applied if no bounds are given

    filtered_actors = []
    for actor in actors:
        runs = get_nested_value(actor, ['stats', 'totalRuns'])
        if isinstance(runs, (int, float)):
            match_min = min_runs is None or runs >= min_runs
            match_max = max_runs is None or runs <= max_runs
            if match_min and match_max:
                filtered_actors.append(actor)
    return filtered_actors

def filter_by_min_users(
    actors: List[ActorType],
    min_users: Optional[int] = None,
    max_users: Optional[int] = None
) -> List[ActorType]:
    """Filters actors with total users within the specified range [min_users, max_users]."""
    if min_users is None and max_users is None:
        return actors

    filtered_actors = []
    for actor in actors:
        users = get_nested_value(actor, ['stats', 'totalUsers'])
        if isinstance(users, (int, float)):
            match_min = min_users is None or users >= min_users
            match_max = max_users is None or users <= max_users
            if match_min and match_max:
                filtered_actors.append(actor)
    return filtered_actors

def filter_by_min_rating(
    actors: List[ActorType],
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None
) -> List[ActorType]:
    """Filters actors with review rating within the specified range [min_rating, max_rating]."""
    if min_rating is None and max_rating is None:
        return actors

    filtered_actors = []
    for actor in actors:
        # Check both potential locations for rating
        rating = get_nested_value(actor, ['stats', 'actorReviewRating'])
        if rating is None:
             rating = actor.get('actorReviewRating')

        if isinstance(rating, (int, float)):
            # Clamp ratings to valid range if needed, though API likely ensures this
            # rating = max(0.0, min(5.0, rating))
            match_min = min_rating is None or rating >= min_rating
            match_max = max_rating is None or rating <= max_rating
            if match_min and match_max:
                filtered_actors.append(actor)
    return filtered_actors

def _filter_by_numeric_range(
    actors: List[ActorType],
    key_path: List[str],
    min_value: Optional[int | float] = None,
    max_value: Optional[int | float] = None
) -> List[ActorType]:
    """Helper to filter actors based on a numeric value within a range [min_value, max_value]."""
    if min_value is None and max_value is None:
        return actors

    filtered_actors = []
    for actor in actors:
        value = get_nested_value(actor, key_path)
        if isinstance(value, (int, float)):
            match_min = min_value is None or value >= min_value
            match_max = max_value is None or value <= max_value
            if match_min and match_max:
                filtered_actors.append(actor)
    return filtered_actors

def filter_by_total_builds(
    actors: List[ActorType],
    min_builds: Optional[int] = None,
    max_builds: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by total builds within the specified range [min_builds, max_builds]."""
    return _filter_by_numeric_range(actors, ['stats', 'totalBuilds'], min_builds, max_builds)

def filter_by_users_7_days(
    actors: List[ActorType],
    min_users: Optional[int] = None,
    max_users: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by users in the last 7 days within the specified range [min_users, max_users]."""
    return _filter_by_numeric_range(actors, ['stats', 'totalUsers7Days'], min_users, max_users)

def filter_by_users_30_days(
    actors: List[ActorType],
    min_users: Optional[int] = None,
    max_users: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by users in the last 30 days within the specified range [min_users, max_users]."""
    return _filter_by_numeric_range(actors, ['stats', 'totalUsers30Days'], min_users, max_users)

def filter_by_users_90_days(
    actors: List[ActorType],
    min_users: Optional[int] = None,
    max_users: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by users in the last 90 days within the specified range [min_users, max_users]."""
    return _filter_by_numeric_range(actors, ['stats', 'totalUsers90Days'], min_users, max_users)

def filter_by_total_metamorphs(
    actors: List[ActorType],
    min_metamorphs: Optional[int] = None,
    max_metamorphs: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by total metamorphs within the specified range [min_metamorphs, max_metamorphs]."""
    return _filter_by_numeric_range(actors, ['stats', 'totalMetamorphs'], min_metamorphs, max_metamorphs)

def filter_by_bookmark_count(
    actors: List[ActorType],
    min_bookmarks: Optional[int] = None,
    max_bookmarks: Optional[int] = None
) -> List[ActorType]:
    """Filters actors by bookmark count within the specified range [min_bookmarks, max_bookmarks]."""
    return _filter_by_numeric_range(actors, ['bookmarkCount'], min_bookmarks, max_bookmarks)

def filter_by_keyword(
    actors: List[ActorType],
    keyword: str
) -> List[ActorType]:
    """Filters actors where the keyword appears in the title or description (case-insensitive)."""
    if not keyword: return actors
    target_keyword = keyword.lower()
    filtered_actors = []
    for actor in actors:
        # Get title and description, ensuring they default to empty strings if None
        title = actor.get('title') or ''
        description = actor.get('description') or ''
        # Only call .lower() on strings
        if isinstance(title, str) and isinstance(description, str):
            title_lower = title.lower()
            description_lower = description.lower()
            if target_keyword in title_lower or target_keyword in description_lower:
                filtered_actors.append(actor)
    return filtered_actors

def filter_by_last_run_date_range(
    actors: List[ActorType],
    start_date_iso: Optional[str] = None,
    end_date_iso: Optional[str] = None
) -> List[ActorType]:
    """Filters actors last run within a specific date range (inclusive)."""
    start_range_dt = parse_iso_datetime(start_date_iso) if start_date_iso else None
    end_range_dt = parse_iso_datetime(end_date_iso) if end_date_iso else None

    # Adjust end_range_dt to be inclusive of the end date
    if end_range_dt:
        # Ensure it captures the whole day
        end_range_dt = end_range_dt.replace(hour=23, minute=59, second=59, microsecond=999999)


    filtered_actors = []
    for actor in actors:
        last_run_dt_str = get_nested_value(actor, ['stats', 'lastRunStartedAt'])
        last_run_dt = parse_iso_datetime(last_run_dt_str)

        if last_run_dt:
            match_start = start_range_dt is None or last_run_dt >= start_range_dt
            match_end = end_range_dt is None or last_run_dt <= end_range_dt # Inclusive end date
            if match_start and match_end:
                filtered_actors.append(actor)
    return filtered_actors

# --- Ranking Functions ---

def rank_actors(
    actors: List[ActorType],
    sort_key_path: List[str],
    default_value: Any,
    descending: bool = True
) -> List[ActorType]:
    """Generic ranking function for actors based on a nested key."""
    def get_sort_key(actor):
        value = get_nested_value(actor, sort_key_path)
        # Additional check if the key is top-level (like actorReviewRating)
        if value is None and len(sort_key_path) == 1:
            value = actor.get(sort_key_path[0])

        if isinstance(value, (int, float, datetime.datetime)):
            return value
        # Handle case where value might be None or wrong type
        # Return the provided default value directly if value is not sortable
        return default_value

    try:
        return sorted(actors, key=get_sort_key, reverse=descending)
    except TypeError as e:
        print(f"Warning: TypeError during sorting by {'->'.join(sort_key_path)}: {e}. Returning original list.")
        return actors
    except Exception as e:
        print(f"Warning: Error during sorting by {'->'.join(sort_key_path)}: {e}. Returning original list.")
        return actors


def rank_by_total_runs(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total runs."""
    return rank_actors(actors, ['stats', 'totalRuns'], float('-inf') if descending else 0, descending)

def rank_by_total_users(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total users."""
    return rank_actors(actors, ['stats', 'totalUsers'], float('-inf') if descending else 0, descending)

def rank_by_actor_rating(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by review rating."""
    # Try nested first, then top-level key based on example data
    # The generic rank_actors handles the fallback
    return rank_actors(actors, ['actorReviewRating'], float('-inf') if descending else 0, descending)


def rank_by_bookmark_count(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by bookmark count."""
    return rank_actors(actors, ['bookmarkCount'], float('-inf') if descending else 0, descending)

def rank_by_last_run_date(
    actors: List[ActorType],
    descending: bool = True # Default to newest first
) -> List[ActorType]:
    """Sorts actors by the date they were last run."""
    min_datetime = datetime.datetime.min.replace(tzinfo=pytz.utc)
    max_datetime = datetime.datetime.max.replace(tzinfo=pytz.utc)

    def get_sort_key(actor):
        dt_str = get_nested_value(actor, ['stats', 'lastRunStartedAt'])
        dt = parse_iso_datetime(dt_str)
        if dt is None:
            # Place Nones last in either sort order
            # Ascending (oldest first): Treat None as newest (max_datetime)
            # Descending (newest first): Treat None as oldest (min_datetime)
            return max_datetime if not descending else min_datetime
        return dt

    try:
        return sorted(
            actors,
            key=get_sort_key,
            reverse=descending
        )
    except Exception as e: # Catch potential comparison errors too
        print(f"Warning: Error during sorting by last run date: {e}. Returning original list.")
        return actors 

# New ranking function for users in last 30 days
def rank_by_users_30_days(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total users in the last 30 days."""
    return rank_actors(actors, ['stats', 'totalUsers30Days'], float('-inf') if descending else 0, descending)

# New ranking function for users in last 7 days
def rank_by_users_7_days(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total users in the last 7 days."""
    return rank_actors(actors, ['stats', 'totalUsers7Days'], float('-inf') if descending else 0, descending)

# New ranking function for users in last 90 days
def rank_by_users_90_days(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total users in the last 90 days."""
    return rank_actors(actors, ['stats', 'totalUsers90Days'], float('-inf') if descending else 0, descending)

# New ranking function for total builds
def rank_by_total_builds(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total builds."""
    return rank_actors(actors, ['stats', 'totalBuilds'], float('-inf') if descending else 0, descending)

# New ranking function for total metamorphs
def rank_by_total_metamorphs(
    actors: List[ActorType],
    descending: bool = True
) -> List[ActorType]:
    """Sorts actors by total metamorphs."""
    return rank_actors(actors, ['stats', 'totalMetamorphs'], float('-inf') if descending else 0, descending) 