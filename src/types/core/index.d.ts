declare type Db = import("mongodb").Db;
declare type MongoClient = import("mongodb").MongoClient;
declare type DOSpace = import("@lib/spaces.mjs").DOSpace;
declare type VersioningEnabledDOSpace = import("@lib/spaces.mjs").VersioningEnabledDOSpace;

declare type RESTHandlerConstructor = { new <V, H, C>(struct: RESTHandlerDescriptor<V, H, C>): V & H & C };
declare type WSHandlerConstructor = { new <V, H, C>(struct: WSHandlerDescriptor<V, H, C>): V & H & C };

type RESTHandlerDescriptor<V, H, C> = {
  meta?: SFRMetadata
  cfg?: SFRConfig
  validators: RequestValidators & V,
  handlers: RESTRequestHandlers & H & ThisType<HandlerFacilities & C>,
  controllers?: RequestControllers & C & ThisType<ControllerFacilities>
};

type WSHandlerDescriptor<V, H, C> = {
  validators: RequestValidators & V,
  handlers: WSRequestHandlers & H & ThisType<HandlerFacilities & C>,
  controllers?: RequestControllers & C & ThisType<ControllerFacilities>
}

//Dependency injection types for Request Handlers are declared here...
declare interface HandlerFacilities {
  postoffice: TransportDict,
  spaces: {
    "std": DOSpace,
    "std-v": VersioningEnabledDOSpace,
    "hris": DOSpace,
    "hris-v": VersioningEnabledDOSpace
  },
  gsuite: GSuiteMgr
}

//Dependency injection types for Request Controllers are declared here...
declare interface ControllerFacilities {
  db: Db,
  instance: MongoClient,
}

/**
 * Main Configuration object used by the bundler to apply for a given API Declaration
 * 
 * 
 */
declare type SFRConfig = {
  /** 
   * Configuration used to explicitly set the API Declaration's root directory upon binding.

   * **Example**
   * ```
   * //The given REST Declaration will be bound to
   * //"/space/*" instead of /*
   * 
   * REST({
   *  cfg : {
   *    base_dir : "space"
   *  },
   *  
   *  validators : {
   *  },
   * 
   *  handlers : {
   *  }
   * })
   * ```
   */
  base_dir?: string;

  /**
   * Directive used to evaluate an API Declaration's public accessibility.
   * 
   * setting this to **true (false by default)** will cause the heading middleware to skip certain checks, namely the ff.
   * 
   * * Session Validity
   * * Access Authorization
   */
  public?: boolean;

  /**
   * Denotes the specific domain to which this SFR belongs to.
   * 
   * This configuration data is used mainly by GrantAuthority.
   * 
   * **SFRs belonging to a domain will have their resources available
   * for that domain only**
   * 
   * defaults to the internal domain
   */
  domain?: string;

  /**
   * Specifies which service this SFR belongs to,
   * 
   * Services are simply a bunch of SFRs grouped together under one server instance.
   * This categorization is necessary and is a temporary measure, It will be deprecated right after we move to containerized microservices.
  */
  service?: string;
}

//Bundler Related

declare type Request = import("express").Request;
declare type Response = import("express").Response;
declare type NextFunction = import("express").NextFunction;
declare type RequestHandler = import("express").RequestHandler;

declare type Server = import("socket.io").Server;
declare type Socket = import("socket.io").Socket;
declare type Db = import("mongodb").Db;

declare type RequestValidators = { [name: string]: (object | function) };
declare type RequestControllers = { [name: string]: RequestController };
declare type RequestController = (...args) => Promise;

//REST Bundler
declare type RESTRequestHandlers = {
  GET?: RESTHandlerMap,
  POST?: RESTHandlerMap,
  PUT?: RESTHandlerMap,
  PATCH?: RESTHandlerMap,
  DELETE?: RESTHandlerMap,
  COPY?: RESTHandlerMap,
  HEAD?: RESTHandlerMap,
  OPTIONS?: RESTHandlerMap,
  PROPFIND?: RESTHandlerMap
};

type PathDeclaration = {
  GET?: SFRMetadata,
  POST?: SFRMetadata,
  PUT?: SFRMetadata,
  PATCH?: SFRMetadata,
  DELETE?: SFRMetadata,
  COPY?: SFRMetadata,
  HEAD?: SFRMetadata,
  OPTIONS?: SFRMetadata,
  PROPFIND?: SFRMetadata
}

/**
  * Mapping of endpoints and their respective metadata according to OpenAPI standards 
  *  
  * Note: Some fields are automatically inferred from the SFR build phase and as such, only a subset of the official parameters are exposed.
  * 
  * Link: https://spec.openapis.org/oas/v3.1.0#operation-object
*/
declare type SFRMetadata = {
  [handler: string]: {
    tags?: string[],
    summary?: string,
    description?: string,
    deprecated?: boolean,
  }
}

declare type RESTRequestType = ("get" | "post" | "put" | "patch" | "delete" | "copy" | "head" | "options" | "propfind");


declare type RESTHandlerMap = { [key: string]: RequestHandler };


//WS Bundler
declare type WSRequestHandler = (ctx: WSRequestCtx, args?: object) => Promise<object>;
declare type WSRequestHandlers = { [event: string]: WSRequestHandler };
declare type WSRequestCtx = { io: Server, socket: Socket, args: string[] };
declare type RequestResponse = ({ error: object } | { data: object })

declare type RESTNamespaceDeclaration = {
  [namespace: string]: {
    __meta__: {
      cfg: SFRConfig,
      validators: RequestValidators,
      handlers: RESTRequestHandlers,
      controllers: RequestControllers
    }
  }
}
declare type WSNamespaceDeclaration = {
  [namespace: string]: {
    __meta__: {
      cfg: SFRConfig,
      validators: RequestValidators,
      handlers: WSRequestHandlers,
      controllers: RequestControllers
    }
  }
}

declare type Operation = ("Read" | "Write");
declare type Protocol = ("REST" | "WS");

declare type LogFragment = {
  domain: string;
  user_id: string;
  stamp: number;
  host: string;
  type: ("in" | "out" | "req");
}