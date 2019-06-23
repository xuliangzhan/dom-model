# 实现一个性能仅次于原生的数据驱动框架（仅供学习用）

* 简单实现
  * input 双向
  * textarea 双向
  * attribute 单向
  * class 单向
  * style 单向
  * event 单向

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
          sex: '男'
        },
        {
          name: 'test2',
          sex: '女'
        },
        {
          name: 'test3',
          sex: '男'
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
