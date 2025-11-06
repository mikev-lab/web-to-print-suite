# Firestore Seeding Script

This script populates the Firestore database with initial data for the `products` and `pricing_matrix` collections.

## Prerequisites

1.  **Node.js:** Ensure you have Node.js installed (version 18 or higher).
2.  **Dependencies:** Install the required dependencies by running `npm install` from the `mce-suite` directory.
3.  **Firebase Authentication:**
    *   You need a Firebase service account key to run this script. If you don't have one, create one in the Firebase console for your project.
    *   Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your service account key file. For example:
        ```bash
        export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
        ```

## Running the Script

Once you have completed the prerequisites, you can run the script from the `mce-suite` directory using the following command:

```bash
node apps/scripts/seed.mjs
```
