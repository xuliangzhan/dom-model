const isArray = Array.isArray

function isObject (obj) {
  return obj && typeof obj === 'object'
}

function isBoolean (obj) {
  return typeof obj === 'boolean'
}

function isString (obj) {
  return obj && typeof obj === 'string'
}

function isModelBinding (obj) {
  return obj && obj.constructor === ModelBinding
}

function arrayEach (list, callback) {
  for (var index = 0, len = list.length; index < len; index++) {
    callback(list[index], index, list)
  }
}

function removeElementChild (elem) {
  elem.parentNode.removeChild(elem)
}

function objectAssign (self) {
  arrayEach(arguments, (obj) => {
    objectEach(obj, (item, key) => {
      self[key] = item
    })
  })
  return self
}

function objectEach (obj, callback) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      callback(obj[key], key, obj)
    }
  }
}

// window.Proxy = null
// window.Reflect = null

const ProxyPolyfill = window.Proxy || function (obj, options) {
  let funs, rest
  let isArr = isArray(obj)
  if (isArr || isObject(obj)) {
    if (isArr) {
      funs = arrayEach
      rest = obj.slice(0)
    } else {
      funs = objectEach
      rest = objectAssign({}, obj)
    }
    funs(rest, (item, key) => defineProp(rest, key, obj, options.get, options.set))
  }
  return obj
}

function defineProp (rest, key, obj, get, set) {
  Object.defineProperty(obj, key, {
    get: () => get(rest, key, obj),
    set: value => set(rest, key, value, obj),
    writeable: true,
    configurable: true,
    enumerable: true
  })
}

const ReflectPolyfill = window.Reflect || {
  set (target, key, value) {
    let rest = dataProxy(value)
    target[key] = rest
    return rest
  }
}

class ModelBinding {
  constructor (obj, property) {
    this.model = obj
    this.property = property
  }
  get value () {
    return this.model[this.property]
  }
}

const proxyHandles = {
  get (target, key, receiver) {
    return target[key]
  },
  set (target, key, value, receiver) {
    let rest = ReflectPolyfill.set(target, key, dataProxy(value))
    dependence.update(target, key, value, receiver)
    return rest
  }
}

function dataProxy (obj) {
  if (isArray(obj)) {
    let rest = obj.map(item => dataProxy(item))
    return new ProxyPolyfill(rest, proxyHandles)
  } else if (isObject(obj)) {
    objectEach(obj, (item, key) => {
      obj[key] = dataProxy(item)
    })
    return new ProxyPolyfill(obj, proxyHandles)
  }
  return obj
}

function watchClassName (className, callback) {
  if (className) {
    if (isModelBinding(className)) {
      dependence.listener(className, callback)
    } else if (isArray(className)) {
      className.map(cls => watchClassName(cls, callback))
    } else {
      objectEach(className, val => {
        if (isModelBinding(val)) {
          dependence.listener(val, callback)
        }
      })
    }
  }
}

function parseClassName (className) {
  let rest = []
  if (className) {
    if (isModelBinding(className)) {
      return parseClassName(className.value)
    } else if (isString(className)) {
      return [className]
    } else if (isArray(className)) {
      return className.reduce((previous, cls) => previous.concat(parseClassName(cls)), rest)
    } else {
      objectEach(className, (active, cls) => {
        if (isModelBinding(active)) {
          if (active.value) {
            rest.push(cls)
          }
        } else if (active) {
          rest.push(cls)
        }
      })
    }
  }
  return rest
}

function watchStyle (style, callback) {
  if (style) {
    if (style.constructor === ModelBinding) {
      dependence.listener(style, callback)
    } else {
      objectEach(style, val => {
        if (val.constructor === ModelBinding) {
          dependence.listener(val, callback)
        }
      })
    }
  }
}

function parseStyle (style) {
  let rest = {}
  if (style) {
    if (style.constructor === ModelBinding) {
      objectAssign(rest, parseStyle(style.value))
    } else {
      objectEach(style, (rule, key) => {
        if (rule.constructor === ModelBinding) {
          rest[key] = rule.value
        } else {
          rest[key] = rule
        }
      })
    }
  }
  return rest
}

