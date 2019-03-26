

const { callSendAPI } = require('./fbApi.js');

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

 // Envia X objeto no definido [Ex. spotify] 
  const sendOpenGraph = async (recipientId, elements) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "open_graph",
            elements: elements
          }
        }
      }
    };
    await callSendAPI(messageData);
  }

   //Envia Menú con botones
  const sendButtonMessage = async (recipientId, text, buttons) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: text,
            buttons: buttons
          }
        }
      }
    };
    await callSendAPI(messageData);
  }
  //Envia Imágen o Gif
  const sendGifMessage = async (recipientId,urlImage)=> {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: urlImage
          }
        }
      }
    };
  
      await callSendAPI(messageData);
  }
  

  module.exports = {
    sendTextMessage,
    sendQuickReply,
    sendGifMessage,
    sendButtonMessage,
    sendOpenGraph
  }
  