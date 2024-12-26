const express = require('express');
const router = express.Router();
const Meeting = require('../models/meetingModel'); // Adjust the path as needed

// POST endpoint to create a meeting
router.post('/create/meeting', async (req, res) => {
  const {
    meetingId,
    hostName,
    title,
    startDate,
    endDate,
    members,
  } = req.body;

  // Validate required fields
  if (!meetingId || !hostName || !startDate || !endDate) {
    return res.status(400).json({
      message: 'Meeting ID, Host Name, Start Date, and End Date are required.',
    });
  }

  try {
    // Create a new meeting document
    const newMeeting = new Meeting({
      meetingId,
      hostName,
      title,
      startDate,
      endDate,
      members,
    });

    // Save to database
    const savedMeeting = await newMeeting.save();

    // Respond with the saved meeting
    res.status(201).json({
      message: 'Meeting created successfully',
      meeting: savedMeeting,
    });
  } catch (error) {
    // Handle errors
    console.error('Error creating meeting:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
});


router.post('/meeting/user', async (req, res) => {
  const { email, name } = req.body;
console.log(req.body)
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const meetings = await Meeting.find({
      $or: [
        { hostName: name }, // Matches if the user is the host by name
        { 'members.email': email }, // Matches if the user is in the members array
      ], 
    }) .sort({ createdAt: -1 }) // Sort by 'createdAt' in descending order (newest first)
    .exec();

    if (meetings.length === 0) {
      return res.status(404).json({ message: 'No meetings found for the given user.' });
    }     
  
    res.status(200).json(meetings);
  } catch (error) { 
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});


// Add a member to the meeting
router.post('/start/meeting', async (req, res) => {
  const { meetingId, name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    // Find the meeting by ID
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    // Check the current date against meeting dates
    const now = new Date();
    const startDate = new Date(meeting.startDate);
    const endDate = new Date(meeting.endDate);

    if (now < startDate) {
      return res.status(401).json({ message: 'The meeting has not started yet.' });
    }

    if (now > endDate) {
      return res.status(402).json({ message: 'The meeting has ended.' });
    }

    // Check for duplicate email
    const isMemberExists = meeting.members.some(member => member.email === email);
    if (isMemberExists) {
      return res.status(200).json({ meeting, message: 'Member already exists in the meeting.' });
    }

    // Add the new member
    meeting.members.push({ name, email });

    // Save the updated meeting
    await meeting.save();

    res.status(200).json({ meeting, message: 'Member added successfully.' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;
