var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
var User = require('../models/userModels');
var nodemailer = require('nodemailer');
var crypto = require('crypto'); // Node.js module for generating random values
var OTP =require("../models/otpModels")


// Create a Nodemailer transporter using SMTP
var transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other services or SMTP settings
  auth: {
    user: process.env.MY_EMAIL, // Your email address
    pass: process.env.PASSWORD   // Your email password or an app-specific password
  }
});     
   
/* GET users listing. */
router.get('/', function(req, res, next) {
  console.log("frontend")
  res.json({s:'respond with a resource'});
});
      
router.post('/signup', async function(req, res, next) {
  const { name,email,password}=req.body
  try {
    // Create a new user instance
    const newUser = new User({ 
      name: name,
      email: email,
      password: password,
    });
    
    // Save the user to the database
    await newUser.save();
   
 // Generate a verification code if it's a new user
    if (newUser.isNew) {
      newUser.verificationCode = crypto.randomInt(100000, 999999).toString();
      newUser.verificationCodeExpires = new Date(Date.now() + 1.5 * 60 * 1000);
      await newUser.save(); // Save the updated user with verification code
    }

    var mailOptions = {
      from: '"no-reply @TalkEase.com " <no-reply@TalkEase.com >', // Sender's name and email
      to: newUser.email, // List of receivers
      subject: 'Email Verification', // Subject line
      text: `This is your email verification code ${newUser.verificationCode}. Code expires in 90 seconds` // Plain text body
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log('Error occurred: ' + error.message);
        return res.status(500).send('Error occurred');
      }
      console.log('Message sent: %s', info.messageId);
      res.json({
        user: {
          email: newUser.email,
        },
        message: 'Email sent successfully'
      });
    });

  } catch (error) {
    console.log(error.message);
    if(error.code===11000){
res.status(500).json({
   message: 'User with that email already exit'
})
    }else{
      res.status(500).json({
        message: 'Network error please try later'
     })
    }
   
  }
});


router.post("/verification/otp",async function(req,res,next){
const {email,otp}=req.body
console.log(otp.replace(/,/g, ''))
  try {
    const user = await User.findOne({ email: email });

    if (user) {
      const currentDate = new Date();
      const isCodeValid = currentDate < user.verificationCodeExpires;

      if (isCodeValid) {
        if (user.verificationCode === otp.replace(/,/g, '')) {
          // Update the user document without triggering pre-save hooks
          await User.findOneAndUpdate(
            { email: email },
            {
              isAccountActivated: true,
              $unset: {
                verificationCode: '',
                verificationCodeExpires: ''
              }
            },
            { new: true }
          );

          return res.json({ message:"Account activated successfully.",user:{
            name: user.name,
            phoneNumber: user.phoneNumber,
            email:user.email,
            username: user.username,
            imageUrl: user.imageUrl,
          }});
        } else {
          return res.json({ message: 'Verification code does not match.' });
        }
      } else {
        return res.json({ message: 'Verification code has expired.' });
      }
    } else {
      return res.json({ message: 'User not found.' });
    }
  } catch (error) {
    console.error('Error:', error);   
    return res.status(500).json({ message: 'Network error please try later' });
  }
  
})


router.post('/resend/otp',async function(req,res,next){
  const {email}=req.body;
  try {
    // Find the document by the specified field and value
    const result = await User.findOneAndUpdate(
        { ['email']: email}, // Filter criteria
        { 
            verificationCode:crypto.randomInt(100000, 999999).toString(),
            verificationCodeExpires: new Date(Date.now() + 1.5 * 60 * 1000) 
        },
        { new: true } // Return the updated document
    );
    if (result) {
        var mailOptions = {
          from: '"no-reply @TalkEase.com " <no-reply@TalkEase.com >', // Sender's name and email
          to: result.email, // List of receivers
          subject: 'Email Verification', // Subject line
          text: `This is your email verification code ${result.verificationCode}. Code expires in 90 seconds` // Plain text body
        };
    
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
           res.json({ message: 'Could not resend code please try again'});
          }
          res.json({
            message: 'Email sent successfully'
          });
        });
    } else {
      res.json({ message: 'No user with your email was found'});
    }
} catch (error) {
  res.status(500).json({ message:'Could not resend code please try again'});
}
})

