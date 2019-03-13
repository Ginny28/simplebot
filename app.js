const diaFw = require("apiai");
const xpress = require("express");
const bdprser = require("body-parser");
const uuid = require("uuid");
const axios = require("axios");
var SimpleDate = require('simple-datejs');
var config = require('./Global.json');
var myCarData = [];

var authService = {
    "email":"ccarrillo@universales.com",
    "password":"12345",
    "loginType":"N",
    "registrationId": 1,
    "idPlatform": 1
  }


// import apiai
const apiAiService = diaFw(config.DIAFLOW_TOKEN, {
  language: "es",
  requestSource: "fb"
});
const sessionIds = new Map();

// set port
var app = xpress();

// Process x-www-form-urlencoded
app.use(
	bdprser.urlencoded
	({
		extended: false
	})
);
//process app/json
app.use(bdprser.json());

// configurar el puerto y el mensaje en caso de exito
app.listen((process.env.PORT || 5000), () => console.log('fb esta escuchando!!'));

// Ruta de la pagina index
app.get("/", function (req, res) {

    res.send("Se ha desplegado Seguni :D!!!");

});

// Usados para la verificacion
app.get("/webhook", function (req, res) {
    // Verificar la coincidendia del token
    if (req.query["hub.verify_token"] === config.VERIFICATION_TOKEN) {
        // Mensaje de exito y envio del token requerido
        console.log("webhook verificado!");
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        // Mensaje de fallo
        console.error("La verificacion ha fallado, porque los tokens no coinciden");
        res.sendStatus(403);
    }
});

// Todos eventos de mesenger sera apturados por esta ruta

app.post("/webhook/", function (req, res) {
  var data = req.body;
  if (data.object == "page") {
  	// Si existe multiples entradas entraas
    data.entry.forEach(function (pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
    // Iterara todos lo eventos capturados
      pageEntry.messaging.forEach(function (messagingEvent) {
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ",messagingEvent);
        }
      });
    });
    //ok!!
    res.sendStatus(200);
  }
});


//**** functions ******* //
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  if (!sessionIds.has(senderID)) {
    sessionIds.set(senderID, uuid.v1());
  }

  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // Tipos de mensajes
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (messageText) {
    //se envia a DialogFlow
    sendToApiAi(senderID, messageText);
  } else if (messageAttachments) {
   // handleMessageAttachments(messageAttachments, senderID);
  }else if (quickReply)
  {
  	handleQuickReply(senderID, quickReply, messageId);
    return;
  }
}

function handleQuickReply(senderID, quickReply, messageId) {
  var quickReplyPayload = quickReply.payload;
  console.log(
    "Quick reply for message %s with payload %s",
    messageId,
    quickReplyPayload
  );
  //send payload to api.ai
  sendToApiAi(senderID, quickReplyPayload);
}



// maneja el envio a DialogFlow!!
function sendToApiAi(sender, text) {
  sendTypingOn(sender);
  let apiaiRequest = apiAiService.textRequest(text, {
    sessionId: sessionIds.get(sender)
  });

  apiaiRequest.on("response", response => {
    if (isDefined(response.result)) {
      handleApiAiResponse(sender, response); // manejador de data
    }
  });

  apiaiRequest.on("error", error => console.error(error));
  apiaiRequest.end();
}

//send typing
const sendTypingOn = (recipientId) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };
  callSendAPI(messageData);
}
//verifica validez
const isDefined = (obj) => {
  if (typeof obj == "undefined") {
    return false;
  }
  if (!obj) {
    return false;
  }
  return obj != null;
}


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


function handleApiAiResponse(sender, response) {
 let responseText = response.result.fulfillment.speech;
  let responseData = response.result.fulfillment.data;
  let messages = response.result.fulfillment.messages;
  let action = response.result.action;
  let contexts = response.result.contexts;
  let parameters = response.result.parameters;
  sendTypingOff(sender);

   console.log("accion:" + response+"--"+action);

   if (isDefined(parameters.modelo))
   {


     console.log("tengo modelo asignado ->"+parameters.modelo);
     myCarData.push(parameters.modelo);
   }
   if (isDefined(parameters.sumaAseg))
   {
    console.log("tengo valor asignado -> "+parameters.sumaAseg);
    myCarData.push(parameters.sumaAseg);
   }
   if (isDefined(parameters.marca))
   {
    var marcaStilo = parameters.marca;
    var arr = marcaStilo.split(" ");
    console.log("tengo marca y estilo asignado -> "+parameters.marca);

    myCarData.push(parameters.marca);
   }

 //console.log("Valor:"+ parameters.sumaAseg);
 //console.log("Marca:"+ parameters.marcas);

 if (responseText == "" && !isDefined(action)) {
    //api ai could not evaluate input.
    console.log("Unknown query" + response.result.resolvedQuery);
    sendTextMessage(
      sender,
      "No le entiendo, puede ser más específico?"
    );
  } else if (isDefined(action)) {
    handleApiAiAction(sender, action, responseText, contexts, parameters);
  } else if (isDefined(responseData) && isDefined(responseData.facebook)) {
    try {
      console.log("Response as formatted message" + responseData.facebook);
      sendTextMessage(sender, responseData.facebook);
    } catch (err) {
      sendTextMessage(sender, err.message);
    }
  } else if (isDefined(responseText)) {
    sendTextMessage(sender, responseText);
  }
}

