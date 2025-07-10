import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "trip-tickets"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "request-trip-ticket": {
      date: new Date(),
      vehicle_id: Joi.string(),
      destination: Joi.array(),
      diesel: Joi.string(),
      type: Joi.string(),
      project: Joi.string(),
      status: Joi.string(),
      with_gas: Joi.boolean(),
      driver: Joi.string(),
      gas: Joi.array().optional(),
      reason: Joi.string(),
    },
    "get-trip-ticket": {
      project: Joi.string().allow(""),
    },
    "update-checklist": {
      trip_id: Joi.string(),
      checklist: Joi.object()
    },
    "create-breakdown": {
      vehicle_id: Joi.string(),
      problem: Joi.string(),
      work_desc: Joi.string(),
      parts: Joi.string(),
    },
    "update-breakdown": {
      breakdown: Joi.object()
    },
    "create-job-order" : {
      trip_id : Joi.string(),
      vehicle_id : Joi.string(),
      problems_encounter: Joi.string(),
      inspected_by: Joi.string().allow(''),
      estimated_days_repair: Joi.number().allow(null),
      work_done: Joi.string().allow(''),
      conducted_by: Joi.string().allow(''),
      date_started: Joi.string().isoDate().allow(''),
      date_completed: Joi.string().isoDate().allow(''),
      time_started: Joi.string().allow(''),
      time_completed: Joi.string().allow(''),
      inspected_date: Joi.string().isoDate().allow(''),
      materials: Joi.array().items(),
      turnover: Joi.object({
        conducted_by: Joi.string().allow(''),
        date: Joi.string().isoDate().allow(''),
        results: Joi.string().allow(''),
        accepted_by: Joi.string().allow(''),
        acceptance_date: Joi.string().isoDate().allow('')
      })
    }
  },

  handlers: {
    "POST": {
      "request-trip-ticket"(req, res) {
        this.request_trip_ticket(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
      "create-breakdown"(req, res) {
        this.create_breakdown(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
      "create-job-order"(req, res) {
        this.create_job_order(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      }
    },
    "GET": {
      "get-trip-ticket"(req, res) {
        this.get_trip_ticket(req.query)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(400).json({ error }));
      },
    },
    "PUT": {
      "update-checklist"(req, res) {
        const { trip_id, checklist } = req.body;

        if (!checklist) {
          return res.status(400).json({ error: "Missing vehicle_id or checklist." });
        }

        this.update_checklist(trip_id, checklist)
          .then(() => res.json({ data: "Successfully submitted checklist." }))
          .catch((error) => res.status(400).json({ error }));
      },
      "update-breakdown"(req, res) {
        const { breakdown } = req.body;

        if (!breakdown) {
          return res.status(400).json({ error: "Missing vehicle_id or breakdown." });
        }

        this.update_breakdown(breakdown)
          .then(() => res.json({ data: "Successfully submitted breakdown report." }))
          .catch((error) => res.status(400).json({ error }));
      }
    }
  },

  controllers: {
    async request_trip_ticket(data: any) {
      data.project = data.project ? new ObjectId(data.project) : '';
      data.vehicle_id = data.vehicle_id ? new ObjectId(data.vehicle_id) : '';
      data.date = data.date ? new Date(data.date) : '';

      if (Array.isArray(data.destination)) {
        data.destination = data.destination.map((dest: any) => ({
          ...dest,
          date: new Date(dest.date),
        }));
      }

      if (Array.isArray(data.gas)) {
        data.gas = data.gas.map((g: any) => ({
          ...g,
          liters: Number(g.liters),
          cost: Number(g.cost),
        }));
      }

      data.date = new Date();

      const result = await this.db?.collection(collection).insertOne(data);
      if (!result?.insertedId) return Promise.reject("Request Failed!");
      return Promise.resolve("Successfully requested Trip ticket!");
    },

    async get_trip_ticket(filter: any) {
      const match: any = {};

      if (filter.project) {
        match.project = new ObjectId(filter.project);
      }

      return this.db?.collection("trip-tickets").aggregate([
        { $match: match },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project"
          }
        },
        {
          $unwind: {
            path: "$project",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $lookup: {
            from: "vehicles",
            localField: "vehicle_id",
            foreignField: "_id",
            as: "vehicle"
          }
        },
        {
          $unwind: {
            path: "$vehicle",
            preserveNullAndEmptyArrays: false
          }
        }
      ]).toArray();
    },

    async update_checklist(trip_id, checklist) {
      checklist.date = new Date();

      const result = await this.db?.collection("trip-tickets").updateOne(
        { _id: new ObjectId(trip_id) },
        { $set: { checklist, status: "checked" } },
        { upsert: true }
      );

      return result;
    },

    async update_breakdown(breakdown) {
      breakdown.date = new Date();

      const result = await this.db?.collection("trip-tickets").updateOne(
        { _id: new ObjectId(breakdown.trip_id) },
        { $set: { breakdown, status: "breakdown" } },
        { upsert: true }
      );

      return result;
    },

    async create_breakdown(data) {
      data.vehicle_id = new ObjectId(data.vehicle_id);
      data.date = new Date();

      const result = await this.db?.collection("breakdown").insertOne(data);
      if (!result?.insertedId) return Promise.reject("Request Failed!");

      const updateResult = await this.db?.collection("vehicles").updateOne(
        { _id: data.vehicle_id },
        { $set: { status: "breakdown" } }
      );

      if (updateResult?.modifiedCount === 0) return Promise.reject("Vehicle status update failed!");

      return Promise.resolve("Successfully created breakdown report!");
    },
    async create_job_order(data) {
      data.trip_id = new ObjectId(data.trip_id);
      data.vehicle_id = new ObjectId(data.vehicle_id);

      if (Array.isArray(data.materials)) {
        data.materials = data.materials.map((m : any)=> ({
          ...m,
          quantity: Number(m.quantity)
        }));
      }
      data.estimated_days_repair = Number(data.estimated_days_repair)
      const result = await this.db?.collection("job-order").insertOne(data);
      if (!result?.insertedId) return Promise.reject("Request Failed!");
      return Promise.resolve("Successfully created job order!");
    }
  }
});
