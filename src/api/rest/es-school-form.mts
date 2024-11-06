
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "es-school-form"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-school-form": {
      adviser: Joi.string().allow(""),
      school: Joi.string().allow(""),
      grade_level: Joi.string(),
      section: Joi.string(),
      subjects: Joi.array(),
      exam_items: Joi.array(),
      students: Joi.array(),
    },
    "get-school-form": {},
    "update-school-form": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-school-form"(req, res) {
        console.log("Reqqqqqqqq", req.body);
        this.create_school_form(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-school-form"(req, res) {
        this.get_school_form().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-school-form"(req, res) {
        const { _id, title } = req.body
        this.update_school_form(_id, title).then(() => res.json({ data: "Successfully Update school_form" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {

    async create_school_form(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create school_form");
      return Promise.resolve("Successfully created school_form")

    },

    async get_school_form() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_school_form(id, title) {
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