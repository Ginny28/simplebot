const config = require('./Global.js');
const axios = require('axios');

// envia respuesta a facebook!!
const callSendAPI = async (messageData) => {

const url = "https://graph.facebook.com/v3.0/me/messages?access_token=" + config.PAGE_ACCESS_TOKEN;
  await axios.post(url, messageData)
    .then(function (response) {
      if (response.status == 200) {
        var recipientId = response.data.recipient_id;
        var messageId = response.data.message_id;
        if (messageId) {
          console.log(
            "Exito %s al usuario %s",
            messageId,
            recipientId
          );
        } else {
          console.log(
            "Se envio al API para el usuario %s",
            recipientId
          );
        }
      }
    })
    .catch(function (error) {
      console.log(error.response.headers);
    });
}

module.exports = {
    callSendAPI
  }