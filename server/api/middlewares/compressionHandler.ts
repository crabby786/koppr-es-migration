import compression from 'compression';

const shouldCompress = (req: any, res: any) => {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }
  
  return compression.filter(req, res);
}

export default compression({ filter: shouldCompress });