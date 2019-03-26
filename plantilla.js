const { callSendAPI } = require('./fbApi.js');
const request = require("request-promise");

// Enviar mensaje sencillo
const sendTextMessage = async (recipientId, text) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text
      }
    };
    await callSendAPI(messageData);
  }


// Envia Globos de opciones
  const sendQuickReply = async (recipientId, text, replies, metadata) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text,
        //metadata: isDefined(metadata) ? metadata : "",
        quick_replies: replies
      }
    };
    await callSendAPI(messageData);
  }


  module.exports
  {
    sendTextMessage,
    sendQuickReply
  }