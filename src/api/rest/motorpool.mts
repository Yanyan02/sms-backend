
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "vehicles"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-vehicle": {
      date:  new Date(),
      type: Joi.string().valid('Equipment', 'Vehicle'),
      name: Joi.string(),
      id: Joi.string(),
      // project: Joi.string().optional(),
      make: Joi.string(),
      serial_no: Joi.string(),
      brand: Joi.string(),
      model: Joi.string(),
      date_purchased: Joi.date(),
      other: Joi.string().allow('').optional()
    
    },
    "get-vehicle": {
    },
   
  },
  handlers: {
    "POST": {
      "create-vehicle"(req, res) {
        this.create_vehicle(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
     
    },
    "GET": {
      "get-vehicle"(req, res) {
        this.get_vehicle().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-vehicle"(req, res) {
        const { _id, title } = req.body
        this.update_vehicle(_id, title).then(() => res.json({ data: "Successfully Update vehicle" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {
   async create_vehicle(data) {
     const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create vehicle");
      return Promise.resolve("Successfully created vehicle")
},

async get_vehicle() {
return this.db?.collection("vehicles").find({}).toArray();

},
async update_vehicle(id, title) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { title: title } }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    }

  }
})