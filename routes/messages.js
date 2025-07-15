const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Trip = require('../models/Trip');
const Participant = require('../models/Participant');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages for a trip
router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId } = req.query;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isCreator = trip.creatorId.toString() === req.user._id.toString();
    const isParticipant = await Participant.findOne({
      tripId,
      userId: req.user._id,
      status: 'approved'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view messages for this trip' });
    }

    let messageQuery = { tripId };

    if (userId) {
      messageQuery = {
        tripId,
        $or: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id }
        ]
      };
    } else if (!isCreator) {
      messageQuery = {
        tripId,
        $or: [
          { senderId: req.user._id },
          { receiverId: req.user._id }
        ]
      };
    }

    const messages = await Message.find(messageQuery)
      .populate('senderId', 'email username rollNumber')
      .populate('receiverId', 'email username rollNumber')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/', [
  auth,
  body('tripId')
    .isMongoId()
    .withMessage('Invalid trip ID'),
  body('receiverId')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters')
], async (req, res) => {
  try {
    // Debug incoming payload
    console.log('Incoming message body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { tripId, receiverId, message } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isCreator = trip.creatorId.toString() === req.user._id.toString();
    const isParticipant = await Participant.findOne({
      tripId,
      userId: req.user._id,
      status: 'approved'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to send messages for this trip' });
    }

    const receiverIsCreator = trip.creatorId.toString() === receiverId;
    const receiverIsParticipant = await Participant.findOne({
      tripId,
      userId: receiverId,
      status: 'approved'
    });

    if (!receiverIsCreator && !receiverIsParticipant) {
      return res.status(400).json({ message: 'Receiver is not authorized for this trip' });
    }

    if (req.user._id.toString() === receiverId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const newMessage = new Message({
      tripId,
      senderId: req.user._id,
      receiverId,
      message: message.trim()
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'email username rollNumber');
    await newMessage.populate('receiverId', 'email username rollNumber');

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.readAt = new Date();
    await message.save();
    await message.populate('senderId', 'email username rollNumber');
    await message.populate('receiverId', 'email username rollNumber');

    res.json(message);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation between two users for a trip
router.get('/conversation', auth, async (req, res) => {
  try {
    const { tripId, userId1, userId2 } = req.query;

    if (!tripId || !userId1 || !userId2) {
      return res.status(400).json({ message: 'tripId, userId1, and userId2 are required' });
    }

    if (req.user._id.toString() !== userId1 && req.user._id.toString() !== userId2) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const messages = await Message.find({
      tripId,
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ]
    })
    .populate('senderId', 'email username rollNumber')
    .populate('receiverId', 'email username rollNumber')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Message.countDocuments({
      receiverId: req.user._id,
      readAt: null
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
