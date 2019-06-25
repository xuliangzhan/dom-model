# 一个轻量级的 MVVM 数据驱动（用于学习）

保持与 Vue 的相似的 api 方式

* 简单实现了
  * appendChild、removeChild
  * attribute
  * class
  * style
  * event

```javascript
export default {
  data () {
    return {
      name: '',
      className: 'cls2',
      isActive: false,
      list: [
        {
          name: 'test1',
          sex: '1'
        },
        {
          name: 'test2',
          sex: '0'
        },
        {
          name: 'test3',
          sex: '1'
        }
      ]
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
      }),
      h('ul', this.list.map(item => {
        return h('li', $(item, 'label'))
      }))
    ])
  }
}
```
