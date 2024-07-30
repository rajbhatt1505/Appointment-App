const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, forgotPassword, verifyOTPAndUpdatePassword, createAppointment, getUsers } = require('../conrollers/Appointment'); 
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/register', register); //checked 
router.post('/verify-otp', verifyOTP); //checked
router.post('/login', login); //checked
router.post('/forgot-password', forgotPassword); //checked
router.post('/verify-otp-update-password', verifyOTPAndUpdatePassword); //checked

router.post('/appointments', authMiddleware, createAppointment); //checked
router.get('/getUser', authMiddleware,getUsers); //checked

module.exports = router;