const sendTypingOff = (recipientId) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}


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


const sendQuickReply = async (recipientId, text, replies, metadata) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text,
      metadata: isDefined(metadata) ? metadata : "",
      quick_replies: replies
    }
  };

  await callSendAPI(messageData);
}


function handleApiAiAction(sender, action, responseText, contexts, parameters) {
   switch (action) {
    case "textos":
      var responseText = "Prueba mensaje"
      sendTextMessage(sender, responseText);
      break;
    case "tipo-seguro":
      const textRp = "Le ofrecemos seguros de vehículo, personal, hogar y gastos médicos, favor indicar cual le interesa. Para conocer más de nuestros productos visite:  \n https://www.universales.com/productos/"
      const replies = [{
        "content_type": "text",
        "title": "Vehiculo",
        "payload": "Vehiculo",
      },
      {
        "content_type": "text",
        "title": "Gastos Medicos",
        "payload": "Gastos Medicos",
      },
      {
        "content_type": "text",
        "title": "Personal",
        "payload": "Seguros de Vida",
      }];
      sendQuickReply(sender, textRp, replies);
      break;
    case "Auto-marca":
      var responseText = "Le adjunto el link de su cotización \n http://test.universales.com/reportes/reporte?190E65B7DDDCE129C2072F623D6319FCAC7FB261999FC53122C9442327028F60BE8DFB3980D83F74E9173438301C6CAF04&cp"
      sendTextMessage(sender,responseText);
    break;
    case "saldoPol-poliza":
       console.log("Poliza:"+parameters.poliza.number[0]);
       console.log("npoliza:"+nPoliza(parameters.poliza.number));
       var responseText = "El saldo pendiente de su póliza nro: " + nPoliza(parameters.poliza.number)
       callToken(authService,nPoliza(parameters.poliza.number),1,sender);
      // sendTextMessage(sender,responseText);
    break;


    default:
      //unhandled action, just send back the text
    sendTextMessage(sender, responseText);
  }
}

const nPoliza = (obj) => {
  var returnval="";
  for (var i = 0; i < obj.length; i++)
  {
    if (i< obj.length-1)
     {
       if (obj[i]>= 1 && obj[i] <= 9)
       {
         returnval +='0'+obj[i]+'-';
       }
       else {
         returnval += obj[i]+'-';
       }
     }
     else if (i= obj.length -1)
       {
           returnval += obj[i];
       }
  }
  return returnval;
}


const callToken = async (authData,polNum,wService,sender) => {

  await axios.post("https://login.universales.com/users/v2/api/login/wis",authData,
    {
  headers: {'Content-Type' : 'application/json' }
  }).then(function (response) {
        if (response.data.code == '200')
        {
          switch (wService)
          {
            case 1:
              getSaldo(polNum,response.data.recordset.token,sender);
              break;
            case 2:
              console.log("haré una cotización");
              break;
            default:
            break;
          }

        }

    })
    .catch(function (error) {
      console.log('ErRo:'+ error.response.headers);
    });
}


const getSaldo = async (polNum,bearerAuth,sender) => {
const urlSaldo ='https://login.universales.com/wis//v2/app/api/policy/'+polNum+'/statement';
await axios.get(urlSaldo,
  {
  headers: {'Authorization': 'Bearer '+ bearerAuth }
  }).then(function (response) {
        var date = new SimpleDate();
        date.addDays(30);
        var mesanio = date.toString('MM/yyyy');
        var dataPol = response.data;
        var contPend = 0;
        if(dataPol.code =='200')
                {
                var resultado =' El pago 💰 para su póliza nro. '+ dataPol.recordset[0].policy+'\n';

                for (var i = 0; i < dataPol.recordset.length; i++)
                  {
                    var rs = dataPol.recordset[i];
                   if (rs.state =='PENDIENTE')
                       {
                       var datePart = rs.paymentDate;
                       if ((datePart.substring(3,5) <= mesanio.substring(0,2)) && (datePart.substring(6,10) <= mesanio.substring(3,7)))
                       {
                         if (rs.currency =='USD') resultado += "\tfecha cobro : "+rs.paymentDate+" por $."+rs.amount+"\n";
                         else resultado += "\tfecha cobro : "+rs.paymentDate+" por Q."+rs.amountQ+"\n";
                       }
                       contPend ++;
                       }
                  }

                  if (contPend == 0)
                  {
                       resultado = 'Su póliza con nro. '+ dataPol.recordset[0].policy+'\n no tiene pagos pendientes 👏 👍';
                       sendTextMessage(sender,resultado);

                  }
                  else
                  {
                    sendTextMessage(sender,resultado);
                  }

                }


    })
    .catch(function (error) {
      console.log('ErRo:'+ error.response.headers);
      console.log('res: No Existo!!');
      sendTextMessage(sender, 'Esa póliza no se encuentra en nuestro sistema, verifique el número ');
    });
}
