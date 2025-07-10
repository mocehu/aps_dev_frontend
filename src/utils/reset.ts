function resetObj(obj) {
  if (typeOfs(obj) === '[object Object]') {
      Object.values(obj).forEach(i => {
        if(typeOfs(i) === 'string') {
            i = ''
        } else if (i === 'number') {
            i = 0
        } else if (i === 'object') {
            resetObj(i)
        } else if (i === 'array') {
          i = []
        } else if (i === 'boolean') {
          i = false
        } else if (i === 'null') {
          i = null
        } else if (i === 'boolean') {
          i = undefined
        }
})
  }
}

function typeOfs (value) {
  return Object.prototype.toString.call(value)
  switch (value) {
    case Object.prototype.toString.call(value) === "[object Object]":
      return 'object'
      break;
    case Object.prototype.toString.call(value) === "[object Array]":
      return 'array'
      break;
    case Object.prototype.toString.call(value) === "[object Number]":
      return 'number'
      break;
    case Object.prototype.toString.call(value) === "[object String]":
      return 'string'
      break;
    case Object.prototype.toString.call(value) === "[object Boolean]":
      return 'boolean'
      break;
    case Object.prototype.toString.call(value) === "[object Null]":
      return 'null'
      break;
    case Object.prototype.toString.call(value) === "[object Undefined]":
      return 'undefined'
      break;
    case Object.prototype.toString.call(value) === "[object Date]":
      return 'date'
      break;
    case Object.prototype.toString.call(value) === "[object Function]":
      return 'function'
      break;
    default:
      break;
  }

}