# 实现一个性能仅次于原生的数据驱动框架（用于学习）

* 简单实现
  * input 双向
  * textarea 双向
  * attribute 单向
  * class 单向
  * style 单向

```javascript
export default {
  data () {
    return {
      name: '',
      className: 'cls2',
      isActive: false
    }
  }.
  render (h) {
    let $ = this.$
    return h('div', {
      class: ['my-demo', $(this, 'className'), {
        active: $(this, 'isActive')
      }]
    }, [
      h('input', {
        domProps: {
          type: 'text',
          value: $(this, 'name')
        }
      })
    ])
  }
}
```
