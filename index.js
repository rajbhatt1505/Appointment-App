const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { app: firebaseApp, checkFirebaseConnection } = require('./config/db');
const authRoute = require('./routes/authroute');
const { authMiddleware } = require('./middlewares/authMiddleware');

const publicDirectoryPath = path.join(__dirname, './public');
const port = process.env.PORT || 3000;
const server = express();

server.use(express.static(publicDirectoryPath));
server.use(cors());
server.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
server.use(bodyParser.json({ limit: '50mb', type: 'application/json', extended: true }));

server.use('/api', authRoute);

server.listen(port, () => {
    console.log('Server is up on port ' + port);
    checkFirebaseConnection();
});
