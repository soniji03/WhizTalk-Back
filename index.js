const io = require('socket.io')
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/connectDB')
const router = require('./routes/index')
const cookiesParser = require('cookie-parser')
const { app, server } = require('./socket/index')
require('./models/ConversationModel');

// const app = express()
// app.use(cors({
//     origin : process.env.FRONTEND_URL,
//     credentials : true
// }))

// const corsOptions = {
//     origin: process.env.FRONTEND_URL,
//     optionsSuccessStatus: 200, // For legacy browser support
//   };

// app.use(cors({
//     origin: [
//       'https://localhost:5174',
//       'http://localhost:5173',
//       'https://whiztalk-back.onrender.com'
//     ],
//   }));

const corsOptions = {
    origin: [
      'https://localhost:5174',
      'http://localhost:5173',
      'https://whiztalk.netlify.app', // Add your frontend URL here
      'https://whiztalk-back.onrender.com'
    ],
    optionsSuccessStatus: 200, // For legacy browser support
  };
  
  app.use(cors(corsOptions));

 

app.use(express.json())
app.use(cookiesParser())

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
