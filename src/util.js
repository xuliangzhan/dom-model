const Util = {
  function isArray (list) {
    return list && Array.isArray(list)
  }
  
  function isObject (obj) {
    return obj && typeof obj === 'object'
  }
  
  function isBoolean (obj) {
    return typeof obj === 'boolean'
  }
  
  function isString (obj) {
    return obj && typeof obj === 'string'
  }
  
  function arrayEach (list, callback) {
    list.forEach(callback)
  }
  
  function objectEach (obj, callback) {
    obj && Object.keys(obj).forEach(key => callback(obj[key], key, obj))
  }
}

export default Util