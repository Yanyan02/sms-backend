
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "es-users"

export default REST({
  cfg: {
    service: "USERS",
    public: true
  },

  validators: {
    "create-user": {
      date: Joi.date(),
      username: Joi.string().allow(""),
      password: Joi.string().allow(""),
      email: Joi.string(),
      last_name: Joi.string(),
      middle_name: Joi.string(),
      first_name: Joi.string(),
      role: Joi.string(),
      school: Joi.string(),
      status: Joi.string(),


    },

    "get-users": {},
  },

  handlers: {
    "POST": {
      "create-user"(req, res) {
        this.create_user(req.body)
          .then((data) => {
            this.postoffice[EMAIL_TRANSPORT].post(
              {
                from: "mariannemaepaclian@gmail.com",
                to: req.body.email
              },
              {
                context: {
                  name: 'Hello'

                },
                template: "sms-user-invite",
                layout: "centered"
              }
            );
          })
          .catch((error) => res.status(400).json({ error }))
      },

    },
    "GET": {
      "get-users"(req, res) {
        this.get_users(req.session).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },

    }
  },
  controllers: {
    async create_user(data) {

      const { school } = data.designation_information;
      if (school) data.designation_information.school = new ObjectId(school);

      // logic send mail

      const result = await this.db.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Failed to insert user");
      return Promise.resolve("Succesfully invited users");
    },

    async get_users(user: any) {
      return this.db.collection(collection).aggregate([
        {
          $match: {}
        },
      ]
      ).toArray()
    },
  }
})