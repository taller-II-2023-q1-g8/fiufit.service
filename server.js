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
const uri = process.env.mongoDBURL;
if (!uri) exit(0);
const client = new MongoClient(uri);
const servicesRef = client.db("services").collection("services");

const addService = async (newService) =>
  await servicesRef.insertOne(newService);

const activateService = async (serviceName) =>
  await servicesRef.updateOne(
    { name: serviceName },
    { $set: { state: "active" } }
  );

const deactivateService = async (serviceName) =>
  await servicesRef.updateOne(
    { name: serviceName },
    { $set: { state: "inactive" } }
  );

const listServices = async () => await servicesRef.find().toArray();

async function main() {
  try {
    await client.connect();

    // endpoints
    app.get("/", (req, res) => {
      res.json({
        message: "Hello World!",
      });
    });

    // const databases = await client.db().admin().listDatabases();
    // console.log(databases);

    // await deactivateService("Users");
    // const services = await listServices();
    // console.log({ services });
    app.get("/list/", async (req, res) => {
      try {
        const services = await listServices();
        res.json({ services });
      } catch (error) {
        console.error("Error al obtener la lista de servicios:", error);
        res
          .status(500)
          .json({ error: "Error al obtener la lista de servicios" });
      }
    });

    app.post("/add", async (req, res) => {
      try {
        const { name, description } = req.query;

        if (!name || !description) {
          return res
            .status(400)
            .json({ error: "Name and description are required" });
        }

        const newService = {
          name,
          description,
          state: "active",
        };

        addService(newService);

        res.json({
          message: "Servicio agregado correctamente",
          service: newService,
        });
      } catch (error) {
        console.error("Error al agregar servicio:", error);
        res.status(500).json({ error: "Error al agregar servicio" });
      }
    });

    app.put("/activate/:serviceName", async (req, res) => {
      const { serviceName } = req.params;
      activateService(serviceName);
      res.json({ message: `Servicio ${serviceName} activado` });
    });

    app.put("/deactivate/:serviceName", async (req, res) => {
      const { serviceName } = req.params;
      deactivateService(serviceName);
      res.json({ message: `Servicio ${serviceName} desactivado` });
    });

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
