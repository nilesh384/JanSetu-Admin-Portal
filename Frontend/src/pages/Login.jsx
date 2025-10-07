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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200 to-cyan-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-violet-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {step === "email" ? (
          <div className="card-modern p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gradient mb-2">
                Welcome Back
              </h1>
              <p className="text-slate-600">
                Sign in to your JanSetu Admin account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="input-modern w-full pl-12"
                    required
                  />
                  
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send OTP
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-center text-sm text-slate-600">
                Secure admin portal for JanSetu management system
              </p>
            </div>
          </div>
        ) : (
          <OTPVerification
            email={email}
            onVerify={handleOTPVerify}
            onResend={handleResendOTP}
            onBack={handleBackToEmail}
            loading={loading}
            error={error}
            otpData={otpData}
          />
        )}
      </div>
    </div>
  );
}
