const { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');
// const { bucket } = require('../config/db');
const bcrypt = require('bcrypt');
// const multer = require('multer');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const db = getFirestore();

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const otpStorage = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});[]

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const body = (otp) => `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
<div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Silveroak University</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for Register99
    . Use the following OTP to complete your Sign Up procedures. OTP is valid for 5 minutes</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />SilverOak University</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>SilverOak University</p>
      <p>GOTA GAM, AHMEDABAD, Ahmedabad, Gujarat, India, 382481</p>
    </div>
  </div>
</div>`

const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            html: body(otp)
        };
        console.log('mailOptions', mailOptions);
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log('error', error);
        throw new Error(`Failed to send OTP: ${error.message}`);
    }
};

const register = async (req, res) => {
    try {
        const { name, designation, email, mobileNo, password, role } = req.body;

        if (!name || !designation || !email || !mobileNo || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const nameRegex = /^[a-zA-Z\s]{3,}$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({ error: 'Name must have at least 3 alphabetic characters' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const mobileNoRegex = /^\d{10}$/;
        if (!mobileNoRegex.test(mobileNo)) {
            return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = generateOTP();
        otpStorage[email] = { otp, userDoc: { name, designation, email, mobileNo, password: hashedPassword }, expiresAt: Date.now() + 10 * 60 * 1000 }; // OTP expires in 10 minutes
        await sendOTP(email, otp);

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        console.log('Error registering user: ', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const storedOtpData = otpStorage[email];

        if (!storedOtpData) {
            return res.status(400).json({ error: 'OTP not found or expired' });
        }

        if (storedOtpData.otp !== otp.toString()) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (storedOtpData.expiresAt < Date.now()) {
            delete otpStorage[email];
            return res.status(400).json({ error: 'OTP expired' });
        }

        const userDoc = storedOtpData.userDoc;
        const docRef = await addDoc(collection(db, 'users'), userDoc);

        console.log('User registered with ID: ', docRef.id);

        delete otpStorage[email];

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error verifying OTP: ', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('req.body', req.body);
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        let userDoc;
        querySnapshot.forEach(doc => {
            userDoc = doc.data();
        });

        const isPasswordValid = await bcrypt.compare(password, userDoc.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: userDoc.email, id: userDoc.id, role: userDoc.role }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error logging in user: ', error);
        res.status(500).json({ error: 'Failed to log in user' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(400).json({ error: 'User with this email does not exist' });
        }

        const otp = generateOTP();
        otpStorage[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // OTP expires in 10 minutes
        console.log('otpStorage', otpStorage);
        await sendOTP(email, otp);

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error('Error sending OTP: ', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

//want opt into string
const verifyOTPAndUpdatePassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        console.log('req.body', req.body);
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const storedOtpData = otpStorage[email];
        if (!storedOtpData) {
            return res.status(400).json({ error: 'OTP not found or expired' });
        }

        if (storedOtpData.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (storedOtpData.expiresAt < Date.now()) {
            delete otpStorage[email];
            return res.status(400).json({ error: 'OTP expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        let userId;
        querySnapshot.forEach(doc => {
            userId = doc.id;
        });

        await updateDoc(doc(db, `users/${userId}`), {
            password: hashedPassword
        });

        delete otpStorage[email];

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error verifying OTP and updating password: ', error);
        res.status(500).json({ error: 'Failed to verify OTP and update password' });
    }
};

const createAppointment = async (req, res) => {
    try {
        const { date, time, name, designation, reason } = req.body;

        if (!date || !time || !name || !designation || !reason) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const nameRegex = /^[a-zA-Z\s]{3,}$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({ error: 'Name must have at least 3 alphabetic characters' });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Expected format: YYYY-MM-DD' });
        }

        const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({ error: 'Invalid time format. Expected format: HH:MM' });
        }

        const uniqueValue = uuidv4();

        const appointmentData = {
            date,
            time,
            name,
            designation,
            reason,
            uniqueValue,
            createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

        console.log('Appointment created with ID: ', docRef.id);
        res.status(201).json({ message: 'Appointment created successfully', appointmentId: docRef.id, uniqueValue });
    } catch (error) {
        console.log('Error creating appointment: ', error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};

const getUsers = async (req, res) => {
    try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        const usersList = usersSnapshot.docs.map(doc => {
            const { name, designation } = doc.data();
            return { name, designation };
        });

        res.status(200).json({ data: usersList });
    } catch (error) {
        console.log('Error getting users: ', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = { register, verifyOTP, login, forgotPassword, verifyOTPAndUpdatePassword, createAppointment, getUsers };