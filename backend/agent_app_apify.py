import streamlit as st
import asyncio
import os
import logging
import json # Added for JSON parsing in display
from dotenv import load_dotenv
from google.genai import types as genai_types
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# --- Page Config (Set Favicon and Title) ---
# MUST be the first Streamlit command
st.set_page_config(page_title="Agents in the Wild", page_icon="🧠")

# --- Basic Setup ---
load_dotenv() # Ensure .env is loaded when imported
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Constants ---
MCP_SERVER_COMMAND = os.getenv("MCP_SERVER_COMMAND", "python")
# *** Point to the new Apify Actor server ***
MCP_SERVER_ARGS = os.getenv("APIFY_ACTOR_SERVER_ARGS", "apify_actor_server.py").split()
AGENT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-03-25")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
USER_ID = "streamlit_user" # Could potentially be made dynamic later
# *** Updated App Name ***
APP_NAME = "apify_actor_finder_agent"

# --- ADK Helper Functions ---

async def _initialize_adk_stack():
    """Initializes the ADK stack (tools, exit_stack)."""
    logger.info(f"Attempting to connect to Apify Actor MCP server ({MCP_SERVER_COMMAND} {' '.join(MCP_SERVER_ARGS)})...")
    server_params = StdioServerParameters(
        command=MCP_SERVER_COMMAND,
        args=MCP_SERVER_ARGS,
    )
    
    try:
        tools, exit_stack = await MCPToolset.from_server(connection_params=server_params)
        logger.info(f"Apify Actor MCP Toolset created successfully with {len(tools)} tools.")
        return tools, exit_stack
    except Exception as e:
        logger.error(f"Fatal error connecting to Apify Actor MCP server: {e}", exc_info=True)
        return None, None

