const diaFw = require("apiai");
const xpress = require("express");
const bdprser = require("body-parser");
const uuid = require("uuid");
var rest = require('restler');
const axios = require("axios");
var SimpleDate = require('simple-datejs');
var config = require('./Global.js');
const { callSendAPI } = require('./fbApi.js');
const { sendTextMessage,sendQuickReply,sendGifMessage,sendButtonMessage,sendOpenGraph } = require('./plantilla.js');
const { callCotiGM} = require('./GM.js');
var detalles ={};


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
        }  else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        }else {
          console.log("Webhook received unknown messagingEvent: ",messagingEvent);
        }
      });
    });
    //ok!!
    res.sendStatus(200);
  }
});


//**** functions ******* //
   // cuando recibe un postback de algún template.
function receivedPostback(event) {
  console.log(event);

  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var payload = event.postback.payload;
  handleApiAiAction(senderID, payload, "", "", "");

}

function receivedMessage(event) {
  var senderID = event.sender.id;
  var message = event.message;

  if (!sessionIds.has(senderID)) {
    sessionIds.set(senderID, uuid.v1());
    config.SEGUNI[senderID] ={status:'OK'};
    config.CORE = [];
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

//verifica validez de entrada
const isDefined = (obj) => {
  if (typeof obj == "undefined") {
    return false;
  }
  if (!obj) {
    return false;
  }
  return obj != null;
}


function handleApiAiResponse(sender, response) {
 let responseText = response.result.fulfillment.speech;
  let responseData = response.result.fulfillment.data;
  let messages = response.result.fulfillment.messages;
  let action = response.result.action;
  let contexts = response.result.contexts;
  let parameters = response.result.parameters;
  sendTypingOff(sender);


   if (isDefined(parameters.modelo))
   {
    addNewAuto(sender,parameters.modelo,1);
   }
   if (isDefined(parameters.sumaAseg))
   {
    console.log("tengo valor asignado -> "+parameters.sumaAseg);
    addNewAuto(sender,parameters.sumaAseg,2);
   }
   if (isDefined(parameters.marca))
   {
    console.log("tengo marca y estilo asignado -> "+parameters.marca);
    addNewAuto(sender,parameters.marca.toUpperCase(),7);
   }
   if (isDefined(parameters.estilo))
   {
    console.log("tengo marca y estilo asignado -> "+parameters.estilo);
    addNewAuto(sender,parameters.estilo.toUpperCase(),8);
   }
   if (isDefined(parameters.telefono))
   {
    console.log("tengo telefono -> "+parameters.telefono);
    addNewAuto(sender,parameters.telefono,9);
   }
   if (isDefined(parameters.email))
   {
    console.log("tengo email -> "+parameters.email);
    addNewAuto(sender,parameters.email,10);
   }
   if(isDefined(parameters.nacimiento))console.log("tengo fechanac -> "+parameters.nacimiento);
   if(isDefined(parameters.genero)) console.log("tengo sexo -> "+parameters.genero);


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

const sendTypingOff = (recipientId) =>
{
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };
  callSendAPI(messageData);
}

function handleApiAiAction(sender, action, responseText, contexts, parameters) {
   switch (action) {
    case "tipo-seguro":
       textRp = "Te ofrecemos seguros de vehículo, personal, hogar y gastos médicos, indicarme cuál te interesa. Para que conozcas más de nuestros productos visita:  \n https://www.universales.com/productos/"
       replies = [{
        "content_type": "text",
        "title": "Vehículo",
        "payload": "Vehiculo",
      },
      {
        "content_type": "text",
        "title": "Gastos Médicos",
        "payload": "GastosM",
      },
      {
        "content_type": "text",
        "title": "Personal",
        "payload": "Seguros de Vida",
      }];
      sendQuickReply(sender, textRp, replies);
      break;
    case "Auto-marca":
      sendTextMessage(sender," Estilo [ex. Yaris]");
    break;
    case "Auto-estilo":
      responseText ="Me puedes dar tu nro. Teléfono y correo [Ex. 24568965 ejemplo@gmail.com]";
      sendTextMessage(sender,responseText);
    break;
    case "GastosM":
        textRp = "Te ofrecemos seguros  Individual, Familiar e Infantil(Crece), favor indicar cual le interesa"
      /*  replies = [{
         "content_type": "text",
         "title": "Individual",
         "payload": "GM-Ind",
       },
       {
         "content_type": "text",
         "title": "Familiar",
         "payload": "GM-Fam",
       },
       {
         "content_type": "text",
         "title": "Infantil",
         "payload": "GM-Crece",
       }];
   sendQuickReply(sender, textRp, replies);*/
   sendTextMessage(sender,textRp);
   recorrer();
    break;
    case "Auto-complete":
    callToken(config.AUTHSERVICE,config.SEGUNI,2,sender);
    break;
    case "GM-Ind":
    sendTextMessage(sender,"Me su fecha de nacimiento [dd/mm/yyyy]");
    break;
    case "GM_genero":
    getUserData(sender,2);
    break;

    case "GM-Fam":
    sendTextMessage(sender,"¿Cuántos hijos menores de 24 años tiene?");
    break;
    case "GM-Crece":
    sendTextMessage(sender,"¿Cuál es el nombre del niño/a ?");
    break;
    case "saldoPol-poliza":
       callToken(config.AUTHSERVICE,nPoliza(parameters.poliza.number),1,sender);
    break;
    case "CV":
         textPayload = 'Gracias por tu interés en trabajar con nosotros. '+
                        'Por favor llena nuestro formulario de empleos y adjunta tu CV.\n'+
                        'En cuanto tengamos una plaza disponible en el área de tu interés tomaremos en cuenta tu perfil. \n'+
                        'Para tener acceso al formulario de empleo haz clic en el siguiente botón:';
         elements = [{
                       "type": "web_url",
                       "url": "https://www.universales.com/contactenos/empleos/",
                       "title": "Formulario",
                        }]

        sendButtonMessage(sender, textPayload, elements);
    break;
    case "NOS":
        texto ='Puedes ubicar nuestras oficinas centrales en la 4ta. calle 7-73 zona 9 \n'
               + 'También puedes comunicarte con nosotros al teléfono 2384-7400 y con gusto te atenderemos. \n'
               + 'Nuestro horario de atención es de Lunes a Viernes de 8:15 a 17:00 horas.\n'
               + 'En caso de emergencia puedes comunicarte a:\n'
               +  ' \t - Cabina de emergencia vehículos: 1789\n'
               +  ' \t - Cabina de emergencia Gastos Médicos: 5630-3195 (Llamada o Whatsapp)\n'
               +  ' \t - Whatsapp reclamos: 5979-1789'
        sendTextMessage(sender,texto);
        var element = [{
          //"url": "https://l.messenger.com/l.php?u=https%3A%2F%2Fwaze.com%2Ful%2Fh9fxeh5z23&h=AT1wbVVBZhAbWu35emUPrsAw5B8IkTPk2UI0rN6orbXcicqUm0HZiJyfQyC4nVPkLIOY987fALlZui1_HhH3H7aw1-S0hf0jeQGQ-LS3WTtQE10z6Y1clYAUET70pWuwfm_qmQ",
          "url": "https://waze.com/ul/h9fxeh78x1",
          "buttons": [
            {
              "type": "web_url",
              "url": "https://www.universales.com/",
              "title": "Más"
            }
          ]
        }]
        sendOpenGraph(sender,element);

    break;
    case "SOS":
    textQRp = "selecciona tu tipo de Emergencia 🚑"
    reply = [
    {
      "content_type": "text",
      "title": "Emergencia Médica",
      "payload": "Emer-Medic"
    },
    {
      "content_type": "text",
      "title": "Emergencia Auto",
      "payload": "Emer-Auto"
    }];
    sendQuickReply(sender, textQRp, reply);
    break;
    case "Emer-Medic":
       textPayload = 'Queremos saber tu emergencia:';
       elements = [{
                     "type": "web_url",
                     "url": "https://wa.me/50256303195?text=Tengo%20una%20Emergencia",
                     "title": "Escríbenos 💬",
                   },
                   {
                      "type": "phone_number",
                      "payload": "+50256303195",
                      "title": "Llamar a Emergencia",
                   }]

      sendButtonMessage(sender, textPayload, elements);
    break;
    case "Emer-Auto":
    textPayload = 'Queremos saber tu emergencia:';
       elements = [{
                     "type": "web_url",
                     "url": "https://wa.me/50259791789?text=Tengo%20una%20Emergencia",
                     "title": "Escríbenos 💬",
                   },
                   {
                      "type": "phone_number",
                      "payload": "+5021789",
                      "title": "Llamar a Emergencia",
                   }]

      sendButtonMessage(sender, textPayload, elements);
    break;
    case "CONTACTO":
          textPayload = '¿Como le podemos Ayudar?';
          elements = [
              {
               "type": "postback",
               "title": "Enviar CV",
               "payload": "CV"
              },
              {
               "type": "postback",
               "title": "Ubicación",
               "payload": "NOS"
              },
              {
                "type": "phone_number",
                "title": "Llamar a Seguros universales",
                "payload": "+50223847400"
              }]
              sendButtonMessage(sender, textPayload, elements);
    break;
    case "INIT-CHAT":
           textPayload = 'selecciona una opción';
           elements = [{
                "type": "postback",
                "title": "Info de Seguros",
                "payload": "tipo-seguro"
               },{
                "type": "postback",
                "title": "Contáctenos",
                "payload": "CONTACTO"
               },{
                "type": "postback",
                "title": "Emergencia",
                "payload": "SOS"
              }
              ]
    sendButtonMessage(sender, textPayload, elements);
    break;
    case "CANCION":
    sendTextMessage(sender,"No canto bien pero, esta es una de mis favoritas")
    elements = [
         {
          "url":"https://open.spotify.com/track/5wj4E6IsrVtn8IBJQOd0Cl",
          "buttons":[
            {
              "type":"web_url",
              "url":"https://es.wikipedia.org/wiki/Oasis_(banda)",
              "title":"Ver más"
            }
          ]
        }
      ]
      sendOpenGraph(sender,elements);
    break;
    case "Act-chao":
    sendTextMessage(sender,"Fue un placer haberle ayudado!");
    sendGifMessage(sender,"https://raw.githubusercontent.com/andycha28/MyIcons/master/boot3.gif?raw=true");
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


const callToken = async (authData,senderValue,wService,sender) => {

  await axios.post("https://login.universales.com/users/v2/api/login/wis",authData,
    {
  headers: {'Content-Type' : 'application/json' }
  }).then(function (response) {
        if (response.data.code == '200')
        {
          switch (wService)
          {
            case 1:
              getSaldo(senderValue,response.data.recordset.token,sender);
              break;
            case 2:
              getBrandStyle(senderValue[sender],response.data.recordset.token,sender);
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






const getBrandStyle = async (senderValue,bearerAuth,sender) => {

const urlAuto ='https://login.universales.com/inspeccion/v2/api/brand';
await axios.get(urlAuto,
  {
  headers: {'Authorization': 'Bearer '+ bearerAuth }
  }).then(function (response) {
   for (var i = 0; i < response.data.recordset.length; i++) {
      rs = response.data.recordset[i]
          if(rs.brandName ==senderValue.marcaN && rs.styleName == senderValue.estiloN)
          {
          	addNewAuto(sender,rs.brandCode,3);
          	addNewAuto(sender,rs.styleCode,4);
          	addNewAuto(sender,rs.type,5);
            getUserData(sender,1);
            break;
          }
    }
  })
   .catch(function (error) {
      console.log('ErRo:'+ error.response.headers);
    });
}


const getUserData = async (sender,tipo) => {
const urlUser ='https://graph.facebook.com/v3.0/'+sender+'?fields=name,first_name,middle_name,last_name&access_token='+config.PAGE_ACCESS_TOKEN;
await axios.get(urlUser).then(function (response) {
  switch (tipo) {
    case 1:
        addNewAuto(sender,response.data.name,6);
        getCoti(sender);
      break;
    case 2:
    // addFamDetail(response.data.first_name,1);
    // addFamDetail(response.data.middle_name,2);
    // addFamDetail(response.data.last_name,3);
    // addFamDetail(null,6);
    // var datesys = new SimpleDate
    // addMember(sender,datesys.toString('dd/MM/yyyy'),1);
    // addMember(sender,'ABSALAZAR',2);
    // config.CORE.push(detalles);
    // addMember(sender,config.CORE,3);

     //recorrer2();
    // recorrer3();
    console.log("mi nombre es: "+ response.data.first_name +" "+response.data.middle_name);
  //  getcot(24);

    break;
    default:

  }
  })
   .catch(function (error) {
      console.log('ErRo:'+ error.response.header);
    });
}


function getCoti(sender)
{

    var urlCoti = 'http://test.universales.com/universales-fe/camel/cotizadorAutos?'+getAutoData(sender);
    rest.post(urlCoti)
    .on('complete', function(dataCoti, response,err)
    {
      if (err)
      {
        console.log("error: "+ err);
      }
      else {
        var response ="Le adjunto el link de su cotización \n http://test.universales.com/reportes/reporte?"+dataCoti.url
        sendTextMessage(sender,response);
        deleteAuto(sender);
      }
  });
  console.log("String: "+ urlCoti);


}






function addNewAuto(sender,atributo,tipoAtrib)
{
	if (sender in config.SEGUNI)
	{
     switch(tipoAtrib)
     {
     	case 1:
     		config.SEGUNI[sender].modelo = atributo;
     	break;
     	case 2:
     		config.SEGUNI[sender].sumaAseg = atributo;
     	break;
     	case 3:
     		config.SEGUNI[sender].marca = atributo;
     	break;
     	case 4:
     		config.SEGUNI[sender].estilo = atributo;
     	break;
     	case 5:
     		config.SEGUNI[sender].tvehi = atributo;
     	break;
      case 6:
     		config.SEGUNI[sender].userN = atributo;
     	break;
      case 7:
     		config.SEGUNI[sender].marcaN = atributo;
     	break;
      case 8:
     		config.SEGUNI[sender].estiloN = atributo;
     	break;
      case 9:
        config.SEGUNI[sender].telefono = atributo;
      break;
      case 10:
        config.SEGUNI[sender].email = atributo;
      break;
     }

	}
}


function deleteAuto(sender)
{
	if (sender in config.SEGUNI)
	{
    delete config.SEGUNI[sender].modelo;
    delete config.SEGUNI[sender].sumaAseg;
    delete config.SEGUNI[sender].marca;
    delete config.SEGUNI[sender].estilo;
    delete config.SEGUNI[sender].tvehi;
    delete config.SEGUNI[sender].marcaN;
    delete config.SEGUNI[sender].estiloN;
	}
}

function recorrer()
{
	for (var x in config.SEGUNI)
	{
	    console.log('Key: ' + x );
	    console.log('Values: ');
	    var value = config.SEGUNI[x];
	    for (var y in value)
	    {
	        console.log('—- ' + y + ':' + value[y]);
	    }
	    console.log('\n');
	}
}

function getAutoData(sender)
{
  var parameters ="";
  if (sender in config.SEGUNI)
	{
    parameters = 'paquete=1019&oficina=01&observacion=CotizacionFB&formaPago=BC&modelo='+config.SEGUNI[sender].modelo+'&valor='+config.SEGUNI[sender].sumaAseg+
                 '&ttipovehi='+config.SEGUNI[sender].tvehi+'&marca='+config.SEGUNI[sender].marca+'&estilo='+config.SEGUNI[sender].estilo+
                 "&nombreCliente="+config.SEGUNI[sender].userN+'&telefono='+config.SEGUNI[sender].telefono+'&email='+config.SEGUNI[sender].email;
	}
  return parameters;
}

const getGrupo = async (messageData) => {

  const url = "https://login.universales.com/cotizador-gm/api/api_cotizador/core" ;
    await axios.post(url, messageData)
      .then(function (response) {
        if (response.status == 200) {
          console.log("Grupo: "+ response.data.idGroup);


        }
      })
      .catch(function (error) {
        console.log(error.response.headers);
      });
  }
