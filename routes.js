function setupRoutes(app, client) {
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
  
    app.get("/", (req, res) => {
      res.json({
        message: "Hello World!",
      });
    });
  
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
  }
  
  module.exports = setupRoutes;