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

function arrayEach (list, callback, context, startIndex) {
  for (var index = startIndex || 0, len = list.length; index < len; index++) {
    callback(list[index], index, list)
  }
}

function removeElementChild (elem) {
  elem.parentNode.removeChild(elem)
}

const objectAssign = Object.assign || function (origin) {
  arrayEach(arguments, (obj) => {
    objectEach(obj, (item, key) => {
      origin[key] = item
    })
  }, null, 1)
  return origin
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

const vmHandle = {
  init (vm) {
    let { _el, _options, _tagName } = vm
    if (!_el) {
      vm._el = _el = document.createElement(_tagName)
    }
    if (isModelBinding(_options.visible)) {
      let callback = () => {
        if (vm.visible) {
          vm.toVisible()
        } else {
          vm.toHidden()
        }
      }
      dependence.listener(_options.visible, callback)
    }

    let className = _options.class
    if (className) {
      let callback = () => {
        _el.className = parseClassName(className).filter(cls => cls).join(' ')
      }
      if (isModelBinding(className)) {
        dependence.listener(className, callback)
      }
      callback()
      watchClassName(className, callback)
    }

    let style = _options.style
    if (style) {
      let callback = () => {
        objectAssign(_el.style, parseStyle(style))
      }
      if (isModelBinding(style)) {
        dependence.listener(style, callback)
      }
      callback()
      watchStyle(style, callback)
    }

    objectEach(_options.domProps, (property, domKey) => {
      if (property) {
        if (isModelBinding(property)) {
          dependence.listener(property, () => {
            _el[domKey] = property.value
          })
          _el[domKey] = property.value
        } else {
          _el[domKey] = property
        }
      }
    })

    objectEach(_options.events, function (callback, name, obj) {
      obj[name] = () => callback.apply(vm._context, arguments)
      _el.addEventListener(name, obj[name], false)
    })
  },
  destroy (vm) {
    let { _el, _place, _options } = vm
    objectEach(_options.events, (callback, name) => {
      _el.removeEventListener(name, callback)
    })
    if (_el && _el.parentNode) {
      _el.parentNode.removeChild(_el)
    } else if (_place && _place.parentNode) {
      _place.parentNode.removeChild(_place)
    }
  }
}

class VMNode {
  constructor (tagName, options, children = []) {
    if (isArray(options)) {
      children = options
      options = {}
    } else {
      options = objectAssign({}, options)
    }

    objectAssign(this, {
      _el: null,
      _tagName: tagName,
      _options: options,
      _children: children,
      _place: null,
      _context: null
    })

    arrayEach(children, vm => {
      vm._parent = this
    })
  }
  get visible () {
    let { visible } = this._options
    return visible || isBoolean(visible) ? isModelBinding(visible) ? visible.value : visible : true
  }
  get isMount () {
    return this._el && this._el.parentNode
  }
  mount (context) {
    let { visible, _children } = this
    this._context = context
    if (visible) {
      vmHandle.init(this)
      this.toVisible()
      arrayEach(_children, node => node.mount(context))
    } else {
      this.toHidden()
    }
  }
  unmount () {
    let { _children } = this
    _children.forEach(vm => vm.unmount())
    vmHandle.destroy(this)
    _children.length = 0
  }
  toVisible () {
    let { _el, _place, _parent, isMount } = this
    let parentElem = _parent ? _parent._el : null
    if (!isMount && parentElem) {
      if (_place) {
        parentElem.insertBefore(_el, _place)
        removeElementChild(_place)
      } else {
        parentElem.appendChild(_el)
      }
    }
  }
  toHidden () {
    let { _el, _place, _parent, isMount } = this
    let parentElem = _parent ? _parent._el : null
    if (parentElem) {
      if (!_place) {
        this._place = _place = document.createComment('')
      }
      if (isMount) {
        parentElem.insertBefore(_place, _el)
        removeElementChild(_el)
      } else {
        parentElem.appendChild(_place)
      }
    }
  }
}

function createVMNode (tagName, options, children) {
  return new VMNode(tagName, options, children)
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
    let { el, data, created, render } = options
    let _self = dataProxy(objectAssign(this, data()))
    objectAssign(_self, {
      $h: createVMNode,
      $options: options,
      $active: true
    })
    if (created) {
      created.call(_self)
    }
    if (!render) {
      throw new Error('The render not exist!')
    }
    this.$node = render.call(_self, createVMNode)
    if (!el) {
      throw new Error('The el not exist!')
    }
    this.$mount(el)
    return _self
  }
  $mount (selector) {
    let { $options, $node } = this
    let { mounted } = $options
    let container = document.querySelector(selector)
    let _el = document.createElement($node._tagName)
    container.appendChild(_el)
    $node._el = _el
    $node.mount(this)
    this.$el = _el
    if (mounted) {
      mounted.call(this)
    }
  }
  $destroy () {
    let { $options } = this
    let { beforeDestroy, destroy } = $options
    if (beforeDestroy) {
      beforeDestroy.call(this)
    }
    this.$node.unmount()
    this.$active = false
    if (destroy) {
      destroy.call(this)
    }
    Object.keys(this).forEach(key => {
      delete this[key]
    })
  }
  $ (model, property) {
    return new ModelBinding(model, property)
  }
}

export default XEModel
