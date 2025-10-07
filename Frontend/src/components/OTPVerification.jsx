import { useState, useEffect, useRef } from "react";

const OTPVerification = ({ 
  email, 
  onVerify, 
  onResend, 
  onBack, 
  loading = false,
  error = "",
  otpData = null 
}) => {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const expiresIn = otpData?.expiresIn || 600;
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [canResend, setCanResend] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (otpData?.expiresIn) {
      setTimeLeft(otpData.expiresIn);
    }
  }, [otpData]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      const code = otp.join("");
      if (code.length === 6) {
        onVerify(code);
      } else {
        alert("Please enter all 6 digits before verifying.");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length === 6) {
      onVerify(code);
    } else {
      // Optionally set an error or show a message
      alert("Please enter all 6 digits before verifying.");
    }
  };

  const handleResend = () => {
    setTimeLeft(expiresIn);
    setCanResend(false);
    setOtp(Array(6).fill(""));
    inputsRef.current[0]?.focus();
    onResend();
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-200 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow">
          <svg className="w-8 h-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Verify OTP</h2>
        <p className="text-gray-600 text-sm">We’ve sent a 6-digit code to</p>
        <p className="text-blue-700 font-semibold">{email}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg animate-shake">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Inputs */}
        <div className="flex justify-between gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className="w-12 h-14 text-2xl font-mono text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center">
          {timeLeft > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-2">
                OTP expires in{" "}
                <span className="font-mono font-semibold text-red-600">
                  {formatTime(timeLeft)}
                </span>
              </p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-red-500 transition-all"
                  style={{ width: `${(timeLeft / expiresIn) * 100}%` }}
                ></div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600 font-semibold">OTP has expired</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
          >
            {loading ? "Verifying..." : otp.join("").length === 6 ? "Verify OTP" : "Enter all 6 digits"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canResend ? "Resend OTP" : `Resend in ${formatTime(timeLeft)}`}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="w-full py-2 text-gray-600 hover:text-gray-800 transition underline"
          >
            ← Back to email entry
          </button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800 text-center">
          <strong>🔒 Security Notice:</strong> This OTP is valid for 10 minutes and can only be used once. 
          Do not share this code with anyone.
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;
