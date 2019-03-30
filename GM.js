const axios = require('axios');
const { sendTextMessage} = require('./plantilla.js');


  const callCotiGM = async (messageData,sender) => {
    const url = "https://login.universales.com/cotizador-gm/api/api_cotizador/cotizar" ;
      await axios.post(url, messageData)
        .then(function (response) {
          if (response.status == 200) {
            console.log("cotizacion: "+ response.data.msg);
            sendTextMessage(sender, "Adjunto su código de cotización: "+ response.data.msg);
          }
        })
        .catch(function (error) {
          console.log(error.response);
        });
    }


  module.exports = {
  callCotiGM
  }
