import { generateOTP, storeOTP, verifyOTP, sendOTP, sendTestOtp, getStoredOTPs } from "../services/sendSms.js";
import dbConnect from "../db/dbConnect.js";

// Send OTP to phone number
export const sendOTPController = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    console.log('Request body:', req.body);
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }
    
    // Generate 6-digit OTP
    const otp = generateOTP();
    
    // Store OTP in memory (expires in 5 minutes)
    storeOTP(phoneNumber, otp);
    
    // Send OTP via SMS
    const result = await sendOTP(phoneNumber, otp);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        messageSid: result.messageSid
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error in sendOTPController:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Verify OTP
export const verifyOTPController = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    console.log('🔍 Verify OTP request:', req.body);
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required"
      });
    }
    
    const result = verifyOTP(phoneNumber, otp);
    
    if (result.success) {
      console.log('✅ OTP verified, creating/logging in user...');
      
      // OTP is valid - create or login user in database directly
      try {
        const client = await dbConnect();
        
        try {
          // Check if user already exists
          const checkUserQuery = `SELECT * FROM users WHERE phone_number = $1`;
          const existingUser = await client.query(checkUserQuery, [phoneNumber]);
          
          let user;
          let isNewUser = false;
          let requiresProfileSetup = false;
          
          if (existingUser.rows.length > 0) {
            // User exists - update last_login and return user data
            user = existingUser.rows[0];
            const updateLoginQuery = `
              UPDATE users 
              SET last_login = CURRENT_TIMESTAMP, 
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = $1 
              RETURNING *
            `;
            const updatedUser = await client.query(updateLoginQuery, [user.id]);
            user = updatedUser.rows[0];
            isNewUser = false;
            requiresProfileSetup = !user.full_name || !user.email;
            
            console.log('✅ Existing user logged in:', user.id);
          } else {
            // New user - create with UUID and minimal data
            const insertQuery = `
              INSERT INTO users (
                phone_number, 
                email, 
                full_name, 
                profile_image_url, 
                is_verified,
                total_reports,
                resolved_reports
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *
            `;
            
            const newUserResult = await client.query(insertQuery, [
              phoneNumber,
              '', // Empty email initially
              '', // Empty full_name initially  
              '', // Empty profile_image_url initially
              true, // is_verified = true after OTP
              0, // total_reports = 0
              0  // resolved_reports = 0
            ]);
            
            user = newUserResult.rows[0];
            isNewUser = true;
            requiresProfileSetup = true;
            
            console.log('✅ New user created:', user.id);
          }
          
          // Return successful response with user data
          res.status(200).json({
            success: true,
            message: result.message,
            user: user,
            isNewUser: isNewUser,
            requiresProfileSetup: requiresProfileSetup
          });
          
        } finally {
          client.end();
        }
        
      } catch (dbError) {
        console.error('❌ Database error after OTP verification:', dbError);
        // Still return success for OTP verification, but note the DB error
        res.status(200).json({
          success: true,
          message: result.message,
          warning: "OTP verified but user creation failed",
          dbError: dbError.message
        });
      }
      
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in verifyOTPController:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Send test OTP (for testing with your verified number)
export const sendTestOTPController = async (req, res) => {
  try {
    const otp = generateOTP();
    
    // Store OTP for the test number
    storeOTP(process.env.TEST_TO, otp);
    
    const result = await sendTestOtp(otp);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Test OTP sent successfully",
        messageSid: result.messageSid,
        // For testing purposes, return the OTP (remove in production)
        testOTP: otp
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test OTP",
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error in sendTestOTPController:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Debug endpoint to check stored OTPs
export const getStoredOTPsController = async (req, res) => {
  try {
    const storedOTPs = getStoredOTPs();
    res.status(200).json({
      success: true,
      message: "Current stored OTPs",
      data: storedOTPs
    });
  } catch (error) {
    console.error('Error in getStoredOTPsController:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};