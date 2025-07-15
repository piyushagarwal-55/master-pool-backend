const express = require('express');
const { body, validationResult } = require('express-validator');
const Trip = require('../models/Trip');
const Participant = require('../models/Participant');
const auth = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

// Get all trips
router.get('/', auth, async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'active' })
      .populate('creatorId', 'email username rollNumber')
      .sort({ departureTime: 1 });

    // For each trip, get participants and user's participation status
    const tripsWithDetails = await Promise.all(
      trips.map(async (trip) => {
        const tripObj = trip.toObject();
        
        // Get participants for trips created by current user
        if (trip.creatorId._id.toString() === req.user._id.toString()) {
          const participants = await Participant.find({ tripId: trip._id })
            .populate('userId', 'email username rollNumber');
          tripObj.participants = participants;
        }

        // Check if current user is participating
        const participation = await Participant.findOne({
          tripId: trip._id,
          userId: req.user._id
        });
        
        if (participation) {
          tripObj.participation = {
            _id: participation._id,
            status: participation.status
          };
        }

        return tripObj;
      })
    );

    res.json(tripsWithDetails);
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trip by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('creatorId', 'email username rollNumber');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new trip
router.post('/', [
  auth,
  body('departureLocation')
    .trim()
    .notEmpty()
    .withMessage('Departure location is required'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination is required'),
  body('departureTime')
    .isISO8601()
    .withMessage('Invalid departure time')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Departure time must be in the future');
      }
      return true;
    }),
  body('availableSeats')
    .isInt({ min: 1, max: 8 })
    .withMessage('Available seats must be between 1 and 8'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { departureLocation, destination, departureTime, availableSeats, description } = req.body;

    const trip = new Trip({
      creatorId: req.user._id,
      departureLocation,
      destination,
      departureTime: new Date(departureTime),
      availableSeats,
      description
    });

    await trip.save();
    await trip.populate('creatorId', 'email username rollNumber');

    res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update trip
router.put('/:id', [
  auth,
  body('departureLocation')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Departure location cannot be empty'),
  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination cannot be empty'),
  body('departureTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid departure time')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Departure time must be in the future');
      }
      return true;
    }),
  body('availableSeats')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Available seats must be between 1 and 8'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is the creator
    if (trip.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this trip' });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('creatorId', 'email username rollNumber');

    res.json(updatedTrip);
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete trip
router.delete('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is the creator
    if (trip.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this trip' });
    }

    await Trip.findByIdAndDelete(req.params.id);
    
    // Also delete related participants
    await Participant.deleteMany({ tripId: req.params.id });

    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join trip
router.post('/:id/join', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is trying to join their own trip
    if (trip.creatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot join your own trip' });
    }

    // Check if user already requested to join
    const existingParticipation = await Participant.findOne({
      tripId: req.params.id,
      userId: req.user._id
    });

    if (existingParticipation) {
      return res.status(400).json({ message: 'Already requested to join this trip' });
    }

    const participant = new Participant({
      tripId: req.params.id,
      userId: req.user._id,
      status: 'pending'
    });

    await participant.save();
    await participant.populate('userId', 'email username rollNumber');

    // Create notification for trip creator
    await NotificationService.createJoinRequestNotification(trip, participant, req.user);

    res.status(201).json(participant);
  } catch (error) {
    console.error('Join trip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update participant status
router.put('/:tripId/participants/:participantId', [
  auth,
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Check if user is the trip creator
    if (trip.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update participant status' });
    }

    const participant = await Participant.findById(req.params.participantId);
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Verify participant belongs to this trip
    if (participant.tripId.toString() !== req.params.tripId) {
      return res.status(400).json({ message: 'Participant does not belong to this trip' });
    }

    participant.status = req.body.status;
    await participant.save();
    await participant.populate('userId', 'email username rollNumber');

    // Create notification for the participant
    await NotificationService.createJoinResponseNotification(trip, participant, req.body.status, req.user);

    res.json(participant);
  } catch (error) {
    console.error('Update participant status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get participants for a trip
router.get('/:id/participants', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Only trip creator can view all participants
    if (trip.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view participants' });
    }

    const participants = await Participant.find({ tripId: req.params.id })
      .populate('userId', 'email username rollNumber')
      .sort({ createdAt: 1 });

    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
