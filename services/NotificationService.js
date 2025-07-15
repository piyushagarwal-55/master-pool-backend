const Notification = require('../models/Notification');

class NotificationService {
  static async createNotification({
    recipientId,
    senderId,
    type,
    tripId,
    participantId = null,
    title,
    message,
    actionRequired = false
  }) {
    try {
      const notification = new Notification({
        recipientId,
        senderId,
        type,
        tripId,
        participantId,
        title,
        message,
        actionRequired
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async createJoinRequestNotification(trip, participant, sender) {
    return this.createNotification({
      recipientId: trip.creatorId,
      senderId: sender._id,
      type: 'join_request',
      tripId: trip._id,
      participantId: participant._id,
      title: 'New Join Request',
      message: `${sender.username || sender.email} wants to join your trip from ${trip.departureLocation} to ${trip.destination}`,
      actionRequired: true
    });
  }

  static async createJoinResponseNotification(trip, participant, decision, tripCreator) {
    const isApproved = decision === 'approved';
    return this.createNotification({
      recipientId: participant.userId,
      senderId: tripCreator._id,
      type: isApproved ? 'join_approved' : 'join_rejected',
      tripId: trip._id,
      participantId: participant._id,
      title: isApproved ? 'Join Request Approved!' : 'Join Request Declined',
      message: isApproved 
        ? `Your request to join the trip from ${trip.departureLocation} to ${trip.destination} has been approved!`
        : `Your request to join the trip from ${trip.departureLocation} to ${trip.destination} has been declined.`,
      actionRequired: false
    });
  }

  static async createTripUpdateNotification(trip, participants, updatedBy) {
    const notifications = [];
    for (const participant of participants) {
      if (participant.userId.toString() !== updatedBy._id.toString()) {
        notifications.push(this.createNotification({
          recipientId: participant.userId,
          senderId: updatedBy._id,
          type: 'trip_update',
          tripId: trip._id,
          title: 'Trip Updated',
          message: `The trip from ${trip.departureLocation} to ${trip.destination} has been updated`,
          actionRequired: false
        }));
      }
    }
    return Promise.all(notifications);
  }

  static async createTripCancelledNotification(trip, participants, cancelledBy) {
    const notifications = [];
    for (const participant of participants) {
      if (participant.userId.toString() !== cancelledBy._id.toString()) {
        notifications.push(this.createNotification({
          recipientId: participant.userId,
          senderId: cancelledBy._id,
          type: 'trip_cancelled',
          tripId: trip._id,
          title: 'Trip Cancelled',
          message: `The trip from ${trip.departureLocation} to ${trip.destination} has been cancelled`,
          actionRequired: false
        }));
      }
    }
    return Promise.all(notifications);
  }
}

module.exports = NotificationService;