class VMNode {
  constructor (tagName, options = {}, children = [], context) {
    if (arguments.length < 3) {
      children = options
      options = {}
    }
    let _self = this
    let _elem = document.createElement(tagName)

    objectAssign(this, {
      $el: _elem, // 节点元素
      $context: context, // 上下文
      $options: options, // 节点参数
      $children: children // 占位元素
    })

    arrayEach(children, vm => {
      vm.$parent = _self
    })

    if (isModelBinding(options.visible)) {
      let callback = () => {
        if (this.visible) {
          this.toVisible()
        } else {
          this.toHidden()
        }
      }
      dependence.listener(options.visible, callback)
    }

    let className = options.class
    if (className) {
      let callback = () => {
        _elem.className = parseClassName(className).filter(cls => cls).join(' ')
      }
      if (isModelBinding(className)) {
        dependence.listener(className, callback)
      }
      callback()
      watchClassName(className, callback)
    }

    let style = options.style
    if (style) {
      let callback = () => {
        objectAssign(_elem.style, parseStyle(style))
      }
      if (isModelBinding(style)) {
        dependence.listener(style, callback)
      }
      callback()
      watchStyle(style, callback)
    }

    objectEach(options.domProps, function (property, domKey) {
      if (property) {
        if (isModelBinding(property)) {
          dependence.listener(property, () => {
            _elem[domKey] = property.value
          })
          _elem[domKey] = property.value
        } else {
          _elem[domKey] = property
        }
      }
    })

    objectEach(options.events, function (callback, name) {
      _elem.addEventListener(name, callback.bind(_self), false)
    })
  }
  get visible () {
    let visible = this.$options.visible
    return visible || isBoolean(visible) ? isModelBinding(visible) ? visible.value : visible : true
  }
  get isMount () {
    return this.$el && this.$el.parentNode
  }
  mount () {
    if (this.visible) {
      this.toVisible()
      arrayEach(this.$children, node => node.mount())
    } else {
      this.toHidden()
    }
  }
  toVisible () {
    let { $el, $place, $parent, isMount } = this
    let parentElem = $parent ? $parent.$el : null
    if (!isMount && parentElem) {
      if ($place) {
        parentElem.insertBefore($el, $place)
        removeElementChild($place)
      } else {
        parentElem.appendChild($el)
      }
    }
  }
  toHidden () {
    let { $el, $place, $parent, isMount } = this
    let parentElem = $parent ? $parent.$el : null
    if (parentElem) {
      if (!$place) {
        this.$place = $place = document.createComment('')
        if (!isMount) {
          parentElem.appendChild($place)
        }
      } else if (isMount) {
        parentElem.insertBefore($place, $el)
        removeElementChild($el)
      }
    }
  }
}

function createVMNode (tagName, options = {}, children = []) {
  if (arguments.length < 3) {
    children = options
    options = {}
  }
  return new VMNode(tagName, options, children, this)
}

/**
 * 依赖处理器
 */
const dependence = {
  map: new Map(),
  listener (binding, callback) {
    let { model, property } = binding
    let rests = dependence.map.get(model)
    if (rests) {
      let handles = rests.get(property)
      if (handles) {
        handles.push(callback)
      } else {
        rests.set(property, [callback])
      }
    } else {
      rests = new Map()
      rests.set(property, [callback])
      dependence.map.set(model, rests)
    }
  },
  update (target, key, value, receiver) {
    let rests = dependence.map.get(receiver)
    if (rests) {
      let handles = rests.get(key)
      if (handles) {
        arrayEach(handles, handle => handle())
      }
    }
  }
}

class XEModel {
  constructor (options) {
    let { el, data, render } = options
    let _self = dataProxy(objectAssign(this, data()))
    this.$node = render.call(_self, createVMNode.bind(_self))
    if (el) {
      this.mount(el)
    }
    return _self
  }
  mount (selector) {
    let elem = document.querySelector(selector)
    let node = this.$node
    this.$el = elem
    elem.appendChild(node.$el)
    node.mount()
  }
  $destroy () {

  }
  $ (model, property) {
    return new ModelBinding(model, property)
  }
}

export default XEModel
