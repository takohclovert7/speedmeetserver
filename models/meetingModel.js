const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: [true, 'Meeting ID is required'],
    unique: true,
  },
  hostName: {
    type: String,
    required: [true, 'Host name is required'],
  },
  title: {
    type: String,
    default: '', // Optional field
  },
  startDate: {
    type: String,
    required: [true, 'Start date is required'],
    validate: {
      validator: function (value) {
        return !isNaN(Date.parse(value)); // Ensure the string is a valid date
      },
      message: 'Start date must be a valid date string',
    },
  },
  endDate: {
    type: String,
    required: [true, 'End date is required'],
    validate: {
      validator: function (value) {
        return (
          !isNaN(Date.parse(value)) &&
          Date.parse(value) > Date.parse(this.startDate) // Ensure end date is after start date
        );
      },
      message: 'End date must be a valid date string and later than start date',
    },
  },
  members: [
    {
      name: {
        type: String,
        required: [true, 'Member name is required'],
      },
      email: {
        type: String,
        required: [true, 'Member email is required'],
        match: [/.+\@.+\..+/, 'Please provide a valid email address'], // Validate email format
      },
    },
  ],
}, { timestamps: true }); // Adds `createdAt` and `updatedAt` timestamps

module.exports = mongoose.model('Meeting', meetingSchema);
