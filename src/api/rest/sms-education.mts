import { Link } from '../../../../frontend/.nuxt/components';
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { EMAIL_TRANSPORT } from "@cfg/index.mjs";

const collection = "sms-education"

export default REST({
    cfg: {
        service: "MAIN"
    },

    validators: {

        "create-education": {
            title: Joi.string(),
        },
        "get-education": {},
        "update-education": {
            _id: object_id,
            title: Joi.string()
        }
    },

    handlers: {
        "POST": {
            "create-education"(req, res) {
                this.create_education(req.body)
                    .then(() => res.json({ data: "Successfully added education!" }))
                    .catch((error) => res.status(500).json({ error }));
            },
        },
        "GET": {
            "get-education"(req, res) {
                this.get_education().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
            },
        },
        "PUT": {
            "update-education"(req, res) {
                const { _id, title } = req.body
                this.update_education(_id, title).then(() => res.json({ data: "Successfully Update Education" }))
                    .catch((error) => res.status(400).json({ error }))
            }
        }
    },
    controllers: {

        async create_education(data) {
            return this.db?.collection(collection).insertOne(data)
        },

        async get_education() {
            return this.db?.collection(collection).find({}).toArray()
        },

        async update_education(id, title) {
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