function formatter(error: any): String {

    switch (true) {
  
      case error.name == 'CastError':
        return `Invalid ${error.path}: ${error.value}`;
  
      case error.name == 'AssertionError [ERR_ASSERTION]':
      case error.name == 'AssertionError':
        return error.toString().replace("AssertionError [ERR_ASSERTION]: ", "");
  
      case error.code == 11000:
        const value = error?.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/) ?
          error?.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0] :
          error?.errmsg.split("index:")[1]?.split("dup key")[0]?.split("_")[0]?.trim()
        return `Duplicate field value: ${value}. Please use another value!`;
  
      case error.name === 'ValidationError':
        const errors = Object.values(error?.errors).map((el: any) => el.message);
        return `Invalid input data. ${errors.join('. ')}`;
  
      case typeof error == 'string':
        return error;
  
      default:
        return "Something went wrong."
    }
  }
  
  export default formatter
  
  