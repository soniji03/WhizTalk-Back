const Conversation = require('../models/ConversationModel'); // Assuming you have a Conversation model

async function getConversations(request, response) {
  try {
    const userId = request.user.id; // Assuming your auth middleware attaches the user to the request

    // Find all conversations where the current user is either the sender or receiver
    const conversations = await Conversation.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'name profile_pic')
      .populate('receiver', 'name profile_pic')
      .populate('lastMessage')
      .sort({ updatedAt: -1 }); // Sort by most recent

    // Transform the data to match your frontend expectations
    const transformedConversations = conversations.map(conv => {
      const otherUser = conv.sender._id.toString() === userId ? conv.receiver : conv.sender;
      return {
        _id: conv._id,
        userDetails: {
          _id: otherUser._id,
          name: otherUser.name,
          profile_pic: otherUser.profile_pic
        },
        lastMsg: conv.lastMessage ? {
          text: conv.lastMessage.text,
          imageUrl: conv.lastMessage.imageUrl,
          videoUrl: conv.lastMessage.videoUrl,
        } : null,
        unseenMsg: conv.unseenCount || 0 // Assuming you have a field for unseen message count
      };
    });

    response.json(transformedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    response.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getConversations };