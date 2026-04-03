
import { ObjectId } from 'mongodb'
import Joi, { date } from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "projects"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-project": {
  date:  Joi.string(),
  name:  Joi.string(),
  engineer:  Joi.string(),
  start_date: Joi.string(),
  end_date: Joi.string(),
  address:  Joi.string(),
  status :  Joi.string(),
  control_number :  Joi.string(),
  manpower: Joi.number(),
    },
    "get-project": {},
    "update-project": {
  _id: object_id.required(),
  date: Joi.string().optional(),
    name: Joi.string().optional(),
    engineer: Joi.string().allow("").optional(),
    address: Joi.string().allow("").optional(),
    start_date: Joi.string().allow("").optional(),
    end_date: Joi.string().allow("").optional(),
    status: Joi.string().allow("").optional(),
    control_number: Joi.string().allow("").optional(),
    manpower: Joi.number().allow(null).optional(),
    },
  },
  handlers: {
    "POST": {
      "create-project"(req, res) {
        this.create_project(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-project"(req, res) {
        this.get_project().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {

       "update-project"(req, res) {
        const { _id, ...payload } = req.body;
        this.update_project(_id, payload)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      
      }
    }
  },
  controllers: {

    async create_project(data) {
      data.date = new Date()
      data.start_date = new Date(data.start_date)
      data.end_date = new Date(data.end_date)
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create project");
      return Promise.resolve("Successfully created project")

    },

    async get_project() {
      return this.db?.collection(collection).find({}).toArray()
    },

   async update_project(id, payload) {

      if (payload.start_date) payload.start_date = new Date(payload.start_date)
      if (payload.end_date) payload.end_date = new Date(payload.end_date)
      if (payload.date) payload.date = new Date(payload.date)
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: payload } 
      )
      if (result.matchedCount === 0) {
        return Promise.reject("Item not found. Failed to update!")
      }

      return Promise.resolve("Successfully updated project")
    }

  }
})