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
        btnList: [
          {
            label: '按钮1'
          },
          {
            label: '按钮2'
          }
        ],
        list: [
          {
            name: 'test1',
            num: 1
          },
          {
            name: 'test2',
            num: 2
          }
        ]
      }
    },
    render: function (h) {
      let $ = this.$
      return h('div', [
        h('div', this.btnList.map(function (item) {
          return h('button', {
            domProps: {
              innerText: item.label
            },
            events: {
              click (evnt) {
                debugger
              }
            }
          })
        })),
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
              value: $(item, 'name')
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
