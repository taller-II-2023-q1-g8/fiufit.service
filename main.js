const MongoClient = require("mongodb").MongoClient;

let express = require("express");
let path = require("path");
let logger = require("morgan");
const cors = require("cors");

// express
let app = express();
const port = 3000;

const cors_options = {
  origin: "*",
};

app.use(logger("dev"));
app.use(cors(cors_options));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// mongo
//const uri = process.env.mongoDBURL;
const uri = "mongodb+srv://agutson:ALk4ptPouruMKDWO@services.hgdwmtd.mongodb.net";
if (!uri) {
    console.log("No se ha encontrado la URL de la base de datos");
    process.exit(0);
} 
const client = new MongoClient(uri);
const servicesRef = client.db("services").collection("services");

const setupRoutes = require("./routes");

async function main() {
  try {
    await client.connect();
    
    setupRoutes(app, client);

    const server = app.listen(port, () => {
      console.log(`Gateway listening on port ${port}`);
    });

    process.on("SIGINT", async () => {
        try {
          await server.close();
          await client.close();
          console.log("\n Server and MongoDB connection closed.");
          process.exit(0);
        } catch (err) {
          console.error(
            "Error al cerrar el servidor o la conexión a la base de datos:",
            err
          );
          process.exit(1);
        }
      });
    } catch (err) {
        console.error(err);
      }
    }


    main().catch(console.error);