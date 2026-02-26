export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">

                <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
                    Privacy Policy
                </h1>

                <p className="text-sm text-gray-600 mb-8 text-center">
                    Last Updated: {new Date().toLocaleDateString('en-GB')}
                </p>

                <div className="prose prose-lg max-w-none space-y-6 text-gray-700">

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            1. Introduction
                        </h2>
                        <p>
                            Welcome to the Kashif application ("we", "us", or "our"). We are committed to protecting your privacy and your personal data. This Privacy Policy explains how we collect, use, protect, and share your information when you use the Kashif mobile application ("the Application").
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            2. Information We Collect
                        </h2>

                        <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
                            2.1 Information You Provide Directly
                        </h3>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li><strong>Account Information:</strong> name, email address, phone number, password</li>
                            <li><strong>Reports:</strong> pothole images, description, date and time</li>
                            <li><strong>Profile:</strong> profile picture (optional)</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
                            2.2 Information We Collect Automatically
                        </h3>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li><strong>Location Data:</strong> precise GPS location to identify potholes and send safety alerts</li>
                            <li><strong>Device Information:</strong> device type, operating system, unique device identifier</li>
                            <li><strong>Usage Data:</strong> your interactions with the application, features used, usage times</li>
                            <li><strong>Logs:</strong> IP address, browser information, access times</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            3. How We Use Your Information
                        </h2>
                        <p>We use the information we collect for the following purposes:</p>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li>Provide, maintain, and improve application services</li>
                            <li>Process and display pothole reports</li>
                            <li>Send safety alerts when approaching reported potholes</li>
                            <li>Calculate points and rewards</li>
                            <li>Send important notifications and updates</li>
                            <li>Comply with applicable laws and regulations</li>
                            <li>Improve user experience and develop new features</li>
                            <li>Prevent fraud and ensure application security</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            4. Information Sharing
                        </h2>
                        <p>We do not sell your personal information. We may share your information in the following cases:</p>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li><strong>With Other Users:</strong> reports and approximate (non-precise) pothole locations are visible to all users</li>
                            <li><strong>With Government Authorities:</strong> pothole data may be shared with relevant authorities to improve infrastructure</li>
                            <li><strong>With Service Providers:</strong> partners assisting us in operating the application (hosting, analytics, etc.)</li>
                            <li><strong>Business Partners:</strong> companies participating in the voucher and rewards program</li>
                            <li><strong>Legal Compliance:</strong> when required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            5. Location Data
                        </h2>
                        <p>
                            The application uses location services to provide essential functionality:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li><strong>Foreground:</strong> to determine pothole location when creating a report</li>
                            <li><strong>Background:</strong> to automatically detect nearby potholes and send safety alerts</li>
                        </ul>
                        <p className="mt-2">
                            You can control location permissions through your device settings. Disabling location will limit application functionality.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            6. Data Security
                        </h2>
                        <p>
                            We take reasonable security measures to protect your information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li>Data encryption during transmission (HTTPS/TLS)</li>
                            <li>Secure password storage (hashing and salting)</li>
                            <li>User authentication and access control</li>
                            <li>Regular monitoring of suspicious activity</li>
                        </ul>
                        <p className="mt-2">
                            However, 100% security cannot be guaranteed on the internet. Use the application at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            7. Data Retention
                        </h2>
                        <p>
                            We retain your information as long as your account is active or as necessary to provide services. You may request account deletion at any time through application settings or by contacting us.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            8. Your Rights
                        </h2>
                        <p>You have the following rights regarding your personal data:</p>
                        <ul className="list-disc list-inside space-y-2 mr-4">
                            <li><strong>Access:</strong> request a copy of your data</li>
                            <li><strong>Correction:</strong> update or correct inaccurate information</li>
                            <li><strong>Deletion:</strong> request deletion of your account and data</li>
                            <li><strong>Objection:</strong> object to certain processing of your data</li>
                            <li><strong>Portability:</strong> obtain a copy of your data in a structured format</li>
                        </ul>
                        <p className="mt-2">
                            To exercise these rights, contact us at:
                            <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:underline">
                                contact@kashifroad.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            9. Children's Privacy
                        </h2>
                        <p>
                            The application is designed for users aged 18 or older. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child, please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            10. Changes to This Privacy Policy
                        </h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            11. Contact Us
                        </h2>
                        <p>
                            If you have any questions or concerns about this Privacy Policy, please contact us:
                        </p>
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p><strong>Email:</strong> <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:underline">contact@kashifroad.com</a></p>
                            <p><strong>Website:</strong> <a href="https://kashifroad.com" className="text-blue-600 hover:underline">https://kashifroad.com</a></p>
                            <p><strong>Admin Website:</strong> <a href="https://admin.kashifroad.com" className="text-blue-600 hover:underline">https://admin.kashifroad.com</a></p>
                        </div>
                    </section>

                    <section className="mt-8 p-6 bg-gray-100 rounded-lg">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Your Consent
                        </h2>
                        <p>
                            By using the Kashif application, you agree to the collection and use of your information as described in this Privacy Policy. If you do not agree, please do not use the application.
                        </p>
                    </section>

                </div>

                <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
                    <p>© 2026 Kashif – All rights reserved</p>
                    <p className="mt-2">Kashif Road Safety Reporter</p>
                </div>

            </div>
        </div>
    );
}