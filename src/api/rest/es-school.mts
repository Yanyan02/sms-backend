
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "es-school"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-school": {
      date: Joi.string(),
      name: Joi.string(),
      address: Joi.string(),
      email: Joi.string(),
    },
    "get-school": {},
    "update-school": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-school"(req, res) {
        console.log("Reqqqqqqqq", req.body);
        this.create_school(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-school"(req, res) {
        this.get_school().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-school"(req, res) {
        const { _id, title } = req.body
        this.update_school(_id, title).then(() => res.json({ data: "Successfully Update school" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {

    async create_school(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create school");
      return Promise.resolve("Successfully created school")

    },

    async get_school() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_school(id, title) {
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