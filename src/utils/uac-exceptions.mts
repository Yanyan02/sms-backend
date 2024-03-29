export default class UACException extends Error {
  constructor(code : UACExceptionCode, val? : any){
    const name = code || "Unknown Error";
    super(name);
    this.name = "UAC Exception";
    this.message = `${name}${val ? ` ${val}` : ""}`;
  }
  //Will be expanded to contain vital error information, those will be inserted within stacktrace to provide diagnostics for any inspector/s (i.e: me, myself, and I)
  //For now, its a dumb custom error.
}