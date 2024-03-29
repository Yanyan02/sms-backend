//Previous Name: RequestHandlerFactory
//Dependencies are imported and used by the functions below...
import db from "@lib/database.mjs";
import {PostOffice} from "@lib/mailman.mjs";
import spaces from "@lib/spaces.mjs";

export function REST<V, H, C>(struct : RESTHandlerDescriptor<V, H, C>) : H & C {
  const validators  : RequestValidators   = struct.validators  || {};
  const controllers : RequestControllers  = struct.controllers || {};
  const handlers    : RESTRequestHandlers = struct.handlers    || {};
  const cfg         : SFRConfig           = struct.cfg         || {};

  Object.entries(controllers).map(([k, v])=>controllers[k] = v.bind({ db, instance : db.get_connection() }));
  Object.entries(handlers).forEach(([method, handlermap])=>{
    Object.entries(handlermap).forEach(([k, v])=> {
      /* @ts-ignore */
      handlers[method][k] = v.bind({ ...controllers, postoffice : PostOffice.get_instances(), spaces});
    });
  });

  const __meta__ = { validators, controllers, handlers, cfg };
  
  return { db : null , __meta__, ...__meta__ } as H & C
}

export function WS<V, H, C>(struct : WSHandlerDescriptor<V, H, C>) : H & C {
  const validators  : RequestValidators  = struct.validators  || {};
  const controllers : RequestControllers = struct.controllers || {};
  const handlers    : WSRequestHandlers  = struct.handlers    || {};

  //Dependency injection happens here...
  const __meta__ = { validators, controllers, handlers};

  return { db : null , __meta__, ...__meta__ } as H & C
}