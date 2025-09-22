import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendAdminOTP, verifyAdminOTP } from "../api/user";
import { useAuth } from "../components/AuthContext";
import OTPVerification from "../components/OTPVerification";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("email"); // "email" or "otp"
  const [otpData, setOtpData] = useState(null);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const result = await sendAdminOTP(email.trim());

      if (result.success) {
        setOtpData(result.data);
        setStep("otp");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred while sending OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (otp) => {
    setLoading(true);
    setError("");

    try {
      const result = await verifyAdminOTP(email.trim(), otp);

      if (result.success) {
        // Use auth context to login
        login(result.data);
        // Navigate to admin profile page
        navigate("/profile");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred during OTP verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    try {
      const result = await sendAdminOTP(email.trim());
      if (result.success) {
        setOtpData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtpData(null);
    setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {step === "email" ? (
        <form
          onSubmit={handleEmailSubmit}
          className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-200"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-gray-800">
              JanSetu Admin Login
            </h2>
            <p className="text-gray-600">
              Enter your admin email to receive OTP
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              placeholder="Enter your admin email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-700 text-center">
              You will receive a 6-digit OTP on your registered email address for secure login.
            </p>
          </div>
        </form>
      ) : (
        <OTPVerification
          email={email}
          onVerifyOTP={handleOTPVerify}
          onResendOTP={handleResendOTP}
          onBack={handleBackToEmail}
          loading={loading}
          error={error}
          expiresIn={otpData?.expiresIn || 600}
        />
      )}
    </div>
  );
}
