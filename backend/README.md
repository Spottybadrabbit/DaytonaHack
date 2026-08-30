
# Agent Marketplace with Apify Actor Finder

This project provides a web interface to browse and create agents, with a specific agent type ("Creative" with "website" source) that interacts with an Apify Actor finding assistant built using Google's Agent Development Kit (ADK).

## Prerequisites

*   **Python:** Version 3.9 or higher.
*   **Node.js:** Version 18 or higher.
*   **npm (or yarn/pnpm):** Node package manager.

## Setup

1.  **Clone the Repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Backend Setup (Python):**
    *   Navigate to the project root directory.
    *   **Create a virtual environment:**
        ```bash
        python -m venv venv 
        ```
    *   **Activate the virtual environment:**
        *   **macOS/Linux:**
            ```bash
            source venv/bin/activate
            ```
        *   **Windows (Command Prompt):**
            ```bash
            venv\Scripts\activate.bat
            ```
        *   **Windows (PowerShell):**
            ```bash
            venv\Scripts\Activate.ps1
            ```
        *(You should see `(venv)` prefixed to your shell prompt)*
    *   **Install Python dependencies:**
        ```bash
        pip install -r requirements.txt
        ```
    *   **Create Environment File:**
        Create a file named `.env` in the **project root** directory.
        Add your Google API key:
        GOOGLE_API_KEY=YOUR_ACTUAL_GOOGLE_API_KEY 
        # Optional: You might need to configure these if the defaults in agent_app_apify.py are not suitable
        # MCP_SERVER_COMMAND=python
        # APIFY_ACTOR_SERVER_ARGS=apify_actor_server.py 
        # GEMINI_MODEL=gemini-1.5-pro-preview-latest
        ```
        Replace `YOUR_ACTUAL_GOOGLE_API_KEY` with your key.

3.  **Frontend Setup (Node.js):**
    *   Navigate to the client directory:
        ```bash
        cd client
        ```
    *   **Install Node.js dependencies:**
        ```bash
        npm install 
        ```
        *(Use `yarn install` or `pnpm install` if you use those package managers)*
    *   Navigate back to the project root directory:
        ```bash
        cd ..
        ```

## Running the Application

**Important:** Ensure your Python virtual environment is activated before running the backend.

1.  **Run the Backend (Streamlit App):**
    Open a terminal in the **project root** directory and run:
    ```bash
    streamlit run backend/agent_app_apify.py
    ```
    This will start the Apify Actor Finder agent application, typically accessible at `http://localhost:8501`.

2.  **Run the Frontend (React App):**
    Open **another** terminal in the **project root** directory and run:
    ```bash
    cd client
    npm run dev
    ```
    This will start the main web interface, typically accessible at `http://localhost:5173` (check the terminal output for the exact URL).

## Accessing the Apps

*   **Main Interface:** Open your web browser to `http://localhost:5173` (or the URL provided by `npm run dev`).
*   **Apify Agent App:** Open your web browser to `http://localhost:8501`.

    *Note: When creating a new agent in the main interface, selecting "Creative" type and "website" source, and clicking the final "Create Agent" button will redirect you to the Apify Agent App (`http://localhost:8501`).*