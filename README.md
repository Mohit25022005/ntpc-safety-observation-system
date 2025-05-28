
# NTPC Safety Management System

Overview

The NTPC Safety Management System is a web application designed to record safety observations for NTPC (National Thermal Power Corporation). It allows users to submit safety observations with details such as user ID, safety zone, EIC (Engineer-in-Charge), department, and an optional file upload (PDF, JPG, or DOC, up to 2MB). The application uses Express.js, Node.js, MongoDB, and Cloudinary to store data and files securely.

Features





Form Submission: Users can submit safety observations with required fields and an optional file upload.



File Storage: Uploaded files are stored in Cloudinary under the ntpc_safety_observations folder.



Data Storage: Observation data is stored in a MongoDB database (ntpc_safety database, observations collection).



Validation: Ensures all required fields are filled and validates file types and sizes.



Feedback: Displays success or error messages after form submission.



View Observations: A dedicated page (/observations) lists all submitted observations with links to uploaded files.

Tech Stack





Backend: Node.js, Express.js



Database: MongoDB (using Mongoose)



File Storage: Cloudinary



Frontend: EJS (Embedded JavaScript) for templating



Middleware: Multer (for file uploads), Morgan (for logging)



Environment: Managed with dotenv

Project Structure

ntpc-safety-system/
├── config/
│   ├── cloudinary.js         # Cloudinary configuration
│   ├── constants.js          # Constants for zones, EIC, departments
│   └── db.js                 # MongoDB connection configuration
├── controllers/
│   └── observationController.js  # Business logic for handling requests
├── middleware/
│   ├── errorHandler.js       # Global error handler
│   └── validateForm.js       # Form validation middleware
├── models/
│   └── Observation.js        # MongoDB schema for observations
├── public/
│   └── styles.css            # CSS for styling the frontend
├── routes/
│   └── observationRoutes.js  # API routes
├── views/
│   ├── index.ejs             # Form page
│   └── observations.ejs      # Page to view all observations
├── .env                      # Environment variables
├── app.js                    # Main application file
├── package.json              # Project dependencies and scripts
└── README.md                 # Project documentation

Prerequisites

Before setting up the project, ensure you have the following installed:





Node.js (v20.16.0 or later recommended)



MongoDB (running locally on mongodb://localhost/ntpc_safety)



Cloudinary Account: Sign up at cloudinary.com to get your Cloud Name, API Key, and API Secret.





Enable PDF delivery in Cloudinary Dashboard under Settings > Security > Allow delivery of PDF and ZIP files (required for free accounts).

Installation





Clone the Repository (if applicable):

git clone <repository-url>
cd ntpc-safety-system



Install Dependencies:

npm install



Set Up Environment Variables: Create a .env file in the project root and add the following:

MONGO_URI=mongodb://localhost/ntpc_safety
PORT=3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

Replace your_cloud_name, your_api_key, and your_api_secret with your Cloudinary credentials.



Ensure MongoDB is Running: Start your MongoDB server:

mongod

Verify that MongoDB is running on mongodb://localhost:27017.

Usage





Start the Application:

npm start

For development with auto-restart on file changes:

npm run dev



Access the Application:





Open your browser and navigate to http://localhost:3000.



You’ll see the form to record safety observations.



Submit an Observation:





Fill out the form with the required fields:





User ID



User Name



Safety Zone (dropdown)



Zone Leaders



EIC (Engineer-in-Charge, dropdown)



Department (dropdown)



EIC Mobile (10-digit number)



Specific Area/Location



Observation Description



Optionally upload a file (PDF, JPG, or DOC, up to 2MB).



Click Save to submit.



View Feedback:





On successful submission, you’ll be redirected to the form page with a green success message: "Observation Recorded Successfully!".



If there’s an error (e.g., missing fields or invalid file type), a red error message will be displayed (e.g., "All fields are required").



View All Observations:





Click the View All Observations link on the form page or navigate to http://localhost:3000/observations.



You’ll see a table listing all submitted observations, including links to uploaded files stored in Cloudinary.

Data Storage





Form Data:





Stored in MongoDB in the ntpc_safety database, observations collection.



Each observation includes fields like userId, userName, zone, uploadedFileUrl, etc.



Example document:

{
    "userId": "007388",
    "userName": "Bhupendra Singh",
    "zone": "ZONE-1 Boiler 1 and Aux Boiler",
    "zoneLeaders": "John Doe",
    "eic": "Dashok Kumar Patro",
    "department": "ELECT MAINT",
    "eicMobile": "9876543210",
    "location": "Boiler Room 1",
    "description": "Found a safety hazard near the boiler.",
    "uploadedFileUrl": "https://res.cloudinary.com/your_cloud_name/ntpc_safety_observations/abc123.pdf",
    "recordedAt": "2025-05-28T06:29:42.123Z"
}



Uploaded Files:





Stored in Cloudinary under the ntpc_safety_observations folder.



The uploadedFileUrl field in MongoDB contains the secure URL to the file.

Development

Adding New Features





Edit Observations: Add a route and form to edit existing observations.



Delete Observations: Implement a delete feature, ensuring files are also deleted from Cloudinary.



Authentication: Add user authentication (e.g., using Passport.js) to secure the application.

Running Tests

Currently, there are no automated tests. You can add testing with a framework like Mocha or Jest:

npm install mocha chai --save-dev

Debugging





Check server logs in the terminal for errors.



Use MongoDB Compass or the MongoDB shell to inspect the ntpc_safety database.



Verify file uploads in the Cloudinary Dashboard under the ntpc_safety_observations folder.

Known Issues





Error Handling: Errors are displayed on the form page, but form fields are not preserved after a failed submission. Consider adding logic to repopulate the form with user input.



Security: The application lacks user authentication. In a production environment, add authentication to restrict access.

Contributing





Fork the repository.



Create a new branch (git checkout -b feature/your-feature).



Make your changes and commit (git commit -m "Add your feature").



Push to the branch (git push origin feature/your-feature).



Create a Pull Request.

License

This project is licensed under the MIT License. See the LICENSE file for details (not included in this setup but recommended for production).

Contact

For support or inquiries, contact the development team at [your-email@example.com].

Generated on May 28, 2025.
