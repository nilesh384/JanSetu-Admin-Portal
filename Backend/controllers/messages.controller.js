import dbConnect from '../db/dbConnect.js';
import generateAIResponse from '../services/ai.js';

// Helper function to convert timestamps to ISO
const toISO = (val) => (val ? new Date(val).toISOString() : null);

export const sendMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Message and userId are required'
      });
    }

    const client = await dbConnect();

    try {
      // Verify user exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Save user message
      await client.query(
        'INSERT INTO messages (user_id, role, message) VALUES ($1, $2, $3)',
        [userId, 'user', message]
      );

      // Fetch full chat history for this user
      const messagesResult = await client.query(
        'SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );

      const messages = messagesResult.rows.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        role: msg.role,
        message: msg.message,
        createdAt: toISO(msg.created_at)
      }));

      // Generate AI response
      const aiResponse = await generateAIResponse(messages);

      // Save AI response
      await client.query(
        'INSERT INTO messages (user_id, role, message) VALUES ($1, $2, $3)',
        [userId, 'ai', aiResponse]
      );

      res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        aiResponse: aiResponse
      });

    } finally {
      client.end();
    }

  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const client = await dbConnect();

    try {
      const result = await client.query(
        'SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );

      const messages = result.rows.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        role: msg.role,
        message: msg.message,
        createdAt: toISO(msg.created_at)
      }));

      res.status(200).json({
        success: true,
        messages: messages
      });

    } finally {
      client.end();
    }

  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const deleteMessages = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const client = await dbConnect();

    try {
      await client.query(
        'DELETE FROM messages WHERE user_id = $1',
        [userId]
      );

      res.status(200).json({
        success: true,
        message: 'All messages deleted successfully'
      });

    } finally {
      client.end();
    }

  } catch (error) {
    console.error('Error in deleteMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};