# Termageddon

Termageddon is a glossary management system designed for large teams. It allows for domain-specific definitions and includes a two-person approval process for new entries.

## Development Setup

This project consists of a Django backend and an Angular frontend.

### Prerequisites

*   Python 3.10+
*   Node.js 20+ (managed with `nvm` preferably)
*   `nvm` (Node Version Manager) - recommended

### Backend Setup

1.  **Create and activate a Python virtual environment:**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the development server:**

    ```bash
    python manage.py runserver
    ```

    The backend API will be available at `http://127.0.0.1:8000/`.

### Frontend Setup

1.  **Navigate to the frontend directory:**

    ```bash
    cd frontend
    ```

2.  **Install Node.js version and dependencies:**

    ```bash
    nvm use
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm start
    ```

    The frontend application will be available at `http://localhost:4200/`.

## Database Management

### Resetting the Database

A custom Django management command, `reset_db`, is provided to clear and repopulate the database.

*   **To reset and populate with test data:**

    ```bash
    python manage.py reset_db test_data/test_data.csv
    ```

    This command will:
    *   Delete all existing `Domain`, `Term`, and `Definition` records.
    *   Populate the database from the provided CSV file.
    *   Create test users with passwords matching their last names (in lowercase).
    *   Create a default superuser:
        *   **Username:** `admin`
        *   **Password:** `admin`

*   **To only clear the database:**

    ```bash
    python manage.py reset_db
    ```

## Additional Resources

*   [Django Documentation](https://docs.djangoproject.com/en/5.2/)
*   [Angular Documentation](https://angular.io/docs) 