const mongoose = require('mongoose')
const express = require('express')
const { Server } = require('socket.io')
const http  = require('http')
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken')
const UserModel = require('../models/UserModel')
const { ConversationModel,MessageModel } = require('../models/ConversationModel')
const getConversation = require('../helpers/getConversation')

const app = express()

/***socket connection */
const server = http.createServer(app)
const io = new Server(server,{
    cors : {
        origin : process.env.FRONTEND_URL,
        credentials : true
    }
})

/***
 * socket running at http://localhost:8080/
 */

//online user
const onlineUser = new Set()

io.on('connection',async(socket)=>{




    socket.on('fetch-all-chats', async (userId) => {
        try {
          console.log('Fetching chats for userId:', userId);
          // Fetch all conversations for the user
          const conversations = await ConversationModel.find({
            $or: [{ sender: userId }, { receiver: userId }]
          }).populate({
            path: 'messages',
            options: { sort: { createdAt: 1 } }
          }).sort({ updatedAt: -1 });
          
          console.log('Fetched conversations:', conversations.length);
          // Send the conversations back to the client
          socket.emit('all-chats', conversations);
        } catch (error) {
          console.error('Error fetching chats:', error);
          socket.emit('fetch-error', { message: 'Error fetching chats' });
        }
      });
  
      socket.on('delete-message', async ({ messageId, userId }) => {
        try {
          console.log('Deleting message:', messageId, 'for user:', userId);
          // Find the message and its associated conversation
          const message = await MessageModel.findOne({ _id: messageId, msgByUserId: userId });
          
          if (message) {
            // Find the conversation containing this message
            const conversation = await ConversationModel.findOne({ messages: messageId });
            
            if (conversation) {
              // Remove the message from the conversation
              await ConversationModel.updateOne(
                { _id: conversation._id },
                { $pull: { messages: messageId } }
              );
              
              // Delete the message
              await MessageModel.deleteOne({ _id: messageId });
              
              console.log('Message deleted:', messageId);
              // Notify all connected clients about the deleted message
              io.emit('message-deleted', messageId);
            } else {
              console.log('Conversation not found for message:', messageId);
              socket.emit('delete-error', { message: 'Conversation not found' });
            }
          } else {
            console.log('Message not found or user not authorized to delete');
            socket.emit('delete-error', { message: 'Message not found or not authorized to delete' });
          }
        } catch (error) {
          console.error('Error deleting message:', error);
          socket.emit('delete-error', { message: 'Error deleting message' });
        }
      });


 // Handle sidebar request
 socket.on('sidebar', async (userId) => {
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }

    const conversations = await ConversationModel.find({ 
      $or: [{ sender: userId }, { receiver: userId }] 
    })
    .populate('sender receiver', 'name profile_pic')
    .populate({
      path: 'messages',
      options: { sort: { 'createdAt': -1 }, limit: 1 },
      populate: { path: 'msgByUserId', select: 'name profile_pic' }
    });
    
    const formattedConversations = conversations.map(conv => {
      const lastMessage = conv.messages[0];
      return {
        _id: conv._id,
        sender: conv.sender,
        receiver: conv.receiver,
        lastMsg: lastMessage ? {
          text: lastMessage.text,
          imageUrl: lastMessage.imageUrl,
          videoUrl: lastMessage.videoUrl,
          createdAt: lastMessage.createdAt,
          msgByUserId: lastMessage.msgByUserId
        } : null,
        unseenMsg: conv.messages.filter(msg => !msg.seen && msg.msgByUserId.toString() !== userId).length
      };
    });

    socket.emit('conversation', formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    socket.emit('sidebarError', error.message);
  }
});

// Handle conversation deletion
socket.on('deleteConversation', async ({ userId, deletedUserId }) => {
  try {
    if (!userId || !deletedUserId || 
        !mongoose.Types.ObjectId.isValid(userId) || 
        !mongoose.Types.ObjectId.isValid(deletedUserId)) {
      throw new Error('Invalid userId or deletedUserId');
    }

    const deletedConversation = await ConversationModel.findOneAndDelete({
      $or: [
        { sender: userId, receiver: deletedUserId },
        { sender: deletedUserId, receiver: userId }
      ]
    });

    if (!deletedConversation) {
      throw new Error('Conversation not found');
    }

    // Delete associated messages
    await MessageModel.deleteMany({
      _id: { $in: deletedConversation.messages }
    });

    socket.emit('conversationDeleted', deletedUserId);
    console.log('Conversation deleted successfully');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    socket.emit('deletionError', error.message);
  }
});



    console.log("connect User ", socket.id)

    const token = socket.handshake.auth.token 

    //current user details 
    const user = await getUserDetailsFromToken(token)

    //create a room
    if (user && user._id) {
    socket.join(user?._id.toString());
} else {
    console.log('User object or user._id is undefined');
    onlineUser.add(user?._id?.toString())


    io.emit('onlineUser',Array.from(onlineUser))}
 
    socket.on('message-page',async(userId)=>{
        console.log('userId',userId)
        const userDetails = await UserModel.findById(userId).select("-password")
        
        const payload = {
            _id : userDetails?._id,
            name : userDetails?.name,
            email : userDetails?.email,
            profile_pic : userDetails?.profile_pic,
            online : onlineUser.has(userId)
        }
        socket.emit('message-user',payload)


         //get previous message
         const getConversationMessage = await ConversationModel.findOne({
            "$or" : [
                { sender : user?._id, receiver : userId },
                { sender : userId, receiver :  user?._id}
            ]
        }).populate('messages').sort({ updatedAt : -1 })

        socket.emit('message',getConversationMessage?.messages || [])
    })


    //new message
    socket.on('new message',async(data)=>{

        //check conversation is available both user

        let conversation = await ConversationModel.findOne({
            "$or" : [
                { sender : data?.sender, receiver : data?.receiver },
                { sender : data?.receiver, receiver :  data?.sender}
            ]
        })

        //if conversation is not available
        if(!conversation){
            const createConversation = await ConversationModel({
                sender : data?.sender,
                receiver : data?.receiver
            })
            conversation = await createConversation.save()
        }
        
        const message = new MessageModel({
          text : data.text,
          imageUrl : data.imageUrl,
          videoUrl : data.videoUrl,
          msgByUserId :  data?.msgByUserId,
        })
        const saveMessage = await message.save()

        const updateConversation = await ConversationModel.updateOne({ _id : conversation?._id },{
            "$push" : { messages : saveMessage?._id }
        })

        const getConversationMessage = await ConversationModel.findOne({
            "$or" : [
                { sender : data?.sender, receiver : data?.receiver },
                { sender : data?.receiver, receiver :  data?.sender}
            ]
        }).populate('messages').sort({ updatedAt : -1 })


        io.to(data?.sender).emit('message',getConversationMessage?.messages || [])
        io.to(data?.receiver).emit('message',getConversationMessage?.messages || [])

        //send conversation
        const conversationSender = await getConversation(data?.sender)
        const conversationReceiver = await getConversation(data?.receiver)

        io.to(data?.sender).emit('conversation',conversationSender)
        io.to(data?.receiver).emit('conversation',conversationReceiver)
    })


    //sidebar
    socket.on('sidebar',async(currentUserId)=>{
        console.log("current user",currentUserId)

        const conversation = await getConversation(currentUserId)

        socket.emit('conversation',conversation)
        
    })

    socket.on('seen',async(msgByUserId)=>{
        
        let conversation = await ConversationModel.findOne({
            "$or" : [
                { sender : user?._id, receiver : msgByUserId },
                { sender : msgByUserId, receiver :  user?._id}
            ]
        })

        const conversationMessageId = conversation?.messages || []

        const updateMessages  = await MessageModel.updateMany(
            { _id : { "$in" : conversationMessageId }, msgByUserId : msgByUserId },
            { "$set" : { seen : true }}
        )

        //send conversation
        const conversationSender = await getConversation(user?._id?.toString())
        const conversationReceiver = await getConversation(msgByUserId)

        io.to(user?._id?.toString()).emit('conversation',conversationSender)
        io.to(msgByUserId).emit('conversation',conversationReceiver)
    })

    // disconnect
    socket.on('disconnect',()=>{
        onlineUser.delete(user?._id?.toString())
        console.log('disconnect user ',socket.id)
    })
})

module.exports = {
    app,
    server
}

