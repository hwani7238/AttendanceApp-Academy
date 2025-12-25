const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");

admin.initializeApp();

const db = admin.firestore();

// Aligo API Configuration
// TODO: Replace with actual credentials provided by the user
const ALIGO_API_KEY = "YOUR_ALIGO_API_KEY";
const ALIGO_USER_ID = "YOUR_ALIGO_USER_ID";
const SENDER_NUMBER = "YOUR_SENDER_NUMBER"; // Must match Aligo registered number
const ALIMTALK_TEMPLATE_CODE = "YOUR_TEMPLATE_CODE"; // Template code from Aligo

/**
 * Sends an Alimtalk via Aligo
 * @param {string} receiver Phone number of the receiver
 * @param {string} message Content of the message
 * @param {string} templateCode Alimtalk template code
 */
async function sendAlimtalk(receiver, message, templateCode) {
    try {
        const form = new FormData();
        form.append("key", ALIGO_API_KEY);
        form.append("userid", ALIGO_USER_ID);
        form.append("sender", SENDER_NUMBER);
        form.append("receiver", receiver);
        form.append("msg", message);
        form.append("tpl_code", templateCode);
        // Add other necessary fields for Aligo Alimtalk if required by their specific payload structure
        // e.g., button settings, failed fallback message (subject_1, message_1), etc.

        // Fallback to SMS if Alimtalk fails (Optional configuration)
        // form.append("failover", "Y");
        // form.append("fsubject", "Attendance Notification");
        // form.append("fmessage", message);

        const response = await axios.post("https://kakaoapi.aligo.in/akv10/alimtalk/send/", form, {
            headers: form.getHeaders(),
        });

        console.log("Aligo Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending Alimtalk:", error);
        throw error;
    }
}

exports.sendAttendanceNotification = functions.firestore
    .document("attendance/{docId}") // Verifying collection name...
    .onCreate(async (snap, context) => {
        const attendanceData = snap.data();
        const studentId = attendanceData.studentId;
        const studentName = attendanceData.name;
        const status = attendanceData.status;

        // TODO: Fetch parent's phone number from 'students' collection
        // This assumes there is a 'students' collection with the student's details
        let parentPhoneNumber = "";

        try {
            // Example: Fetching student doc to get parent's phone number
            // const studentDoc = await db.collection("students").doc(studentId).get();
            // if (studentDoc.exists) {
            //     parentPhoneNumber = studentDoc.data().parentPhoneNumber;
            // }

            // For now, logging until we confirm where the phone number is stored
            console.log(`Processing attendance for: ${studentName}, Status: ${status}`);

            if (!parentPhoneNumber) {
                console.log("Parent phone number not found. Skipping notification.");
                return;
            }

            // Construct message based on template
            // Note: The message content MUST match the registered template EXACTLY.
            // Variables usually look like #{variable_name} in the template.
            const message = `[Attendance Notification]\nStudent ${studentName} has marked attendance: ${status}.`;

            await sendAlimtalk(parentPhoneNumber, message, ALIMTALK_TEMPLATE_CODE);

        } catch (error) {
            console.error("Error processing attendance notification:", error);
        }
    });
