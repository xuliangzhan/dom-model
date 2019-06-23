(function () {
  window.a = new XEModel({
    el: '#app',
    data: function () {
      return {
        className: 'aa',
        isActive: true,
        display: 'block',
        show: true,
        info: {
          name: 'aaaa'
        },
        styles: {
          color: 'red'
        },
        list: [
          {
            age: 1
          }
        ]
      }
    },
    render: function (h) {
      let $ = this.$
      return h('div', [
        h('input', {
          visible: $(this, 'show'),
          class: ['hhh', $(this, 'className'), {
            active: $(this, 'isActive')
          }],
          style: {
            display: $(this, 'display')
          },
          domProps: {
            type: 'text',
            value: $(this.info, 'name')
          },
          events: {
            input: function (evnt) {
              this.name = evnt.target.value
            }
          }
        }, []),
        h('div', this.list.map(function (item) {
          return h('input', {
            domProps: {
              type: 'text',
              value: $(item, 'age')
            },
            events: {
              input: function (evnt) {
                item.age = evnt.target.value
              }
            }
          }, [])
        }))
      ])
    }
  })
})()
