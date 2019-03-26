var SimpleDate = require('simple-datejs');

var gmCoti = {
    "plan":17,
    "wayPay":"L4",
    "group":1,
    "typeContribution":"N",
    "startOfValidity":"22/03/2019",
    "endOfValidity":"22/03/2019",
    "discount":0.0,
    "increase":0.0,
    "discountwws":0.0,
    "increasewws":0.0,
    "baseCharge":51,
    "deductible":0,
    "typeLife":1,
    "executive":"LCARDONA",
    "phone":"",
    "mail":"",
    "rate":0.0,
    "address":"",
    "dateReception":"22/03/2019",
    "agent":1,
    "coin":"01",
    "contributionBase":0,
    "ip":"",
    "observation":"",
    "message":""
  }



const getGMCoti = async (grupoId) => {
    var today = new SimpleDate();
    var validity = new SimpleDate();
        validity.addDays(30);
    gmCoti.group = grupoId;
    gmCoti.startOfValidity = validity.toString('dd/MM/yyyy');
    gmCoti.endOfValidity = validity.toString('dd/MM/yyyy');
    gmCoti.dateReception = today.toString('dd/MM/yyyy');

    console.log("json: "+ gmCoti);
    
    /*const url = "https://login.universales.com/cotizador-gm/api/api_cotizador/cotizar";
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
        });*/
    }
    
    module.exports = {
        getGMCoti
      }