def _create_apify_agent(tools):
    """Creates an ADK Agent for finding Apify Actors."""
    if not tools:
        logger.error("Cannot create Apify agent: No tools provided.")
        return None

    logger.info(f"Creating Apify Actor agent with {len(tools)} tools for model {AGENT_MODEL}.")
    # *** Updated instruction for Apify Actor expertise ***
    instruction = """You are an expert agent finding assistant. Your goal is to help users find relevant agents \
from a pre-loaded list using the available tools. Assume the list contains various agents from the Apify Store.

Available tools allow filtering agents by:

- Category (`find_actors_by_category`): Needs an agent category name (e.g., 'AI', 'DEVELOPER_TOOLS').
- Username (`find_actors_by_username`): Needs the publisher's username (e.g., 'apify').
- User Full Name (`find_actors_by_user_full_name`): Needs the publisher's full name (e.g., 'Apify').
- Agent Name (`find_actor_by_name`): Needs the exact agent name (e.g., 'website-content-crawler'). Case-insensitive.
- Agent ID (`find_actor_by_id`): Needs the exact agent ID (e.g., 'aYG0l9s7dbB7j3gbS'). Case-sensitive.
- Pricing Model (`filter_actors_by_pricing`): Needs the model name (e.g., 'FREE'). Case-insensitive.
- Notice (`filter_actors_by_notice`): Needs the notice value (e.g., 'NONE', 'BETA'). Case-insensitive.
- Total Runs (`filter_actors_by_total_runs`): Needs `min_runs` and/or `max_runs`.
- Total Users (`filter_actors_by_total_users`): Needs `min_users` and/or `max_users`.
- Rating (`filter_actors_by_rating`): Needs `min_rating` and/or `max_rating` (0.0-5.0).
- Total Builds (`filter_actors_by_total_builds`): Needs `min_builds` and/or `max_builds`.
- Users in Last 7 Days (`filter_actors_by_users_7_days`): Needs `min_users` and/or `max_users`.
- Users in Last 30 Days (`filter_actors_by_users_30_days`): Needs `min_users` and/or `max_users`.
- Users in Last 90 Days (`filter_actors_by_users_90_days`): Needs `min_users` and/or `max_users`.
- Total Metamorphs (`filter_actors_by_total_metamorphs`): Needs `min_metamorphs` and/or `max_metamorphs`.
- Bookmark Count (`filter_actors_by_bookmark_count`): Needs `min_bookmarks` and/or `max_bookmarks`.
- Keyword Search (`search_actors_by_keyword`): Searches title and description for a keyword. Case-insensitive.
- Last Run Date (`filter_actors_by_last_run`): Needs `start_date_iso` and/or `end_date_iso` in YYYY-MM-DD format.
- Top N (`top_n`): Returns the top N agents ranked by a specified field. Needs `field_name` (valid options: 'runs', 'users', 'users7d', 'users30d', 'users90d', 'builds', 'metamorphs', 'rating', 'bookmarks', 'lastRun'), `n` (the number of results), and optionally `descending` (True/False, defaults to True).

Tools can also provide detailed information or sort all available agents:

- `get_single_actor_details`: Fetches full details (like readme, input schema) for one specific agent using its ID or name (e.g., 'apify/website-content-crawler').
- `rank_actors_by_runs`
- `rank_actors_by_users`
- `rank_actors_by_rating`
- `rank_actors_by_bookmarks`
- `rank_actors_by_last_run`

When filtering by ranges (runs, users, rating, builds, etc.), you can specify just a minimum (e.g., `min_runs=1000`), just a maximum (e.g., `max_rating=4.0`), or both (e.g., `min_users=10`, `max_users=50`). Provide at least one bound for range filters.
When asked about dates (e.g., for `filter_actors_by_last_run`), make sure the user provides the date in YYYY-MM-DD format, or ask them for it. \
Be concise and helpful. If a tool returns an error, inform the user you couldn't complete the request due to a technical issue. \
If a tool returns many results, summarize the key details (title, user, rating, runs/users) of the first few (e.g., 3-5) and mention the total number found (check the 'total_found' and 'summary' field in the tool response). Don't just dump the raw JSON unless specifically asked. \
Always check the 'total_found' field before presenting results to know if any agents matched the criteria."""
    try:
        root_agent = LlmAgent(
            model=AGENT_MODEL,
            name=f'{APP_NAME}_agent_streamlit',
            instruction=instruction,
            tools=tools,
        )
        logger.info("Apify Actor Agent created successfully.")
        return root_agent
    except Exception as e:
        logger.error(f"Error creating LlmAgent for Apify Actors: {e}", exc_info=True)
        return None

