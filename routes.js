const { nanoid } = require("nanoid");

const generateApiKey = () => nanoid(32);

function setupRoutes(app, client) {
  const servicesRef = client.db("services").collection("services");
  const keysRef = client.db("services").collection("keys");

  const activateService = async (serviceName) => {
    await servicesRef.updateOne(
      { name: serviceName },
      { $set: { state: "active" } }
    );
    await keysRef.updateOne(
      { name: serviceName },
      { $set: {state: "valid"} }
    );
  }
    
  const deactivateService = async (serviceName) => {
    await servicesRef.updateOne(
      { name: serviceName },
      { $set: { state: "inactive" } }
    );
    await keysRef.updateOne(
      { name: serviceName },
      { $set: {state: "blocked"} }
    );
  }
    
  const listServices = async () => await servicesRef.find().toArray();

  const validateKey = async (apiKey) => {
    const key = await keysRef.findOne({apiKey});
    if (key) {
      if (key.state === "valid") {
        return true;
      } else {
        console.log("key", apiKey, "is not valid");
        return false;
      }
    } else {
      console.log("key", apiKey, "not found");
      return false;
    }
  }

  app.get("/", (req, res) => {
    res.json({
      message: "Service Handler up and running",
    });
  });

  app.get("/list", async (req, res) => {
    try {
      const services = await listServices();
      res.json({ services });
    } catch (error) {
      console.error("Error al obtener la lista de servicios:", error);
      res.status(500).json({ error: "Error al obtener la lista de servicios" });
    }
  });

  app.post("/add", async (req, res) => {
    try {
      console.log({ body: req?.body });
      const { name, description } = req.query;

      console.log({ name, description });

      if (!name || !description) {
        return res
          .status(400)
          .json({ error: "Name and description are required" });
      }

      const apiKey = generateApiKey();
      console.log({apiKey});

      const newService = {
        name,
        description,
        state: "active",
        apiKey,
      };

      await servicesRef.insertOne(newService);
      await keysRef.insertOne({name, apiKey, state: "valid"});

      res.json({
        message: "Servicio agregado correctamente",
        service: newService,
      });
    } catch (error) {
      console.error("Error al agregar servicio:", error);
      res.status(500).json({ error: "Error al agregar servicio" });
    }
  });

  app.post("/validate", async (req, res) => {
    const { apiKey } = req.body;
    (await validateKey(apiKey)) ?
    res.status(200).json({ message: "Key is valid" }) :
    res.status(401).json({ message: "Key is not valid" });
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
}

module.exports = setupRoutes;
