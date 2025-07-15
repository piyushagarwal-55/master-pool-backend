const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Trip = require('../models/Trip');
const Participant = require('../models/Participant');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages for a trip (group chat)
router.get('/trip/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is authorized (creator or approved participant)
    const isCreator = trip.creatorId.toString() === req.user._id.toString();
    const isParticipant = await Participant.findOne({
      tripId,
      userId: req.user._id,
      status: 'approved'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view messages for this trip' });
    }

    // Get all messages for this trip
    const messages = await Message.find({ tripId })
      .populate('senderId', 'email username rollNumber')
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message (group chat)
router.post('/', auth, [
  body('tripId').isMongoId().withMessage('Valid trip ID required'),
  body('content').isLength({ min: 1, max: 1000 }).withMessage('Message content is required (1-1000 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId, content } = req.body;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is authorized (creator or approved participant)
    const isCreator = trip.creatorId.toString() === req.user._id.toString();
    const isParticipant = await Participant.findOne({
      tripId,
      userId: req.user._id,
      status: 'approved'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to send messages in this trip' });
    }

    // Create message
    const message = new Message({
      tripId,
      senderId: req.user._id,
      content: content.trim(),
      timestamp: new Date()
    });

    await message.save();

    // Populate sender info for response
    await message.populate('senderId', 'email username rollNumber');

    // Get Socket.IO instance and emit to trip room
    const io = req.app.get('io');
    if (io) {
      io.to(`trip-${tripId}`).emit('new-message', {
        _id: message._id,
        tripId: message.tripId,
        senderId: {
          _id: message.senderId._id,
          email: message.senderId.email,
          username: message.senderId.username,
          rollNumber: message.senderId.rollNumber
        },
        content: message.content,
        timestamp: message.timestamp
      });
    }

    res.status(201).json({
      _id: message._id,
      tripId: message.tripId,
      senderId: {
        _id: message.senderId._id,
        email: message.senderId.email,
        username: message.senderId.username,
        rollNumber: message.senderId.rollNumber
      },
      content: message.content,
      timestamp: message.timestamp
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation participants for a trip
router.get('/trip/:tripId/participants', auth, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).populate('creatorId', 'email username rollNumber');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is authorized
    const isCreator = trip.creatorId._id.toString() === req.user._id.toString();
    const isParticipant = await Participant.findOne({
      tripId,
      userId: req.user._id,
      status: 'approved'
    });

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view participants' });
    }

    // Get approved participants
    const participants = await Participant.find({ tripId, status: 'approved' })
      .populate('userId', 'email username rollNumber');

    // Include trip creator
    const allParticipants = [
      {
        _id: trip.creatorId._id,
        email: trip.creatorId.email,
        username: trip.creatorId.username,
        rollNumber: trip.creatorId.rollNumber,
        isCreator: true
      },
      ...participants.map(p => ({
        _id: p.userId._id,
        email: p.userId.email,
        username: p.userId.username,
        rollNumber: p.userId.rollNumber,
        isCreator: false
      }))
    ];

    // Remove duplicates (in case creator is also in participants)
    const uniqueParticipants = allParticipants.filter((participant, index, self) =>
      index === self.findIndex(p => p._id.toString() === participant._id.toString())
    );

    res.json(uniqueParticipants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