# --- Main Streamlit App Logic (Async part) ---
async def run_agent_async():
    # Title handled by main_app (or run_agent below)

    # Check for API Key
    if not GOOGLE_API_KEY:
        st.error("🚨 GOOGLE_API_KEY environment variable not set. Please configure it in your .env file.", icon="🔑")
        st.stop()

    # *** Use Apify-specific session state keys ***
    apify_agent_messages_key = "apify_agent_messages"
    adk_initialized_key = "apify_agent_adk_initialized"
    mcp_tools_key = "apify_agent_mcp_tools"
    mcp_exit_stack_key = "apify_agent_mcp_exit_stack" # WARNING: Cleanup needs careful handling
    agent_key = "apify_agent_instance"
    session_service_key = "apify_agent_session_service"
    session_id_key = "apify_agent_session_id"
    runner_key = "apify_agent_runner"
    # *** Add key for template query state ***
    template_query_key = "apify_agent_template_query"

    # Initialize chat history specifically for the agent
    if apify_agent_messages_key not in st.session_state:
        st.session_state[apify_agent_messages_key] = []
        logger.info(f"Initialized {apify_agent_messages_key} in session state.")
        # Add the initial greeting message
        initial_greeting = "Hello! I am your Agents in the Wild Finder. How can I help you find an agent today?"
        st.session_state[apify_agent_messages_key].append({"role": "assistant", "content": initial_greeting})
        logger.info("Added initial assistant greeting for Apify agent.")

    # Initialize template query state if it doesn't exist
    if template_query_key not in st.session_state:
        st.session_state[template_query_key] = None

    # Initialize ADK components using session state ONCE per agent session
    if adk_initialized_key not in st.session_state:
        st.session_state[adk_initialized_key] = False
        # Initialize all related state variables together
        st.session_state[mcp_tools_key] = None
        st.session_state[mcp_exit_stack_key] = None
        st.session_state[agent_key] = None
        st.session_state[session_service_key] = None
        st.session_state[session_id_key] = None
        st.session_state[runner_key] = None
        logger.info("Apify Agent session state ADK variables initialized to None.")

    # Run initialization block if not already done for the agent
    if not st.session_state.get(adk_initialized_key, False):
        with st.spinner("Initializing Agents in the Wild and Tools... Please wait."): # Updated spinner text
            logger.info("Apify Agent ADK components not initialized. Starting initialization...")
            # 1. Get Tools and Exit Stack
            tools, exit_stack = await _initialize_adk_stack()

            if tools and exit_stack:
                st.session_state[mcp_tools_key] = tools
                st.session_state[mcp_exit_stack_key] = exit_stack # Store exit stack
                logger.info("Apify Agent tools and exit_stack obtained successfully.")

                # 2. Create Agent (using the updated function)
                agent = _create_apify_agent(st.session_state[mcp_tools_key]) # Updated function call
                st.session_state[agent_key] = agent

                if agent:
                    logger.info("Apify Agent instance created successfully.")
                    # 3. Create Session Service and Session
                    session_service = InMemorySessionService()
                    session = session_service.create_session(user_id=f"{USER_ID}_apify_agent", app_name=APP_NAME)
                    st.session_state[session_service_key] = session_service
                    st.session_state[session_id_key] = session.id
                    logger.info(f"Apify Agent session service and session ({session.id}) created.")

                    # 4. Create Runner
                    runner = Runner(
                        app_name=APP_NAME,
                        session_service=st.session_state[session_service_key],
                        agent=st.session_state[agent_key]
                    )
                    st.session_state[runner_key] = runner
                    logger.info("Apify Agent ADK Runner initialized.")

                    st.session_state[adk_initialized_key] = True # Mark initialization complete
                    logger.info("Apify Agent ADK components initialized and stored in session state. Rerunning...")
                    st.rerun()
                else:
                    st.error("Failed to create Apify agent instance. Cannot proceed.", icon="🤖")
                    logger.error("Apify Agent creation failed within initialization block.")
                    if st.session_state.get(mcp_exit_stack_key):
                        try:
                            await st.session_state[mcp_exit_stack_key].aclose()
                            st.session_state[mcp_exit_stack_key] = None
                            logger.info("Cleaned up Apify agent exit stack after failed agent creation.")
                        except Exception as cleanup_e:
                            logger.error(f"Error cleaning up Apify agent exit stack: {cleanup_e}")
                    st.stop()
            else:
                st.error("Failed to get tools from Apify Actor MCP server. Cannot proceed. Check server status.", icon="🚨")
                logger.error("Apify Agent tool initialization failed.")
                st.stop()

    # --- Sidebar Display (Tools and Example Queries) ---
    with st.sidebar:
        st.subheader("🛠️ Available Tools")
        if st.session_state.get(mcp_tools_key):
            # The tools object is a list of tool instances
            try:
                tools_list = st.session_state[mcp_tools_key]
                if tools_list:
                    # Assuming each tool object in the list has a 'name' attribute
                    tool_names = sorted([getattr(tool, 'name', 'Unknown Tool') for tool in tools_list])
                    for tool_name in tool_names:
                        st.write(f"- `{tool_name}`")
                else:
                    st.write("No tools loaded.")
            except Exception as e:
                logger.warning(f"Could not list tool names: {e}")
                st.write("Could not list tools.")
        else:
            st.write("Tools not initialized yet.")

        st.divider()
        st.subheader("🚀 Example Queries")
        example_queries = [
            "Find AI Actors",
            "Show me Actors by user 'apify'",
            "Which actors have more than 10000 runs?",
            "Rank actors by rating",
            "Tell me more about the 'apify/website-content-crawler' actor",
        ]
        for i, query in enumerate(example_queries):
             # Use unique keys for buttons
            if st.button(query, key=f"template_query_{i}"):
                st.session_state[template_query_key] = query
                # Rerun immediately when a template button is clicked
                st.rerun()

    # --- Use initialized components from session state ---
    agent = st.session_state.get(agent_key)
    runner = st.session_state.get(runner_key)
    session_id = st.session_state.get(session_id_key)

    if not agent or not runner or not session_id:
        logger.warning("Reached Apify agent chat section but ADK components are not fully initialized. Waiting for rerun.")
        st.warning("Agents in the Wild is initializing...", icon="⏳") # Updated warning text
        st.stop()

    # Display chat messages from history (using agent-specific key)
    for message in st.session_state[apify_agent_messages_key]:
        avatar = "🧠" if message["role"] == "assistant" else "🧑‍💻" # Use brain emoji for assistant
        with st.chat_message(message["role"], avatar=avatar):
            # Check if content is likely JSON and display as such
            content = message["content"]
            if isinstance(content, str) and content.strip().startswith(('{', '[')):
                try:
                    # Attempt to parse and pretty-print JSON
                    parsed_json = json.loads(content)
                    st.json(parsed_json)
                except json.JSONDecodeError:
                    # If not valid JSON, display as markdown
                    st.markdown(content)
            else:
                st.markdown(content)

    # Get user input (either from chat input or template query button)
    prompt_from_template = st.session_state.get(template_query_key)
    prompt_from_input = st.chat_input("Ask the AI Assistant about Apify Actors...") # Updated placeholder

    # Determine the prompt to use
    if prompt_from_template:
        prompt = prompt_from_template
        st.session_state[template_query_key] = None # Clear the template query state after using it
        logger.info(f"Using prompt from template button: {prompt}")
    else:
        prompt = prompt_from_input
        if prompt:
             logger.info(f"Using prompt from chat input: {prompt}")

    # Process the prompt if one exists
    if prompt:
        # Add user message to history and display
        st.session_state[apify_agent_messages_key].append({"role": "user", "content": prompt})
        with st.chat_message("user", avatar="🧑‍💻"): # Updated avatar
            st.markdown(prompt)

        # Prepare agent input (no specific context needed beyond instructions)
        agent_input = genai_types.Content(role='user', parts=[genai_types.Part(text=prompt)])

        # Run agent and display response
        with st.chat_message("assistant", avatar="🧠"): # Use brain emoji for assistant
            message_placeholder = st.empty()
            message_placeholder.markdown("Searching Apify Actors...") # Updated thinking message
            full_response = ""
            last_event = None

            try:
                logger.info(f"Running Apify Actor agent for session {session_id} with input: {prompt[:100]}...") # Log truncated input

                events_async = runner.run_async(
                    session_id=session_id,
                    user_id=f"{USER_ID}_apify_agent", # Use the agent-specific user ID
                    new_message=agent_input
                )

                async for event in events_async:
                    last_event = event
                    logger.debug(f"Apify Agent ASYNC EVENT: Type={type(event)}")
                    content = getattr(event, 'content', None)
                    if content and hasattr(content, 'parts'):
                        text_part = next((part.text for part in content.parts if hasattr(part, 'text') and part.text), None)
                        if text_part:
                            logger.debug(f"Apify Agent ASYNC EVENT: Found text part")
                            full_response = text_part # Update potential final response as text arrives

                        # Check for tool calls and results to display progress
                        tool_code = next((part.tool_code for part in content.parts if hasattr(part, 'tool_code') and part.tool_code), None)
                        tool_result = next((part.tool_result for part in content.parts if hasattr(part, 'tool_result') and part.tool_result), None)

                        if tool_code:
                            # Display the tool call
                            tool_name = getattr(tool_code, 'name', 'Unknown Tool')
                            message_placeholder.markdown(f"⚙️ Calling tool: `{tool_name}`...")
                            logger.info(f"Apify Agent calling tool: {tool_name}")
                            # Optionally log arguments if needed (can be verbose)
                            # logger.debug(f"Tool args: {tool_code.args}")
                        elif tool_result:
                             # Display the tool result (or a summary)
                             tool_name = getattr(tool_result, 'name', 'Unknown Tool')
                             # Keep the result concise in the UI, log the full result
                             result_preview = str(tool_result.result)[:200] # Show first 200 chars
                             if len(str(tool_result.result)) > 200:
                                 result_preview += "..."
                             message_placeholder.markdown(f"✅ Tool Result (`{tool_name}`):\n```\n{result_preview}\n```")
                             logger.info(f"Apify Agent received result from tool: {tool_name}")
                             logger.debug(f"Full tool result: {tool_result.result}")
                             # Maybe update placeholder again before final response?
                             message_placeholder.markdown(f"✅ Received result from `{tool_name}`. Processing...")


                logger.info(f"Finished processing Apify agent events for session {session_id}.")

                # Handle cases where no response was extracted
                if not full_response:
                     error_message = getattr(last_event, 'error_message', None) if last_event else None
                     if error_message:
                         logger.warning(f"Apify Agent run for session {session_id} resulted in an error: {error_message}")
                         full_response = f"Sorry, I encountered an error processing Apify Actor data: {error_message}" # Updated error text
                     # Check if last event was a tool result, maybe that's the intended output
                     elif last_event and hasattr(last_event, 'content') and hasattr(last_event.content, 'parts'):
                         tool_result_part = next((part.tool_result for part in last_event.content.parts if hasattr(part, 'tool_result')), None)
                         if tool_result_part:
                             logger.info(f"Apify Agent finished with a tool result, using that as response for session {session_id}.")
                             full_response = tool_result_part.result # Use the raw tool result string
                         else:
                             logger.warning(f"Apify Agent finished for session {session_id} but no final text response was extracted and last event wasn't tool result.")
                             full_response = "Sorry, I couldn't find relevant Apify Actors based on that query." # Updated error text
                     else:
                        logger.warning(f"Apify Agent finished for session {session_id} but no final text response was extracted.")
                        full_response = "Sorry, I couldn't find relevant Apify Actors based on that query." # Updated error text

                # Display the final response (could be text or JSON string from tool)
                if isinstance(full_response, str) and full_response.strip().startswith(('{', '[')):
                    try:
                        parsed_json = json.loads(full_response)
                        message_placeholder.json(parsed_json)
                    except json.JSONDecodeError:
                        message_placeholder.markdown(full_response)
                else:
                    message_placeholder.markdown(full_response)

            except Exception as e:
                logger.error(f"Error running Apify agent async loop for session {session_id}: {e}", exc_info=True)
                message_placeholder.error(f"An error occurred while searching Apify Actors: {e}") # Updated error text

            # Add assistant response to chat history
            st.session_state[apify_agent_messages_key].append({"role": "assistant", "content": full_response})

# Function to be called externally (e.g., from a main app or directly)
def run_apify_agent_app():
    """Runs the Streamlit UI for the Apify Actor Finder Agent."""
    st.header("Agents in the Wild") # Updated header
    asyncio.run(run_agent_async())


# --- Direct Execution Block (for testing agent_app_apify.py standalone) ---
if __name__ == "__main__":
    print("Running agent_app_apify.py directly...")
    run_apify_agent_app() # Use the specific function for this app 