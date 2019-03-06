const diaFw = require("apiai");
const xpress = require("express");
const bdprser = require("body-parser");
const uuid = require("uuid");


// import config-file

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
    if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
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
app.post("/webhook", function (req, res) {
    // Verificar si el vento proviene del pagina asociada
    if (req.body.object == "page") {
        // Si existe multiples entradas entraas
        req.body.entry.forEach(function(entry) {
            // Iterara todos lo eventos capturados
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    process_event(event);
                }
            });
        });
        res.sendStatus(200);
    }
});

