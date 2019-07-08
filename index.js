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

function isFunction (obj) {
  return obj && typeof obj === 'function'
}

function isModelBinding (obj) {
  return obj && obj.constructor === ModelBinding
}

function isProxy (obj) {
  return obj && obj.$depMap
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

function objectEach (obj, callback, context) {
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

function hasBindingProp (key) {
  if (key && key.charAt) {
    let prefix = key.charAt(0)
    return !(prefix === '$' || prefix === '_')
  }
  return 1
}

function defineProp (rest, key, obj, get, set) {
  if (hasBindingProp(key)) {
    Object.defineProperty(obj, key, {
      get: () => get(rest, key, obj),
      set: value => set(rest, key, value, obj),
      writeable: true,
      configurable: true,
      enumerable: true
    })
  }
}

const ReflectPolyfill = window.Reflect || {
  set (target, key, value) {
    target[key] = value
    return value
  }
}

class ModelBinding {
  /**
   * 数据绑定对象
   * @param {Proxy} proxy 代理对象
   * @param {String} property 代理属性
   */
  constructor (proxy, property) {
    this.model = proxy
    this.property = property
    this.$depMap = proxy.$depMap
  }
  get value () {
    return this.model[this.property]
  }
}

const proxyHandles = {
  /**
   * 初始化代理数据
   * @param {Map} $depMap 当前实例的依赖对象集合
   * @param {Any} obj 代理对象
   */
  proxy ($depMap, obj) {
    if (obj && !isProxy(obj) && isObject(obj) && !Object.isFrozen(obj)) {
      if (isArray(obj)) {
        let rest = obj.map(item => proxyHandles.proxy($depMap, item))
        rest.$depMap = $depMap
        return rest
      } else if (isObject(obj)) {
        objectEach(obj, (item, key) => {
          if (hasBindingProp(key)) {
            obj[key] = proxyHandles.proxy($depMap, item)
          }
        })
        obj.$depMap = $depMap
        return new ProxyPolyfill(obj, proxyHandles.options)
      }
    }
    return obj
  },
  /**
   * 代理的处理参数
   */
  options: {
    get (target, key, receiver) {
      DepHandle.collect(key, receiver)
      return target[key]
    },
    set (target, key, value, receiver) {
      let rest = ReflectPolyfill.set(target, key, proxyHandles.proxy(receiver.$depMap, value))
      DepHandle.collect(key, receiver)
      DepHandle.update(target, key, value, receiver)
      return rest
    }
  }
}

function watchClassName (className, callback) {
  if (className) {
    if (isModelBinding(className)) {
      DepHandle.listener(className, callback)
    } else if (isArray(className)) {
      className.map(cls => watchClassName(cls, callback))
    } else {
      objectEach(className, val => {
        if (isModelBinding(val)) {
          DepHandle.listener(val, callback)
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
    if (isModelBinding(style)) {
      DepHandle.listener(style, callback)
    } else {
      objectEach(style, val => {
        if (isModelBinding(val)) {
          DepHandle.listener(val, callback)
        }
      })
    }
  }
}

function parseStyle (style) {
  let rest = {}
  if (style) {
    if (isModelBinding(style)) {
      objectAssign(rest, parseStyle(style.value))
    } else {
      objectEach(style, (rule, key) => {
        if (isModelBinding(rule)) {
          rest[key] = rule.value
        } else {
          rest[key] = rule
        }
      })
    }
  }
  return rest
}

const nodeHandle = {
  /**
   * 初始化虚拟节点
   * @param {VMNode} vm 虚拟节点对象
   */
  init (vm) {
    let { _el, _options, _tagName, _context } = vm
    if (_tagName === '#text') {
      let data = _options
      let callback = () => {
        _el.data = data.value
      }
      if (isModelBinding(data)) {
        DepHandle.listener(data, callback)
        _el = document.createTextNode(data.value)
      } else {
        _el = document.createTextNode(data)
      }
      vm._el = _el
    } else {
      if (!_el) {
        vm._el = _el = document.createElement(_tagName)
      }
      let visible = _options.visible
      let callback = () => {
        if (vm.isVisible) {
          vm.toVisible()
        } else {
          vm.toHidden()
        }
      }
      if (isFunction(visible)) {
        DepHandle.analyze(() => {
          visible = visible.call(_context)
        }, callback)
      }
      if (isModelBinding(visible)) {
        DepHandle.listener(visible, callback)
      }

      let className = _options.class
      if (className) {
        let callback = () => {
          _el.className = parseClassName(className).filter(cls => cls).join(' ')
        }
        if (isModelBinding(className)) {
          DepHandle.listener(className, callback)
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
          DepHandle.listener(style, callback)
        }
        callback()
        watchStyle(style, callback)
      }

      objectEach(_options.domProps, (property, domKey) => {
        let callback = () => {
          _el[domKey] = property.value
        }
        if (property) {
          if (isModelBinding(property)) {
            DepHandle.listener(property, callback)
            _el[domKey] = property.value
          } else {
            _el[domKey] = property
          }
        }
      })

      objectEach(_options.events, function (callback, name, obj) {
        obj[name] = evnt => callback.call(vm._context, evnt)
        _el.addEventListener(name, obj[name], false)
      })
    }
  },
  /**
   * 销毁虚拟节点
   * @param {VMNode} vm 虚拟节点对象
   */
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
  /**
   * 虚拟节点对象
   * @param {String} tagName 节点名
   * @param {Object} options 节点参数
   * @param {Array} children 子节点
   */
  constructor (tagName, options, children) {
    if (options) {
      let isArr = isArray(options)
      let isText = tagName === '#text'
      let isBinding = isModelBinding(options)
      if (!isArr && !isBinding && isObject(options)) {
        options = objectAssign({}, options)
      } else if (!isText) {
        if (isArr) {
          children = options
        } else if (options) {
          children = [
            new VMNode('#text', options)
          ]
        }
        options = {}
      }
    }
    if (!children) {
      children = []
    } else if (isModelBinding(children)) {
      children = [
        new VMNode('#text', children)
      ]
    }
    objectAssign(this, {
      _el: null,
      _parent: null,
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
  /**
   * 判断节点是否需要显示
   */
  get isVisible () {
    let { _context, _options } = this
    let { visible } = _options
    if (isFunction(visible)) {
      visible = visible.call(_context)
    }
    if (visible || isBoolean(visible)) {
      return isModelBinding(visible) ? visible.value : visible
    }
    return true
  }
  /**
   * 判断是否已经挂载在父节点
   */
  get isMount () {
    return this._el && this._el.parentNode
  }
  /**
   * 挂载节点
   * @param {DomModel} context 当前上下文实例对象
   */
  mount (context) {
    this._context = context
    let { isVisible, _children } = this
    nodeHandle.init(this)
    if (isVisible) {
      this.toVisible()
      arrayEach(_children, node => node.mount(context))
    } else {
      this.toHidden()
    }
  }
  /**
   * 卸载节点
   */
  unmount () {
    let { _children } = this
    _children.forEach(vm => vm.unmount())
    nodeHandle.destroy(this)
    _children.length = 0
  }
  /**
   * 显示节点，挂载在父节点中
   */
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
  /**
   * 隐藏节点，从父节点中移除
   */
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

const DepHandle = {
  gather: false,
  depMap: new Map(),
  /**
   * 依赖分析
   * @param {Function} callback 待分析的运行函数
   * @param {Function} handle 依赖处理函数
   */
  analyze (callback, handle) {
    let { depMap } = DepHandle
    DepHandle.gather = true
    depMap.clear()
    callback()
    depMap.forEach((binding, key) => DepHandle.listener(new ModelBinding(binding, key), handle))
    DepHandle.gather = false
  },
  /**
   * 依赖收集
   * @param {String} key 依赖属性
   * @param {Proxy} receiver 代理对象
   */
  collect (key, receiver) {
    let { gather, depMap } = DepHandle
    if (gather) {
      depMap.set(key, receiver)
    }
  },
  /**
   * 依赖监听
   * @param {ModelBinding} binding 数据绑定对象
   * @param {Function} callback 触发回调
   */
  listener (binding, callback) {
    let { model, property, $depMap } = binding
    if ($depMap) {
      let rests = $depMap.get(model)
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
        $depMap.set(model, rests)
      }
    }
  },
  /**
   * 更新视图
   * @param {Any} target 数据源
   * @param {String} key 代理属性
   * @param {Any} value 代理值
   * @param {Proxy} receiver 代理对象
   */
  update (target, key, value, receiver) {
    let $depMap = receiver.$depMap
    if ($depMap) {
      let rests = $depMap.get(receiver)
      if (rests) {
        let handles = rests.get(key)
        if (handles) {
          arrayEach(handles, handle => handle())
        }
      }
    }
  }
}

class DomModel {
  /**
   * 数据驱动对象
   * @param {Object} options 参数
   */
  constructor (options) {
    let { el, data, created, render } = options
    let depMap = new Map()
    let $proxy = proxyHandles.proxy(depMap, objectAssign(this, data()))
    objectAssign(this, {
      $h: createVMNode,
      $options: options,
      $active: true
    })
    if (created) {
      created.call($proxy)
    }
    if (!render) {
      throw new Error('The render not exist!')
    }
    this.$proxy = $proxy
    this.$node = render.call($proxy, createVMNode)
    if (el) {
      $proxy.$mount(el)
    }
    return $proxy
  }
  /**
   * 挂载实例
   * @param {String} selector 选择器
   */
  $mount (selector) {
    let { $proxy, $options, $node } = this
    let { mounted } = $options
    let container = document.querySelector(selector)
    let _el = document.createElement($node._tagName)
    container.appendChild(_el)
    $node._el = _el
    $node.mount($proxy)
    this.$el = _el
    if (mounted) {
      mounted.call($proxy)
    }
  }
  /**
   * 销毁实例
   */
  $destroy () {
    let { $proxy, $options, $node, $depMap } = this
    let { beforeDestroy, destroy } = $options
    if (beforeDestroy) {
      beforeDestroy.call($proxy)
    }
    $node.unmount()
    this.$active = false
    if (destroy) {
      destroy.call($proxy)
    }
    $depMap.clear()
    Object.keys($proxy).forEach(key => {
      delete $proxy[key]
    })
  }
  /**
   * 创建数据绑定对象
   * @param {Proxy} $proxy 代理对象
   * @param {String} property 代理属性
   */
  $ ($proxy, property) {
    return new ModelBinding($proxy, property)
  }
}

export default DomModel
