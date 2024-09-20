const io = require('socket.io');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/connectDB');
const router = require('./routes/index')
const cookiesParser = require('cookie-parser')
const { app, server } = require('./socket/index')
require('./models/ConversationModel');

app.use(cors({
    origin : process.env.FRONTEND_URL,
    credentials : true,
    optionsSuccessStatus: 200, 
}));


// const corsOptions = {
//   origin: process.env.FRONTEND_URL || 'https://whiztalk.netlify.app',
//   credentials: true,
//   optionsSuccessStatus: 200, 
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// app.use(cors(corsOptions));

// const corsOptions = {
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//     optionsSuccessStatus: 200 // For legacy browser support
//   };
//   app.use(cors({
//     origin: [
//       'https://whiztalk.netlify.app',
//       'http://localhost:5173'
//     ],
//     credentials: true,
//   }));


app.use(express.json())
app.use(cookiesParser())
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080

app.get('/',(request,response)=>{
    response.json({
        message : "SERVER RUNNING AT " + PORT
    })
})




//api endpoints
app.use('/api',router)

connectDB().then(()=>{
    server.listen(PORT,()=>{
        console.log("SERVER RUNNING AT " + PORT)
        console.log("MONGODB CONNECTED TO FRONTEND")
    })
})