router.post("/login",async function(req,res,next){
  const {email,password}=req.body

  try {
    // Check if user exists by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'User with email not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(200).json({ message: 'Invalid password' });
    }

    // Check if account is activated
    if (!user.isAccountActivated) {
      // Generate a new verification code and expiration date
      const verificationCode = crypto.randomInt(100000, 999999).toString(); // Random 6-digit code
      const verificationCodeExpires = new Date(Date.now() + 1.5 * 60 * 1000); // 24 hours from now

      // Update the user's verification code and expiration date
      await User.updateOne(
        { email },
        { verificationCode, verificationCodeExpires }
      );

      // Send verification email
      const mailOptions = {
              from: '"no-reply @TalkEase.com " <no-reply@TalkEase.com >', // Sender's name and email
        to: user.email,
        subject: 'Account Activation code',
        text: `Your verification code is ${verificationCode}. This code expires in 90 seconds`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        user: {
          email: user.email,
        },
        message: 'Your account is not activated',
      });
    }

    // Return user data (excluding password)
    res.status(200).json({
      message: 'user login',
      user: {
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        username: user.username,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
  
})  




router.post('/forget-password/find-user', async (req, res) => {
  const { email } = req.body; // Get email from query parameters
console.log({email})
  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (user) {
      // Generate a random OTP code (e.g., 6-digit number)
      const otpCode = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration time to 3 minutes from now
      const otpCodeExpiresAt = new Date(Date.now() + 1.5 * 60 * 1000); // 3 minutes

      // Check if an OTP already exists for the user
      let otp = await OTP.findOne({ email });

      if (otp) {
        // Update existing OTP
        otp.otpCode = otpCode;
        otp.otpCodeExpiresAt = otpCodeExpiresAt;
      } else {
        // Create new OTP document
        otp = new OTP({ email, otpCode, otpCodeExpiresAt });
      }
      
      await otp.save();

      // Send verification email
      const mailOptions = {
        from: '"no-reply @TalkEase.com " <no-reply@TalkEase.com >', // Sender's name and email
        to: user.email,
        subject: 'Password reset code',
        text: `Your verification code is ${otp.otpCode}. This code expires in 90 seconds`,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'OTP code sent' });
    } else {
      res.status(404).json({ message: 'No user found with that email' });
    }
  } catch (error) {
    console.error('Error finding user by email:', error);
    res.status(500).json({ message: "Network error " });
  }
});



router.post('/forget-password/verify-otp', async (req, res) => {
const {email,otpCode}=req.body
  try {
    // Find the OTP document for the user
    const otp = await OTP.findOne({ email });

    if (otp) {
      // Check if the OTP code is correct
      const isOtpCodeValid = otp.otpCode === otpCode;
      const isOtpExpired = new Date() > otp.otpCodeExpiresAt;

      if (isOtpCodeValid) {
        if (isOtpExpired) {
          // OTP has expired
          res.status(400).json({ message: 'OTP has expired' });
        } else {
          // OTP is valid and not expired
          await OTP.deleteOne({ email }); // Delete the OTP document
          res.status(200).json({ message: 'OTP is valid and has been deleted' });
        }
      } else {
        // OTP code is incorrect
        res.status(400).json({ message: 'Invalid OTP code' });
      }
    } else {
      // OTP document not found
      res.status(404).json({ message: 'No OTP found for this email' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: error.message });
  }
});



// Route to update password by email
router.put('/forget-password/update-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(newPassword, salt);
  try {
    // Find the user by email
    const user = await User.findOneAndUpdate({email}, {password:hashPassword}, { new: true, useFindAndModify: false })
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message:'Password updated successfully',
      user:{
        name: user.name,
        email: user.email,
      },
     });
  } catch (err) {
    res.status(500).json({ message: 'Error updating password pleas try again' });
    console.log(err.message)
  }
});



router.put("/update/profile/info",async function (req,res,next) {
  try {
    const { email, name, emailMain} = req.body;
// console.log(req.body)
    // Find the user by email and update the fields
    const updatedUser = await User.findOneAndUpdate(
      { email:  emailMain }, // Condition to find the user by email
      {
        name,        // Update name
        email,       // Update email

      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({message: 'user login',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
  
      },
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
})



router.put("/change/account/password", async (req,res,next) => {
   try {
    const {email,oldPassword,newPassword}=req.body
     // Check if user exists by email
     const user = await User.findOne({ email });
     if (!user) {
       return res.status(404).json({ message: 'User with email not found' });
     }
 
     // Verify password
     const isMatch = await bcrypt.compare(oldPassword, user.password);
     if (!isMatch) {
       return res.status(404).json({ message: 'Invalid password' });
     }
     const salt = await bcrypt.genSalt(10); 
     const hashPassword = await bcrypt.hash(newPassword, salt);
     const result = await User.findOneAndUpdate({email}, {password:hashPassword}, { new: true, useFindAndModify: false })
     if (!result) {
       return res.status(404).json({ error: 'User not found' });
     }
     res.status(200).json({ message: 'Password updated successfully' });

   } catch (error) {
    res.status(500).json({message:"Network error please try again"})
   }


})

module.exports = router;
